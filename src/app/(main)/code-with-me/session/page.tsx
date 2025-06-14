
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getActiveCodeTeachingSession, setActiveCodeTeachingSession, type ActiveCodeTeachingSessionData, type CodeTeachingStepData } from '@/lib/session-store';
import { getNextCodeTeachingStep } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Code2, Loader2, ArrowLeft, Home, CheckCircle, XCircle, Check } from 'lucide-react';

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

export default function CodeTeachingSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveCodeTeachingSessionData | null>(null);
  const [currentStep, setCurrentStep] = useState<CodeTeachingStepData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    const data = getActiveCodeTeachingSession();
    if (data && data.currentStepData) {
      setSessionData(data);
      setCurrentStep(data.currentStepData);
    } else {
      setError("No active coding session found. Please start a new session.");
      setActiveCodeTeachingSession(null);
    }
    setIsLoading(false);
  }, []);

  const handleEndSession = () => {
    setActiveCodeTeachingSession(null);
    router.push('/code-with-me/select');
  };

  const handleReturnToDashboard = () => {
    setActiveCodeTeachingSession(null);
    router.push('/dashboard');
  };

  const handleSubmitOrNext = async () => {
    if (!sessionData || !currentStep) return;
    
    setShowFeedback(false);
    setFeedbackMessage(null);
    setIsCorrect(null);
    setIsFetchingNext(true);

    const result = await getNextCodeTeachingStep(sessionData, userAnswer);
    setIsFetchingNext(false);
    setUserAnswer("");

    if ('error' in result) {
      toast({ title: "Error fetching next step", description: result.error, variant: "destructive" });
      // Potentially set currentStep.isLastStepInTopic = true if error indicates end of content
    } else {
      const updatedSessionData: ActiveCodeTeachingSessionData = {
        ...sessionData,
        currentTopic: result.topic, // Update current topic based on AI's response for the new step
        currentStepData: result,
        history: [...(sessionData.history || []), { previousStep: currentStep, userAnswerSubmitted: userAnswer }],
      };
      setSessionData(updatedSessionData);
      setCurrentStep(result);
      setActiveCodeTeachingSession(updatedSessionData);

      if (result.feedbackOnPrevious) {
        setShowFeedback(true);
        setFeedbackMessage(result.feedbackOnPrevious);
        // Simple heuristic for correctness, can be improved
        setIsCorrect(!result.feedbackOnPrevious.toLowerCase().includes("not quite") && !result.feedbackOnPrevious.toLowerCase().includes("incorrect") && !result.feedbackOnPrevious.toLowerCase().includes("try again"));
      }
      
      if (result.isLastStepInTopic && result.topic.toLowerCase().includes("congratulations")) {
         toast({ title: "Module Complete!", description: result.explanation, duration: 7000, className: "bg-green-100 border-green-500 text-green-700" });
      }
    }
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData || !currentStep) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><CardTitle className="text-destructive mt-2">Session Error</CardTitle></CardHeader>
            <CardContent><p>{error || "Could not load coding session data."}</p><Button onClick={() => router.push('/code-with-me/select')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection</Button></CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }

  const isFinalStepMessage = !!(currentStep.isLastStepInTopic && currentStep.topic.toLowerCase().includes("congratulations"));

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-6">
        <Card className="w-full max-w-3xl shadow-xl">
          <CardHeader className="text-center">
            <Code2 className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Code with Me: {sessionData.language}</CardTitle>
            <CardDescription>Topic: {currentStep.topic}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="w-full max-w-3xl shadow-lg">
          <CardHeader><CardTitle className="text-xl">Explanation</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-auto max-h-60 p-4 border rounded-md bg-muted/30">
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: currentStep.explanation.replace(/\n/g, '<br/>') }} />
            </ScrollArea>
          </CardContent>
        </Card>

        {currentStep.codeExample && (
          <Card className="w-full max-w-3xl shadow-lg">
            <CardHeader><CardTitle className="text-xl">Code Example</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-auto max-h-60 p-4 border rounded-md bg-gray-900 text-gray-100 font-code text-sm shadow-inner">
                <pre><code dangerouslySetInnerHTML={{ __html: currentStep.codeExample.replace(/</g, '&lt;').replace(/>/g, '&gt;') }} /></pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {showFeedback && feedbackMessage && (
          <Card className={`w-full max-w-3xl shadow-md ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-red-500 bg-red-50 dark:bg-red-900/30'}`}>
            <CardHeader className="flex flex-row items-center space-x-2 py-3 px-4">
              {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
              <CardTitle className={`text-lg ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>Feedback</CardTitle>
            </CardHeader>
            <CardContent className={`px-4 pb-3 ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {feedbackMessage}
            </CardContent>
          </Card>
        )}

        {!isFinalStepMessage && (
          <Card className="w-full max-w-3xl shadow-lg">
            <CardHeader><CardTitle className="text-xl">Challenge: {currentStep.challenge}</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Type your answer or code here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                rows={3}
                className="min-h-[60px] font-code text-sm"
                disabled={isFetchingNext}
              />
            </CardContent>
          </Card>
        )}

        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
          {!isFinalStepMessage ? (
            <Button onClick={handleSubmitOrNext} disabled={isFetchingNext || (!userAnswer.trim() && currentStep.challenge !== "What kind of project are you excited to start with your new JavaScript skills?" && !currentStep.topic.toLowerCase().includes("congratulations")) } size="lg" className="w-full sm:w-auto shadow-md">
              {isFetchingNext ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Submit Answer &amp; Continue
            </Button>
          ) : (
             <Card className="w-full max-w-xl shadow-md border-primary bg-primary/10 dark:bg-primary/20">
                <CardContent className="p-6 text-center">
                    <Check className="mx-auto h-12 w-12 text-primary mb-3" />
                    <p className="text-xl font-semibold text-primary">{currentStep.topic}</p>
                    <p className="text-muted-foreground mt-1">{currentStep.explanation.split('\n')[0]}</p>
                </CardContent>
             </Card>
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


