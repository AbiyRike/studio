
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { getActiveDynamicTutorSession, setActiveDynamicTutorSession, type ActiveDynamicTutorSessionData, type TeachingSceneSchema } from '@/lib/session-store';
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
      zIndex: 1000, // Ensure confetti is on top
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
    y: -10 - Math.random() * 20,
    rotate: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
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
  const tutorSceneDisplayKeyRef = useRef(Date.now());

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
  }, []); // Removed router and toast from dependencies as they are stable


  const updateSessionState = (newPartialData: Partial<ActiveDynamicTutorSessionData>, newSceneData?: TeachingSceneSchema | null) => {
    setSessionData(prevData => {
      let baseData = prevData;
      if (!baseData && !newPartialData.id) {
         const initialId = generateId();
         baseData = {
            id: `dyn_${initialId}`,
            kbItemId: "", documentName: "", documentContent: "",
            currentTeachingScene: null, currentQuizData: null, quizFeedback: null,
            currentMode: "loading_teach", isTtsMuted: false, cumulativeLearningContext: "Start of session",
            userQuestionsHistory: [],
         };
      }

      const sceneToUpdateWith = newSceneData !== undefined ? newSceneData : newPartialData.currentTeachingScene;
      const updatedData = { ...(baseData as ActiveDynamicTutorSessionData), ...newPartialData };
      setActiveDynamicTutorSession(updatedData);

      if (sceneToUpdateWith) {
        const scene = sceneToUpdateWith;
        const colors = themeToColorClasses(scene.colorThemeHint);
        tutorSceneDisplayKeyRef.current = Date.now();
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
    if (!sessionData && mode !== "teach") {
         console.warn("handleAiInteraction called without sessionData for mode:", mode);
         return;
    }

    let loadingMode: ActiveDynamicTutorSessionData['currentMode'] = "loading_teach";
    if (mode === "generate_quiz") loadingMode = "loading_quiz";
    else if (mode === "evaluate_answer") loadingMode = "loading_feedback";
    else if (mode === "answer_query") loadingMode = "loading_query_answer";
    
    const sceneToKeep = (mode === "answer_query" || mode === "loading_query_answer") ? sessionData?.currentTeachingScene : null;

    updateSessionState({ currentMode: loadingMode, quizFeedback: null, currentQuizData: mode === "generate_quiz" ? sessionData?.currentQuizData : null, currentTeachingScene: sceneToKeep });
    setCurrentQuizSelection(null);
    setCurrentAiQueryResponse(null);

    const inputForAi: GetNextDynamicTutorResponseInput = {
        currentSessionData: sessionData || { 
            id: `dyn_init_${generateId()}`, kbItemId: "", documentName: "Starting Session", documentContent: "",
            currentTeachingScene: null, currentQuizData: null, quizFeedback: null,
            currentMode: "loading_teach", isTtsMuted: false, cumulativeLearningContext: "Start of session", userQuestionsHistory: []
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
        updateSessionState({ currentQuizData: response.quiz, currentMode: "quizzing", quizFeedback: null, currentTeachingScene: null });
      } else if (response.mode === "feedback" && response.feedback) {
        updateSessionState({ quizFeedback: response.feedback, currentMode: "feedback", currentQuizData: null, currentTeachingScene: sessionData?.currentTeachingScene || null });
        if (response.feedback.isCorrect) {
            setShowConfetti(true);
        }
      } else if (response.mode === "answer_query" && response.aiQueryResponseText) {
          setCurrentAiQueryResponse(response.aiQueryResponseText);
          updateSessionState({ currentMode: "answered_query", currentTeachingScene: lastTeachingSceneBeforeQuery });
      } else {
         toast({ title: "Tutor Error", description: "Received an unexpected response from the tutor.", variant: "destructive" });
         updateSessionState({ currentMode: "teaching"});
      }
    }
  }, [sessionData, toast, lastTeachingSceneBeforeQuery]); // Removed updateSessionState from dependencies

  const handleAskQuestion = () => {
    if (!userQueryInputValue.trim() || !sessionData) return;
    setIsPresentationPaused(true);
    setLastTeachingSceneBeforeQuery(sessionData.currentTeachingScene);
    handleAiInteraction("answer_query", userQueryInputValue);
    setUserQueryInputValue("");
  };

  const handleResumePresentation = () => {
    setCurrentAiQueryResponse(null);
    setIsPresentationPaused(false);
    if (lastTeachingSceneBeforeQuery) {
        updateSessionState({ currentMode: "teaching", currentTeachingScene: lastTeachingSceneBeforeQuery});
    } else if (sessionData?.currentTeachingScene) {
        updateSessionState({ currentMode: "teaching", currentTeachingScene: sessionData.currentTeachingScene});
    } else {
        handleAiInteraction("teach");
    }
    setLastTeachingSceneBeforeQuery(null);
  };
  
  const handleQuizMe = () => {
    if (sessionData && sessionData.currentTeachingScene) {
      setIsPresentationPaused(true);
      handleAiInteraction("generate_quiz");
    }
  };

  const handleQuizSubmit = () => {
    if (currentQuizSelection === null || !sessionData || !sessionData.currentQuizData) return;
    const selectedOptionText = sessionData.currentQuizData.options[parseInt(currentQuizSelection, 10)];
    handleAiInteraction("evaluate_answer", selectedOptionText);
  };

  const handleContinueLearning = () => {
    setIsPresentationPaused(false);
    setCurrentAiQueryResponse(null);
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
        <div className="container mx-auto py-8 flex justify-center items-center min-h-[80vh]">
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
      <div className="container mx-auto py-4 md:py-8"> {/* Removed fixed height, page will scroll */}
        <Card className="w-full max-w-4xl mx-auto shadow-2xl flex flex-col"> {/* Single presentation box */}
          <CardHeader className="text-center pb-4 pt-5 border-b">
            <Sparkles className="mx-auto h-10 w-10 text-primary mb-1" />
            <CardTitle className="text-2xl md:text-3xl font-headline">Interactive Tutor</CardTitle>
            {documentName && <CardDescription className="text-sm md:text-base">Topic: {documentName}</CardDescription>}
          </CardHeader>

          <CardContent className="p-3 sm:p-4 md:p-6 space-y-6 flex-grow"> {/* Main content area within the card */}
            
            {/* Tutor Scene Display Area */}
            <div className="w-full min-h-[300px] md:min-h-[400px] lg:min-h-[45vh] relative bg-muted/30 rounded-xl p-2">
                 {(currentMode === "teaching" || currentMode === "answered_query" || currentMode === "feedback" || currentMode === "loading_teach") && displayScene ? (
                    <TutorSceneDisplay 
                        scene={displayScene} 
                        isTtsMuted={isTtsMuted || false} 
                        key={tutorSceneDisplayKeyRef.current} 
                        isPaused={isPresentationPaused}
                        onSpeechEnd={() => { /* Callback for when scene speech ends */ }}
                     />
                ) : isLoadingAi && (currentMode === "loading_teach" || (currentMode === "loading_feedback" && !displayScene)) ? (
                     <div className="w-full h-full flex items-center justify-center rounded-xl p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : null}

                 {(currentMode === "quizzing" || (isLoadingAi && currentMode === "loading_quiz")) && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 bg-slate-700 text-slate-100 rounded-xl">
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
                             <CardFooter className="pt-4 w-full max-w-md">
                                <Button onClick={handleQuizSubmit} className="w-full text-lg py-3 shadow-md" disabled={currentQuizSelection === null || isLoadingAi}>
                                    {isLoadingAi ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} Submit Answer
                                </Button>
                            </CardFooter>
                        </>
                        )}
                    </div>
                 )}
            </div>
            
            {/* Contextual Controls Area (Quiz Me, Continue Learning, Feedback, Query Input) */}
            <div className="flex-shrink-0 space-y-4 p-1">
                {isLoadingAi && (currentMode === "loading_teach" || currentMode === "loading_quiz" || currentMode === "loading_feedback" || currentMode === "loading_query_answer") && (
                     <div className="flex justify-center items-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                )}

                {!isLoadingAi && (currentMode === "teaching" || currentMode === "answered_query") && currentTeachingScene && !currentAiQueryResponse && !isPresentationPaused && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleQuizMe} className="flex-1 text-base py-2.5 shadow-md" disabled={currentTeachingScene.isLastTeachingStep}>
                            <Brain className="mr-2 h-5 w-5" /> Quiz Me On This!
                        </Button>
                         <Button onClick={handleContinueLearning} variant="outline" className="flex-1 text-base py-2.5 shadow-md">
                            {currentTeachingScene.isLastTeachingStep ? "Finish Topic" : "Continue Learning"}
                        </Button>
                    </div>
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
                        <AlertDescription className={cn("whitespace-pre-line", // Allow newlines in AI response
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
                
                {!isLoadingAi && (currentMode === "teaching" || currentMode === "answered_query") && !isPresentationPaused && (
                <div className="mt-4 space-y-2">
                    <Label htmlFor="userQueryInput" className="text-sm font-medium">Have a question? Ask Study AI+:</Label>
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
          </CardContent>

          <CardFooter className="p-4 md:p-6 border-t flex flex-col space-y-4 items-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
                    <ArrowLeft className="mr-2 h-5 w-5" /> End Session
                </Button>
                <Button onClick={() => router.push('/dashboard')} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
                    <Home className="mr-2 h-5 w-5" /> Dashboard
                </Button>
            </div>
            <Button variant="outline" size="icon" onClick={toggleMute} title={isTtsMuted ? "Unmute TTS" : "Mute TTS"} className="shadow-md">
                {isTtsMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
        </CardFooter>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}


    