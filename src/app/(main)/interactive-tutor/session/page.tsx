
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getActiveInteractiveTutorSession, setActiveInteractiveTutorSession, type ActiveInteractiveTutorSessionData, type InteractiveTutorStepData } from '@/lib/session-store';
import { getNextInteractiveTutorStep as getNextTutorStepServerAction } from '@/app/actions'; // Renamed for clarity
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, GraduationCap, MessageSquare, Mic, PlayCircle, StopCircle, Loader2, ArrowLeft, Home, Send } from 'lucide-react';
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
  
  const [userQuestion, setUserQuestion] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false); 
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

  const processAndSetNextStep = async (userQueryInput?: string, quizAnswerInput?: string) => {
    if (!sessionData || !currentStep) return;
    setIsFetchingNext(true);

    let targetStepForAI: number;
    let incrementClientStepIndex: boolean;

    if (userQueryInput) {
      // If user asks a question, AI addresses it within the current step context
      targetStepForAI = sessionData.currentStepIndex;
      incrementClientStepIndex = false;
    } else {
      // If user proceeds (Next Step or submitting quiz), AI generates the next conceptual step
      targetStepForAI = sessionData.currentStepIndex + 1;
      incrementClientStepIndex = true;
    }
    
    const result = await getNextTutorStepServerAction(sessionData, targetStepForAI, userQueryInput, quizAnswerInput);
    setIsFetchingNext(false);

    if ('error' in result) {
      toast({ title: "Error fetching next step", description: result.error, variant: "destructive" });
      if (result.error.toLowerCase().includes("no more steps") || result.error.toLowerCase().includes("unable to proceed") || result.error.toLowerCase().includes("session on")) {
         setError(`Tutoring session ended: ${result.error}`);
         setCurrentStep(prev => prev ? {...prev, isLastStep: true} : null);
      }
    } else {
      const newClientStepIndex = incrementClientStepIndex ? sessionData.currentStepIndex + 1 : sessionData.currentStepIndex;
      const updatedSessionData: ActiveInteractiveTutorSessionData = { 
        ...sessionData, 
        currentStepIndex: newClientStepIndex, 
        currentStepData: result 
      };
      setSessionData(updatedSessionData);
      setCurrentStep(result);
      setActiveInteractiveTutorSession(updatedSessionData);
      setUserQuestion(""); 
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
        processAndSetNextStep(undefined, miniQuizAnswer);
    } else {
        processAndSetNextStep();
    }
  };


  const handleUserQuestionSubmit = () => {
    if (!userQuestion.trim()) {
      toast({ title: "Please enter a question", variant: "default" });
      return;
    }
    processAndSetNextStep(userQuestion, undefined); 
  };
  
  // Placeholder functions
  const toggleTTS = () => {
    setIsPlayingTTS(!isPlayingTTS);
    toast({ title: "TTS Placeholder", description: isPlayingTTS ? "TTS Paused" : "TTS Playing..."});
  }
  const toggleVoiceInput = () => {
      setIsRecordingVoice(!isRecordingVoice);
      toast({ title: "Voice Input Placeholder", description: isRecordingVoice ? "Voice Recording Stopped" : "Listening..."});
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
        
        {!currentStep.isLastStep && (
          <Card className="w-full max-w-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Ask a Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea 
                placeholder="Type your question about the current topic..." 
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                rows={3}
                disabled={isFetchingNext}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleUserQuestionSubmit} className="flex-grow" disabled={isFetchingNext || !userQuestion.trim()}>
                  <Send className="mr-2 h-5 w-5" /> Submit Question
                </Button>
                <Button onClick={toggleVoiceInput} variant="outline" className="sm:w-auto" disabled={isFetchingNext}>
                  <Mic className="mr-2 h-5 w-5" /> {isRecordingVoice ? "Stop Recording" : "Ask with Voice"} 
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
           {!currentStep.isLastStep && (
             <Button 
                onClick={handleNextStepOrSubmitQuiz} 
                disabled={isFetchingNext || (!!currentStep.miniQuiz && miniQuizAnswer === undefined && !userQuestion.trim()) }
                size="lg" 
                className="w-full sm:w-auto shadow-md"
              >
                {isFetchingNext ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {currentStep.miniQuiz && miniQuizAnswer === undefined && !userQuestion.trim() ? "Answer Quiz to Proceed" : "Next Step"}
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
