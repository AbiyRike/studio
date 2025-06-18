"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getActiveDynamicTutorSession, setActiveDynamicTutorSession, type ActiveDynamicTutorSessionData, type TeachingSceneSchema, type QuizSchema, type FeedbackSchema } from '@/lib/session-store';
import { getNextDynamicTutorResponse, startDynamicTutorSession, type GetNextDynamicTutorResponseInput } from '@/app/actions'; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Sparkles, Loader2, ArrowLeft, Home, Volume2, VolumeX, HelpCircle, CheckCircle, XCircle, Brain } from 'lucide-react';
import { TutorSceneDisplay, type TutorSceneData } from '@/components/tutor-scene-display';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/knowledge-base-store';

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

// Helper to map AI theme hints to Tailwind classes
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


export default function DynamicInteractiveTutorSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveDynamicTutorSessionData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [currentQuizSelection, setCurrentQuizSelection] = useState<string | null>(null); // Stores index as string

  // Derived state for the TutorSceneDisplay
  const [displayScene, setDisplayScene] = useState<TutorSceneData | null>(null);

  useEffect(() => {
    const data = getActiveDynamicTutorSession();
    if (data) {
      setSessionData(data);
      if(data.currentTeachingScene) {
        const colors = themeToColorClasses(data.currentTeachingScene.colorThemeHint);
        setDisplayScene({
            id: data.id + (data.currentTeachingScene.title || 'scene'),
            title: data.currentTeachingScene.title,
            description: data.currentTeachingScene.description,
            iconName: data.currentTeachingScene.iconName,
            bgColorClass: colors.bgColorClass,
            textColorClass: colors.textColorClass,
        });
      }
    } else {
      toast({ title: "Session Error", description: "No active tutoring session found. Please start a new session.", variant: "destructive" });
      router.push('/interactive-tutor/select');
    }
    setIsLoadingPage(false);
  }, [router, toast]);


  const updateSessionState = (newPartialData: Partial<ActiveDynamicTutorSessionData>) => {
    setSessionData(prevData => {
      if (!prevData) return null;
      const updatedData = { ...prevData, ...newPartialData };
      setActiveDynamicTutorSession(updatedData);

      // Update displayScene if currentTeachingScene changes
      if (newPartialData.currentTeachingScene) {
        const scene = newPartialData.currentTeachingScene;
        const colors = themeToColorClasses(scene.colorThemeHint);
        setDisplayScene({
            id: updatedData.id + (scene.title || 'scene') + Date.now(), // Ensure key changes
            title: scene.title,
            description: scene.description,
            iconName: scene.iconName,
            bgColorClass: colors.bgColorClass,
            textColorClass: colors.textColorClass,
        });
      } else if (newPartialData.hasOwnProperty('currentTeachingScene') && newPartialData.currentTeachingScene === null) {
         setDisplayScene(null); // Clear display scene if teaching scene is cleared
      }
      return updatedData;
    });
  };

  const handleAiInteraction = useCallback(async (mode: "teach" | "generate_quiz" | "evaluate_answer", userQuizAnswerText?: string) => {
    if (!sessionData) return;

    let loadingMode: ActiveDynamicTutorSessionData['currentMode'] = "loading_teach";
    if (mode === "generate_quiz") loadingMode = "loading_quiz";
    else if (mode === "evaluate_answer") loadingMode = "loading_feedback";
    
    updateSessionState({ currentMode: loadingMode, quizFeedback: null, currentQuizData: mode !== "generate_quiz" ? null : sessionData.currentQuizData });
    setCurrentQuizSelection(null);


    const inputForAi: GetNextDynamicTutorResponseInput = {
        currentSessionData: sessionData,
        interactionMode: mode,
        userQuizAnswer: userQuizAnswerText,
    };

    const response = await getNextDynamicTutorResponse(inputForAi);

    if ('error' in response) {
      toast({ title: "Tutor Error", description: response.error, variant: "destructive" });
      updateSessionState({ currentMode: sessionData.currentTeachingScene ? "teaching" : "finished" }); // Revert to teaching or finished
    } else {
      if (response.mode === "teach" && response.teachingScene) {
        updateSessionState({
          currentTeachingScene: response.teachingScene,
          currentMode: "teaching",
          cumulativeLearningContext: (sessionData.cumulativeLearningContext || "") + "\nTopic: " + response.teachingScene.title + ". Content: " + response.teachingScene.description.substring(0,100) + "...",
          currentQuizData: null, // Clear previous quiz
          quizFeedback: null,    // Clear previous feedback
        });
      } else if (response.mode === "quiz" && response.quiz) {
        updateSessionState({ currentQuizData: response.quiz, currentMode: "quizzing", quizFeedback: null });
      } else if (response.mode === "feedback" && response.feedback) {
        updateSessionState({ quizFeedback: response.feedback, currentMode: "feedback", currentQuizData: null });
      } else {
         toast({ title: "Tutor Error", description: "Received an unexpected response from the tutor.", variant: "destructive" });
         updateSessionState({ currentMode: "teaching"});
      }
    }
  }, [sessionData, toast]);


  const handleQuizMe = () => {
    if (sessionData && sessionData.currentTeachingScene) {
      handleAiInteraction("generate_quiz");
    }
  };

  const handleQuizSubmit = () => {
    if (currentQuizSelection === null || !sessionData || !sessionData.currentQuizData) return;
    const selectedOptionText = sessionData.currentQuizData.options[parseInt(currentQuizSelection, 10)];
    handleAiInteraction("evaluate_answer", selectedOptionText);
  };

  const handleContinueLearning = () => {
    if (sessionData?.currentTeachingScene?.isLastTeachingStep) {
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

  if (isLoadingPage || !sessionData) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </ClientAuthGuard>
    );
  }
  
  const { currentMode, currentTeachingScene, currentQuizData, quizFeedback, isTtsMuted, documentName } = sessionData;
  const isLoadingAi = currentMode.startsWith("loading_");

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-4 flex flex-col h-[calc(100vh-6rem)] space-y-4"> {/* Adjusted height and padding */}
        <Card className="w-full max-w-4xl mx-auto shadow-xl flex-shrink-0">
          <CardHeader className="text-center pb-4 pt-5"> {/* Adjusted padding */}
            <Sparkles className="mx-auto h-10 w-10 text-primary mb-1" /> {/* Adjusted size/margin */}
            <CardTitle className="text-2xl md:text-3xl font-headline">Interactive Tutor</CardTitle>
            <CardDescription className="text-sm md:text-base">Topic: {documentName}</CardDescription>
          </CardHeader>
        </Card>

        {/* Main Content Area: Tutor Display + Controls */}
        <div className="flex-grow w-full max-w-4xl mx-auto flex flex-col min-h-0"> {/* Added flex-col */}
            {/* Tutor Scene Display */}
            <div className="h-80 md:h-96 w-full mb-4 flex-shrink-0"> {/* Fixed height for display */}
                 {(currentMode === "teaching" || currentMode === "loading_teach" || currentMode === "feedback") && displayScene ? (
                    <TutorSceneDisplay scene={displayScene} isTtsMuted={isTtsMuted} key={displayScene.id} />
                ) : isLoadingAi && !displayScene ? (
                     <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : null}
                 {(currentMode === "quizzing" || currentMode === "loading_quiz") && currentQuizData && (
                     <Card className="w-full h-full flex flex-col items-center justify-center p-6 shadow-lg bg-slate-700 text-slate-100 rounded-xl">
                        <CardHeader><CardTitle className="text-xl md:text-2xl text-center">{currentQuizData.question}</CardTitle></CardHeader>
                        <CardContent className="w-full max-w-md">
                            <RadioGroup value={currentQuizSelection || undefined} onValueChange={setCurrentQuizSelection} className="space-y-3" disabled={isLoadingAi}>
                                {currentQuizData.options.map((opt, idx) => (
                                <Label key={idx} htmlFor={`q_opt_${idx}`} className="flex items-center p-3 border border-slate-500 rounded-md hover:bg-slate-600 cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                                    <RadioGroupItem value={idx.toString()} id={`q_opt_${idx}`} className="mr-3 border-slate-400 text-primary focus:ring-primary" /> {opt}
                                </Label>
                                ))}
                            </RadioGroup>
                        </CardContent>
                    </Card>
                 )}
            </div>
            
            {/* Controls Area */}
            <div className="flex-shrink-0 space-y-3 mt-2">
                {isLoadingAi && (
                     <div className="flex justify-center items-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                )}

                {!isLoadingAi && currentMode === "teaching" && currentTeachingScene && (
                    <Button onClick={handleQuizMe} className="w-full text-lg py-3 shadow-md" disabled={currentTeachingScene.isLastTeachingStep}>
                        <Brain className="mr-2 h-5 w-5" /> Quiz Me On This!
                    </Button>
                )}

                {!isLoadingAi && currentMode === "quizzing" && currentQuizData && (
                    <Button onClick={handleQuizSubmit} className="w-full text-lg py-3 shadow-md" disabled={currentQuizSelection === null}>
                        Submit Answer
                    </Button>
                )}

                {!isLoadingAi && currentMode === "feedback" && quizFeedback && (
                    <Alert variant={quizFeedback.isCorrect ? "default" : "destructive"} className={cn("shadow-md", quizFeedback.isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-red-500 bg-red-50 dark:bg-red-900/30")}>
                        {quizFeedback.isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                        <AlertTitle className={cn("font-semibold", quizFeedback.isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
                            {quizFeedback.isCorrect ? "Correct!" : "Not Quite!"}
                        </AlertTitle>
                        <AlertDescription className={cn(quizFeedback.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                            {quizFeedback.text}
                        </AlertDescription>
                        {sessionData.currentQuizData?.explanation && (
                             <p className="mt-2 text-xs text-muted-foreground">
                                <HelpCircle className="inline h-3 w-3 mr-1"/>
                                {sessionData.currentQuizData.explanation}
                             </p>
                        )}
                        <Button onClick={handleContinueLearning} className="w-full mt-3 text-base" size="sm">
                            {currentTeachingScene?.isLastTeachingStep ? "Finish Topic" : "Continue Learning"}
                        </Button>
                    </Alert>
                )}

                {!isLoadingAi && currentMode === "finished" && (
                    <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30 text-center">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <AlertTitle className="font-semibold text-green-700 dark:text-green-300 text-xl">Topic Complete!</AlertTitle>
                        <AlertDescription className="text-green-600 dark:text-green-400">
                            You've successfully completed this topic on {documentName}.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>

        {/* Bottom Navigation and Mute Toggle */}
        <div className="mt-auto pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-4xl mx-auto flex-shrink-0">
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
