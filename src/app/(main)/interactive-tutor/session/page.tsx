
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getActiveInteractiveTutorSession, setActiveInteractiveTutorSession, type ActiveInteractiveTutorSessionData, type InteractiveTutorStepData } from '@/lib/session-store';
import { getNextInteractiveTutorStep as getNextTutorStepServerAction } from '@/app/actions'; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, GraduationCap, PlayCircle, StopCircle, Loader2, ArrowLeft, Home } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function InteractiveTutorSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveInteractiveTutorSessionData | null>(null);
  const [currentStep, setCurrentStep] = useState<InteractiveTutorStepData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPlayingTTS, setIsPlayingTTS] = useState(false); 
  const [miniQuizAnswer, setMiniQuizAnswer] = useState<string | undefined>(undefined);
  const [submittedQuizAnswerForFeedback, setSubmittedQuizAnswerForFeedback] = useState<string | undefined>(undefined);


  useEffect(() => {
    const data = getActiveInteractiveTutorSession();
    if (data && data.currentStepData) {
      setSessionData(data);
      setCurrentStep(data.currentStepData);
    } else {
      setError("No active tutoring session found or session is invalid. Please start a new session from the 'Tutor Me' page.");
      setActiveInteractiveTutorSession(null);
    }
    setIsLoading(false);
  }, []);

  const handleEndSession = () => {
    setActiveInteractiveTutorSession(null);
    router.push('/interactive-tutor/select');
  };

  const handleReturnToDashboard = () => {
    setActiveInteractiveTutorSession(null);
    router.push('/dashboard');
  }

  const processAndSetNextStep = async (quizAnswerInput?: string) => {
    if (!sessionData || !currentStep) return;
    setIsFetchingNext(true);

    const targetStepForAI = sessionData.currentStepIndex + 1;
        
    const result = await getNextTutorStepServerAction(sessionData, targetStepForAI, quizAnswerInput);
    setIsFetchingNext(false);

    if ('error' in result) {
      toast({ title: "Error fetching next step", description: result.error, variant: "destructive" });
      if (result.error.toLowerCase().includes("no more steps") || result.error.toLowerCase().includes("unable to proceed") || result.error.toLowerCase().includes("session on")) {
         setError(`Tutoring session ended: ${result.error}`);
         setCurrentStep(prev => prev ? {...prev, isLastStep: true} : null);
      }
    } else {
      const newClientStepIndex = sessionData.currentStepIndex + 1;
      const updatedSessionData: ActiveInteractiveTutorSessionData = { 
        ...sessionData, 
        currentStepIndex: newClientStepIndex, 
        currentStepData: result 
      };
      setSessionData(updatedSessionData);
      setCurrentStep(result);
      setActiveInteractiveTutorSession(updatedSessionData);
      setMiniQuizAnswer(undefined); 
      setSubmittedQuizAnswerForFeedback(undefined); 
      if (result.isLastStep) {
        toast({ title: "Tutoring Complete!", description: result.explanation || "You've reached the end of this topic."});
      }
    }
  }
  
  const handleNextStepOrSubmitQuiz = () => {
    if (currentStep?.miniQuiz && miniQuizAnswer !== undefined) {
        setSubmittedQuizAnswerForFeedback(miniQuizAnswer); 
        processAndSetNextStep(miniQuizAnswer);
    } else if (!currentStep?.miniQuiz) { // Only proceed if there's no quiz
        processAndSetNextStep();
    } else {
        // If there is a quiz, but no answer is selected, do nothing (or show a toast)
        toast({ title: "Mini-Quiz Incomplete", description: "Please select an answer for the quiz to proceed.", variant: "default"});
    }
  };
  
  const toggleTTS = () => {
    setIsPlayingTTS(!isPlayingTTS);
    // Actual TTS implementation would go here
  }

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <div className="flex justify-between gap-4">
            <Skeleton className="h-10 w-28" /> <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData || !currentStep) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive mt-2">Session Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load tutoring session data."}</p>
              <Button onClick={() => router.push('/interactive-tutor/select')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-6">
        <Card className="w-full max-w-3xl shadow-xl">
          <CardHeader className="text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Interactive Tutor: {sessionData.documentName}</CardTitle>
            <CardDescription>Step {sessionData.currentStepIndex + 1}: {currentStep.topic || "Current Topic"}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="w-full max-w-3xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-48 p-4 border rounded-md bg-muted/30">
              <p className="text-foreground/90 whitespace-pre-wrap">{currentStep.explanation}</p>
            </ScrollArea>
            <Button onClick={toggleTTS} variant="outline" className="w-full sm:w-auto" disabled={isFetchingNext}>
              {isPlayingTTS ? <StopCircle className="mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
              {isPlayingTTS ? "Stop Speaking" : "Speak"}
            </Button>
          </CardContent>
        </Card>

        {currentStep.miniQuiz && (
          <Card className="w-full max-w-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Quick Check: {currentStep.miniQuiz.question}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep.miniQuiz.type === 'mcq' && currentStep.miniQuiz.options && (
                <RadioGroup value={miniQuizAnswer} onValueChange={(val) => setMiniQuizAnswer(val)} className="space-y-2" disabled={isFetchingNext || !!submittedQuizAnswerForFeedback}>
                  {currentStep.miniQuiz.options.map((opt, idx) => (
                    <Label key={idx} htmlFor={`quiz-opt-${idx}`} className="flex items-center p-3 border rounded-md hover:bg-accent cursor-pointer has-[input:disabled]:opacity-70 has-[input:disabled]:cursor-not-allowed">
                      <RadioGroupItem value={opt} id={`quiz-opt-${idx}`} className="mr-2" />
                      {opt}
                    </Label>
                  ))}
                </RadioGroup>
              )}
              {currentStep.miniQuiz.type === 'short_answer' && (
                <Input 
                  type="text" 
                  placeholder="Your answer..." 
                  value={miniQuizAnswer || ""}
                  onChange={(e) => setMiniQuizAnswer(e.target.value)}
                  disabled={isFetchingNext || !!submittedQuizAnswerForFeedback}
                />
              )}
               {submittedQuizAnswerForFeedback && <p className="text-sm text-muted-foreground mt-3">Your answer has been considered. The tutor will address it in the next step if needed.</p>}
            </CardContent>
          </Card>
        )}
        
        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
           {!currentStep.isLastStep && (
             <Button 
                onClick={handleNextStepOrSubmitQuiz} 
                disabled={isFetchingNext || (!!currentStep.miniQuiz && miniQuizAnswer === undefined) }
                size="lg" 
                className="w-full sm:w-auto shadow-md"
              >
                {isFetchingNext ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {currentStep.miniQuiz && miniQuizAnswer === undefined ? "Answer Quiz to Proceed" : "Next Step"}
              </Button>
           )}
           {currentStep.isLastStep && (
            <p className="text-lg font-semibold text-primary">Tutoring session complete!</p>
           )}
        </div>
         <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full max-w-3xl">
            <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
                <ArrowLeft className="mr-2 h-5 w-5" /> End Session
            </Button>
            <Button onClick={handleReturnToDashboard} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
                 <Home className="mr-2 h-5 w-5" /> Dashboard
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}

    
