
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { getActiveDynamicTutorSession, setActiveDynamicTutorSession, type ActiveDynamicTutorSessionData, type TeachingSceneSchema, type QuizSchema, type FeedbackSchema } from '@/lib/session-store';
import { getNextDynamicTutorResponse, type GetNextDynamicTutorResponseInput } from '@/app/actions'; 
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Sparkles, Loader2, ArrowLeft, Home, Volume2, VolumeX, HelpCircle, CheckCircle, XCircle, Brain, Send, MessageSquare } from 'lucide-react';
import { TutorSceneDisplay, type TutorSceneData } from '@/components/tutor-scene-display';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/knowledge-base-store';
import { motion } from 'framer-motion';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('isLoggedIn')) {
        router.push('/login');
      } else {
        setIsVerified(true);
      }
    }
  }, [router]);
  
  if (!isVerified) return null;
  return <>{children}</>;
};

const themeToColorClasses = (themeHint?: string): { bgColorClass: string; textColorClass: string } => {
  switch (themeHint) {
    case "science": return { bgColorClass: "bg-blue-600", textColorClass: "text-blue-100" };
    case "technology": return { bgColorClass: "bg-indigo-600", textColorClass: "text-indigo-100" };
    case "history": return { bgColorClass: "bg-amber-600", textColorClass: "text-amber-100" };
    case "arts": return { bgColorClass: "bg-pink-600", textColorClass: "text-pink-100" };
    case "mathematics": return { bgColorClass: "bg-green-600", textColorClass: "text-green-100" };
    case "language": return { bgColorClass: "bg-purple-600", textColorClass: "text-purple-100" };
    case "general":
    default: return { bgColorClass: "bg-slate-700", textColorClass: "text-slate-100" };
  }
};

const ConfettiPiece = ({ x, y, rotate, color } : {x: number, y:number, rotate: number, color: string}) => (
  <motion.div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: '8px',
      height: '16px',
      backgroundColor: color,
      rotate: `${rotate}deg`,
    }}
    initial={{ opacity: 1, y: 0, scale: 1 }}
    animate={{ opacity: 0, y: 100 + Math.random() * 100, scale: 0.5, transition: { duration: 1.5 + Math.random() * 1, ease: "easeOut" } }}
  />
);

const ConfettiAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const colors = ["#FFC700", "#FF3D7A", "#00C2FF", "#00E5A1", "#FF8A00"];
  const pieces = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20, // Start above the screen
    rotate: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  useEffect(() => {
    const timer = setTimeout(onComplete, 3000); // Duration of confetti
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
    </div>
  );
};


export default function DynamicInteractiveTutorSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveDynamicTutorSessionData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [currentQuizSelection, setCurrentQuizSelection] = useState<string | null>(null); 
  const [displayScene, setDisplayScene] = useState<TutorSceneData | null>(null);
  const initialLoadAttemptedRef = useRef(false);

  const [isPresentationPaused, setIsPresentationPaused] = useState(false);
  const [userQueryInputValue, setUserQueryInputValue] = useState("");
  const [currentAiQueryResponse, setCurrentAiQueryResponse] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastTeachingSceneBeforeQuery, setLastTeachingSceneBeforeQuery] = useState<TeachingSceneSchema | null>(null);
  const tutorSceneDisplayKeyRef = useRef(Date.now()); // For forcing re-render of TutorSceneDisplay

  useEffect(() => {
    const data = getActiveDynamicTutorSession();
    if (data) {
      setSessionData(data);
      if(data.currentTeachingScene) {
        const colors = themeToColorClasses(data.currentTeachingScene.colorThemeHint);
        setDisplayScene({
            id: data.id + (data.currentTeachingScene.title || 'scene') + Date.now(), 
            title: data.currentTeachingScene.title,
            description: data.currentTeachingScene.description,
            iconName: data.currentTeachingScene.iconName,
            bgColorClass: colors.bgColorClass,
            textColorClass: colors.textColorClass,
        });
      } else if (!initialLoadAttemptedRef.current) {
          initialLoadAttemptedRef.current = true;
          handleAiInteraction("teach");
      }
    } else {
      toast({ title: "Session Error", description: "No active tutoring session found. Please start a new session.", variant: "destructive" });
      router.push('/interactive-tutor/select');
    }
    setIsLoadingPage(false);
  }, []);


  const updateSessionState = (newPartialData: Partial<ActiveDynamicTutorSessionData>, newSceneData?: TeachingSceneSchema | null) => {
    setSessionData(prevData => {
      if (!prevData && !newPartialData.id) { // Ensure id is set on initial load
         const initialId = generateId();
         prevData = {
            id: `dyn_${initialId}`,
            kbItemId: "", documentName: "", documentContent: "",
            currentTeachingScene: null, currentQuizData: null, quizFeedback: null,
            currentMode: "loading_teach", isTtsMuted: false, cumulativeLearningContext: "Start of session",
         };
      }

      const sceneToUpdateWith = newSceneData !== undefined ? newSceneData : newPartialData.currentTeachingScene;
      
      const updatedData = { ...(prevData as ActiveDynamicTutorSessionData), ...newPartialData };
      setActiveDynamicTutorSession(updatedData);

      if (sceneToUpdateWith) {
        const scene = sceneToUpdateWith;
        const colors = themeToColorClasses(scene.colorThemeHint);
        tutorSceneDisplayKeyRef.current = Date.now(); // Force re-key for TutorSceneDisplay
        setDisplayScene({
            id: updatedData.id + (scene.title || 'scene') + Date.now(),
            title: scene.title,
            description: scene.description,
            iconName: scene.iconName,
            bgColorClass: colors.bgColorClass,
            textColorClass: colors.textColorClass,
        });
      } else if (newPartialData.hasOwnProperty('currentTeachingScene') && newPartialData.currentTeachingScene === null) {
         setDisplayScene(null); 
      }
      return updatedData;
    });
  };

  const handleAiInteraction = useCallback(async (
        mode: "teach" | "generate_quiz" | "evaluate_answer" | "answer_query", 
        userQueryOrAnswerText?: string
    ) => {
    if (!sessionData && mode !== "teach") { // Allow initial teach call even if sessionData is brief
         console.warn("handleAiInteraction called without sessionData for mode:", mode);
         return;
    }

    let loadingMode: ActiveDynamicTutorSessionData['currentMode'] = "loading_teach";
    if (mode === "generate_quiz") loadingMode = "loading_quiz";
    else if (mode === "evaluate_answer") loadingMode = "loading_feedback";
    else if (mode === "answer_query") loadingMode = "loading_query_answer"; // New loading state
    
    // Preserve current scene if answering query, otherwise clear for quiz/feedback
    const sceneToKeep = (mode === "answer_query" || mode === "loading_query_answer") ? sessionData?.currentTeachingScene : null;

    updateSessionState({ currentMode: loadingMode, quizFeedback: null, currentQuizData: mode === "generate_quiz" ? sessionData?.currentQuizData : null, currentTeachingScene: sceneToKeep });
    setCurrentQuizSelection(null);
    setCurrentAiQueryResponse(null); // Clear previous query response

    const inputForAi: GetNextDynamicTutorResponseInput = {
        currentSessionData: sessionData || { // Provide a minimal valid session if it's null (e.g. initial call)
            id: `dyn_init_${generateId()}`, kbItemId: "", documentName: "Starting Session", documentContent: "",
            currentTeachingScene: null, currentQuizData: null, quizFeedback: null,
            currentMode: "loading_teach", isTtsMuted: false, cumulativeLearningContext: "Start of session",
        },
        interactionMode: mode,
        userQueryOrAnswer: userQueryOrAnswerText,
    };
    
    const response = await getNextDynamicTutorResponse(inputForAi);

    if ('error' in response) {
      toast({ title: "Tutor Error", description: response.error, variant: "destructive" });
      updateSessionState({ currentMode: sessionData?.currentTeachingScene ? "teaching" : "finished" });
    } else {
      if (response.mode === "teach" && response.teachingScene) {
        updateSessionState({
          currentTeachingScene: response.teachingScene,
          currentMode: "teaching",
          cumulativeLearningContext: (sessionData?.cumulativeLearningContext || "") + "\nTopic: " + response.teachingScene.title + ". Content: " + response.teachingScene.description.substring(0,100) + "...",
          currentQuizData: null, 
          quizFeedback: null,    
        });
      } else if (response.mode === "quiz" && response.quiz) {
        updateSessionState({ currentQuizData: response.quiz, currentMode: "quizzing", quizFeedback: null, currentTeachingScene: null }); // Clear scene for quiz
      } else if (response.mode === "feedback" && response.feedback) {
        updateSessionState({ quizFeedback: response.feedback, currentMode: "feedback", currentQuizData: null, currentTeachingScene: sessionData?.currentTeachingScene || null });
        if (response.feedback.isCorrect) {
            setShowConfetti(true);
        }
      } else if (response.mode === "answer_query" && response.aiQueryResponseText) {
          setCurrentAiQueryResponse(response.aiQueryResponseText);
          updateSessionState({ currentMode: "answered_query", currentTeachingScene: lastTeachingSceneBeforeQuery }); // Restore scene view
      }
       else {
         toast({ title: "Tutor Error", description: "Received an unexpected response from the tutor.", variant: "destructive" });
         updateSessionState({ currentMode: "teaching"}); // Default back to teaching if unexpected
      }
    }
  }, [sessionData, toast, lastTeachingSceneBeforeQuery]);

  const handleAskQuestion = () => {
    if (!userQueryInputValue.trim() || !sessionData) return;
    setIsPresentationPaused(true);
    setLastTeachingSceneBeforeQuery(sessionData.currentTeachingScene); // Save current scene
    handleAiInteraction("answer_query", userQueryInputValue);
    setUserQueryInputValue("");
  };

  const handleResumePresentation = () => {
    setCurrentAiQueryResponse(null); // Clear AI's answer
    setIsPresentationPaused(false);
    // The TutorSceneDisplay should ideally resume from its last segment using its internal state or a prop
    // For now, re-triggering the current scene for display
    if (lastTeachingSceneBeforeQuery) {
        updateSessionState({ currentMode: "teaching", currentTeachingScene: lastTeachingSceneBeforeQuery});
    } else if (sessionData?.currentTeachingScene) {
        updateSessionState({ currentMode: "teaching", currentTeachingScene: sessionData.currentTeachingScene});
    } else { // If no scene to resume, fetch a new one
        handleAiInteraction("teach");
    }
    setLastTeachingSceneBeforeQuery(null);
  };
  

  const handleQuizMe = () => {
    if (sessionData && sessionData.currentTeachingScene) {
      setIsPresentationPaused(true); // Pause scene if QuizMe is hit
      handleAiInteraction("generate_quiz");
    }
  };

  const handleQuizSubmit = () => {
    if (currentQuizSelection === null || !sessionData || !sessionData.currentQuizData) return;
    const selectedOptionText = sessionData.currentQuizData.options[parseInt(currentQuizSelection, 10)];
    handleAiInteraction("evaluate_answer", selectedOptionText);
  };

  const handleContinueLearning = () => {
    setIsPresentationPaused(false); // Unpause before continuing
    setCurrentAiQueryResponse(null); // Clear any query answer
    if (sessionData?.currentTeachingScene?.isLastTeachingStep && sessionData.currentMode !== "quizzing") {
        updateSessionState({ currentMode: "finished" });
        toast({ title: "Topic Complete!", description: `You've finished learning about ${sessionData.documentName}.`, duration: 5000});
    } else {
        handleAiInteraction("teach");
    }
  };

  const toggleMute = () => {
    if (!sessionData) return;
    const newMuteState = !sessionData.isTtsMuted;
    updateSessionState({ isTtsMuted: newMuteState });
    toast({ title: newMuteState ? "TTS Muted" : "TTS Unmuted" });
  };

  const handleEndSession = () => {
    setActiveDynamicTutorSession(null);
    router.push('/interactive-tutor/select');
  };

  if (isLoadingPage || (!sessionData && !initialLoadAttemptedRef.current)) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </ClientAuthGuard>
    );
  }
  
  const { currentMode, currentTeachingScene, currentQuizData, quizFeedback, isTtsMuted, documentName } = sessionData || {};
  const isLoadingAi = currentMode?.startsWith("loading_");

  return (
    <ClientAuthGuard>
      {showConfetti && <ConfettiAnimation onComplete={() => setShowConfetti(false)} />}
      <div className="container mx-auto py-4 flex flex-col h-[calc(100vh-6rem)] space-y-4">
        <Card className="w-full max-w-4xl mx-auto shadow-xl flex-shrink-0">
          <CardHeader className="text-center pb-4 pt-5">
            <Sparkles className="mx-auto h-10 w-10 text-primary mb-1" />
            <CardTitle className="text-2xl md:text-3xl font-headline">Interactive Tutor</CardTitle>
            {documentName && <CardDescription className="text-sm md:text-base">Topic: {documentName}</CardDescription>}
          </CardHeader>
        </Card>

        <div className="flex-grow w-full max-w-4xl mx-auto flex flex-col min-h-0 overflow-y-auto space-y-4 rounded-lg p-2 bg-muted/20 shadow-inner">
            <div className="w-full flex-shrink-0 min-h-[50vh] md:min-h-[60vh] relative">
                 {(currentMode === "teaching" || currentMode === "answered_query" || currentMode === "feedback" || currentMode === "loading_teach") && displayScene ? (
                    <TutorSceneDisplay 
                        scene={displayScene} 
                        isTtsMuted={isTtsMuted || false} 
                        key={tutorSceneDisplayKeyRef.current} 
                        isPaused={isPresentationPaused}
                        onSpeechEnd={() => { /* Can use for advancing if needed */ }}
                     />
                ) : isLoadingAi && (currentMode === "loading_teach" || (currentMode === "loading_feedback" && !displayScene)) ? (
                     <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : null}

                 {(currentMode === "quizzing" || (isLoadingAi && currentMode === "loading_quiz")) && (
                    <Card className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 shadow-lg bg-slate-700 text-slate-100 rounded-xl">
                        {isLoadingAi && currentMode === "loading_quiz" && !currentQuizData && (
                             <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        )}
                        {currentQuizData && (
                        <>
                            <CardHeader className="pt-2 pb-3 md:pt-3 md:pb-4">
                                <CardTitle className="text-lg md:text-xl text-center">{currentQuizData.question}</CardTitle>
                            </CardHeader>
                            <CardContent className="w-full max-w-md">
                                <RadioGroup value={currentQuizSelection || undefined} onValueChange={setCurrentQuizSelection} className="space-y-2 md:space-y-3" disabled={isLoadingAi}>
                                    {currentQuizData.options.map((opt, idx) => (
                                    <Label key={idx} htmlFor={`q_opt_${idx}`} className="flex items-center p-3 border border-slate-500 rounded-md hover:bg-slate-600 cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary text-sm md:text-base">
                                        <RadioGroupItem value={idx.toString()} id={`q_opt_${idx}`} className="mr-3 border-slate-400 text-primary focus:ring-primary" /> {opt}
                                    </Label>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                        </>
                        )}
                    </Card>
                 )}
            </div>
            
            <div className="flex-shrink-0 space-y-3 p-1">
                {isLoadingAi && (currentMode === "loading_teach" || currentMode === "loading_quiz" || currentMode === "loading_feedback" || currentMode === "loading_query_answer") && (
                     <div className="flex justify-center items-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                )}

                {!isLoadingAi && (currentMode === "teaching" || currentMode === "answered_query") && currentTeachingScene && !currentAiQueryResponse && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleQuizMe} className="flex-1 text-base py-2.5 shadow-md" disabled={currentTeachingScene.isLastTeachingStep || isPresentationPaused}>
                            <Brain className="mr-2 h-5 w-5" /> Quiz Me On This!
                        </Button>
                         <Button onClick={handleContinueLearning} variant="outline" className="flex-1 text-base py-2.5 shadow-md" disabled={isPresentationPaused}>
                            {currentTeachingScene.isLastTeachingStep ? "Finish Topic" : "Continue Learning"}
                        </Button>
                    </div>
                )}

                {!isLoadingAi && currentMode === "quizzing" && currentQuizData && (
                    <Button onClick={handleQuizSubmit} className="w-full text-lg py-3 shadow-md" disabled={currentQuizSelection === null}>
                        Submit Answer
                    </Button>
                )}

                {!isLoadingAi && (currentMode === "feedback" || (currentMode === "answered_query" && currentAiQueryResponse)) && (
                    <Alert variant={quizFeedback?.isCorrect ?? true ? "default" : "destructive"} className={cn("shadow-md", 
                        currentMode === "answered_query" && "bg-blue-50 border-blue-500 dark:bg-blue-900/30",
                        currentMode === "feedback" && (quizFeedback?.isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-red-500 bg-red-50 dark:bg-red-900/30")
                    )}>
                        {currentMode === "feedback" && (quizFeedback?.isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />)}
                        {currentMode === "answered_query" && <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                        
                        <AlertTitle className={cn("font-semibold", 
                            currentMode === "answered_query" && "text-blue-700 dark:text-blue-300",
                            currentMode === "feedback" && (quizFeedback?.isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")
                        )}>
                            {currentMode === "answered_query" ? "Study AI+ Responds:" : (quizFeedback?.isCorrect ? "Correct!" : "Not Quite!")}
                        </AlertTitle>
                        <AlertDescription className={cn(
                             currentMode === "answered_query" && "text-blue-600 dark:text-blue-400",
                             currentMode === "feedback" && (quizFeedback?.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                        )}>
                            {currentMode === "answered_query" ? currentAiQueryResponse : quizFeedback?.text}
                        </AlertDescription>

                        {currentMode === "feedback" && sessionData?.currentQuizData?.explanation && (
                             <p className="mt-2 text-xs text-muted-foreground">
                                <HelpCircle className="inline h-3 w-3 mr-1"/>
                                {sessionData.currentQuizData.explanation}
                             </p>
                        )}
                        <Button 
                            onClick={currentMode === "answered_query" ? handleResumePresentation : handleContinueLearning} 
                            className="w-full mt-3 text-base" 
                            size="sm"
                        >
                            {currentMode === "answered_query" ? "Resume Presentation" : (currentTeachingScene?.isLastTeachingStep ? "Finish Topic" : "Continue Learning")}
                        </Button>
                    </Alert>
                )}

                {!isLoadingAi && currentMode === "finished" && (
                    <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30 text-center">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <AlertTitle className="font-semibold text-green-700 dark:text-green-300 text-xl">Topic Complete!</AlertTitle>
                        {documentName && <AlertDescription className="text-green-600 dark:text-green-400">You've successfully completed this topic on {documentName}.</AlertDescription>}
                    </Alert>
                )}
                 {/* User Query Input - Visible during teaching or when AI has answered a query */}
                {!isLoadingAi && (currentMode === "teaching" || currentMode === "answered_query") && !isPresentationPaused && (
                <div className="mt-4 space-y-2">
                    <Label htmlFor="userQueryInput" className="text-sm font-medium">Have a question about this? Ask Study AI+:</Label>
                    <div className="flex items-center space-x-2">
                    <Textarea
                        id="userQueryInput"
                        value={userQueryInputValue}
                        onChange={(e) => setUserQueryInputValue(e.target.value)}
                        placeholder="Type your question here..."
                        rows={1}
                        className="min-h-[40px] resize-none flex-grow text-sm"
                        disabled={isLoadingAi || isPresentationPaused}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleAskQuestion();
                           }
                        }}
                    />
                    <Button onClick={handleAskQuestion} disabled={!userQueryInputValue.trim() || isLoadingAi || isPresentationPaused} size="icon">
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Ask Question</span>
                    </Button>
                    </div>
                </div>
                )}
            </div>
        </div>

        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-4xl mx-auto flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
                <Button onClick={handleEndSession} variant="secondary" size="lg" className="flex-1 sm:flex-none shadow-md">
                    <ArrowLeft className="mr-2 h-5 w-5" /> End Session
                </Button>
                <Button onClick={() => router.push('/dashboard')} variant="default" size="lg" className="flex-1 sm:flex-none shadow-md">
                    <Home className="mr-2 h-5 w-5" /> Dashboard
                </Button>
            </div>
            <Button variant="outline" size="icon" onClick={toggleMute} title={isTtsMuted ? "Unmute TTS" : "Mute TTS"} className="shadow-md">
                {isTtsMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}

