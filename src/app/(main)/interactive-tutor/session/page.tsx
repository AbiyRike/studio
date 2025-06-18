
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getActiveDynamicTutorSession, setActiveDynamicTutorSession, type ActiveDynamicTutorSessionData, type DynamicTutorStepData, type ChatMessage } from '@/lib/session-store';
import { getNextDynamicTutorResponse } from '@/app/actions'; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Sparkles, Loader2, ArrowLeft, Home, Send, Volume2, VolumeX, Camera, User, MessageSquare, CheckCircle, XCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { DynamicTutorDisplay } from '@/components/dynamic-tutor-display';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

export default function DynamicInteractiveTutorSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveDynamicTutorSessionData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [currentQuizAnswer, setCurrentQuizAnswer] = useState<string | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [displayQuiz, setDisplayQuiz] = useState<DynamicTutorStepData['miniQuiz']>(null);
  const [chatDisplayKey, setChatDisplayKey] = useState(0); 

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const tutorDisplayRef = useRef<HTMLDivElement>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const data = getActiveDynamicTutorSession();
    if (data && data.currentStepData) {
      setSessionData(data);
      if (data.currentStepData.miniQuiz) {
        setDisplayQuiz(data.currentStepData.miniQuiz);
      }
    } else if (data && !data.currentStepData) {
      setIsLoadingAi(true);
      getNextDynamicTutorResponse(data, {})
        .then(stepResult => {
          if ('error' in stepResult) {
            setError(stepResult.error);
            setActiveDynamicTutorSession(null);
          } else {
            const updatedSession = {...data, currentStepData: stepResult};
            setSessionData(updatedSession);
            setActiveDynamicTutorSession(updatedSession);
            if (stepResult.miniQuiz) setDisplayQuiz(stepResult.miniQuiz);
          }
        })
        .finally(() => setIsLoadingAi(false));
    }
    else {
      setError("No active tutoring session found or session is invalid. Please start a new session.");
      setActiveDynamicTutorSession(null);
    }
    setIsLoadingPage(false);
    
    return () => {
        setIsMounted(false);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            if (utteranceRef.current) {
                utteranceRef.current.onend = null;
                utteranceRef.current.onerror = null;
            }
            window.speechSynthesis.cancel();
            utteranceRef.current = null;
        }
    }
  }, []);

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!isMounted || !sessionData || sessionData.isTtsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      onEndCallback?.();
      return;
    }
    
    if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel();
    
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const desiredVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Microsoft David') || v.name.includes('Samantha')));
    newUtterance.voice = desiredVoice || voices.find(v => v.lang === 'en-US') || voices[0];
    newUtterance.rate = 0.9;
    newUtterance.onend = () => {
      if (isMounted && newUtterance === utteranceRef.current) { 
        onEndCallback?.();
        utteranceRef.current = null;
      }
    };
    newUtterance.onerror = (event) => {
      if (isMounted && newUtterance === utteranceRef.current) { 
        console.error("TTS Error:", event.error);
        onEndCallback?.(); 
        utteranceRef.current = null;
      }
    };
    utteranceRef.current = newUtterance;
    window.speechSynthesis.speak(newUtterance);
  }, [isMounted, sessionData]);


  const processNextStep = async (userQuery?: string, quizAnswer?: string) => {
    if (!sessionData) return;
    setIsLoadingAi(true);
    setShowQuizFeedback(false);
    setDisplayQuiz(null);
    setCurrentQuizAnswer(null);

    const engagementHint = sessionData.isCameraAnalysisEnabled ? (Math.random() > 0.5 ? "focused" : "confused") : undefined;

    const response = await getNextDynamicTutorResponse(sessionData, { query: userQuery, quizAnswer, engagementHint });
    setIsLoadingAi(false);

    if ('error' in response) {
      toast({ title: "Tutor Error", description: response.error, variant: "destructive" });
    } else {
      let newChatHistory = [...sessionData.chatHistory];
      if (userQuery) {
        newChatHistory.push({ role: 'user', text: userQuery, timestamp: new Date().toISOString() });
      }
      if (response.aiResponseToUserQuery) {
        newChatHistory.push({ role: 'ai', text: response.aiResponseToUserQuery, timestamp: new Date().toISOString() });
        speak(response.aiResponseToUserQuery);
      }
      
      setSessionData(prev => {
        const updatedSession = { ...prev!, currentStepData: response, chatHistory: newChatHistory };
        setActiveDynamicTutorSession(updatedSession);
        return updatedSession;
      });
      setChatDisplayKey(prev => prev + 1); 
      
      if (response.miniQuiz) {
        setDisplayQuiz(response.miniQuiz);
      }

      if (response.isLastStep) {
        toast({ title: "Topic Complete!", description: "You've reached the end of this tutoring topic.", duration: 5000 });
      }
    }
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    processNextStep(userInput);
    setUserInput("");
  };
  
  const handleQuizSubmit = () => {
    if (currentQuizAnswer === null || !displayQuiz) return;
    const selectedOptionIndex = parseInt(currentQuizAnswer, 10);
    const correct = selectedOptionIndex === displayQuiz.answerIndex;
    
    setIsQuizCorrect(correct);
    setShowQuizFeedback(true);
    speak(correct ? "That's correct! Well done." : `Not quite. The correct answer was ${displayQuiz.options[displayQuiz.answerIndex]}. ${displayQuiz.explanation || ''}`);
  };

  const handleNextAfterFeedbackOrQuiz = () => {
    setShowQuizFeedback(false);
    processNextStep(undefined, currentQuizAnswer !== null && displayQuiz ? displayQuiz.options[parseInt(currentQuizAnswer,10)] : undefined);
  };

  const toggleMute = () => {
    if (!sessionData) return;
    const newMuteState = !sessionData.isTtsMuted;
    setSessionData(prev => {
      const updated = { ...prev!, isTtsMuted: newMuteState };
      setActiveDynamicTutorSession(updated);
      return updated;
    });
    if (newMuteState && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    toast({ title: newMuteState ? "TTS Muted" : "TTS Unmuted" });
  };

  const toggleCameraAnalysis = () => {
     if (!sessionData) return;
    const newState = !sessionData.isCameraAnalysisEnabled;
    setSessionData(prev => {
      const updated = { ...prev!, isCameraAnalysisEnabled: newState };
      setActiveDynamicTutorSession(updated);
      return updated;
    });
     toast({ title: `Engagement Analysis ${newState ? "Enabled (Conceptual)" : "Disabled"}`});
  }

  const handleEndSession = () => {
    setActiveDynamicTutorSession(null);
    router.push('/interactive-tutor/select');
  };

  useEffect(() => { 
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [sessionData?.chatHistory]);


  if (isLoadingPage) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-72 w-full max-w-3xl mx-auto" />
          <Skeleton className="h-48 w-full max-w-3xl mx-auto" />
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><CardTitle className="text-destructive mt-2">Session Error</CardTitle></CardHeader>
            <CardContent><p>{error || "Could not load tutoring session data."}</p><Button onClick={() => router.push('/interactive-tutor/select')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection</Button></CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  const currentTeachingStep = sessionData.currentStepData;

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-8rem)] space-y-4">
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <Sparkles className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Dynamic Interactive Tutor</CardTitle>
            <CardDescription>Topic: {sessionData.documentName}</CardDescription>
          </CardHeader>
        </Card>

        <div className="flex-grow grid md:grid-cols-3 gap-4 min-h-0 overflow-hidden">
          <div className="md:col-span-2 flex flex-col min-h-0">
            <Card ref={tutorDisplayRef} className="shadow-lg flex-grow flex flex-col overflow-hidden">
              <CardContent className="p-2 md:p-4 flex-grow">
                {isLoadingAi && !currentTeachingStep && (
                    <div className="flex items-center justify-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
                )}
                {currentTeachingStep && !currentTeachingStep.aiResponseToUserQuery && (
                  <DynamicTutorDisplay
                    keyForReset={chatDisplayKey}
                    title={currentTeachingStep.title}
                    explanationSegments={currentTeachingStep.explanationSegments}
                    visualHint={currentTeachingStep.visualHint}
                    isTtsMuted={sessionData.isTtsMuted}
                    onAllSegmentsSpoken={() => {
                        if (currentTeachingStep.miniQuiz) {
                            setDisplayQuiz(currentTeachingStep.miniQuiz);
                        }
                    }}
                  />
                )}
                {currentTeachingStep && currentTeachingStep.aiResponseToUserQuery && (
                     <Card className="h-full flex items-center justify-center bg-muted/30 p-6">
                        <p className="text-lg text-foreground text-center">{currentTeachingStep.aiResponseToUserQuery}</p>
                    </Card>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 flex flex-col space-y-4 min-h-0">
            <Card className="shadow-lg flex-grow flex flex-col min-h-0">
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle className="text-xl flex items-center"><MessageSquare className="mr-2"/>Chat</CardTitle>
                <Button variant="ghost" size="icon" onClick={toggleMute} title={sessionData.isTtsMuted ? "Unmute TTS" : "Mute TTS"}>
                  {sessionData.isTtsMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </CardHeader>
              <ScrollArea className="flex-grow p-3 border-t border-b" ref={chatContainerRef}>
                <div className="space-y-3">
                  {sessionData.chatHistory.map((msg, index) => (
                    <div key={index} className={cn("flex items-end space-x-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      {msg.role === 'ai' && <Avatar className="h-7 w-7 bg-primary text-primary-foreground"><AvatarFallback>AI</AvatarFallback></Avatar>}
                      <div className={cn("p-2.5 rounded-lg max-w-[85%] shadow-sm text-sm", msg.role === 'user' ? "bg-accent text-accent-foreground" : "bg-muted")}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <p className="text-xs opacity-60 mt-1 text-right">{format(new Date(msg.timestamp), "p")}</p>
                      </div>
                      {msg.role === 'user' && <Avatar className="h-7 w-7"><AvatarFallback><User size={16}/></AvatarFallback></Avatar>}
                    </div>
                  ))}
                  {isLoadingAi && <div className="flex justify-start"><Loader2 className="h-5 w-5 animate-spin text-primary ml-10 mt-2" /></div>}
                </div>
              </ScrollArea>
              <CardFooter className="p-3">
                <div className="flex w-full items-center space-x-2">
                  <Textarea placeholder="Ask a question..." value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}} rows={1} className="min-h-[40px] max-h-[100px] resize-none" disabled={isLoadingAi || !!displayQuiz} />
                  <Button onClick={handleSendMessage} disabled={isLoadingAi || !userInput.trim() || !!displayQuiz} size="icon"><Send className="h-4 w-4" /></Button>
                </div>
              </CardFooter>
            </Card>

            {displayQuiz && !showQuizFeedback && (
              <Card className="shadow-md p-4 bg-background">
                <CardTitle className="text-lg mb-3">{displayQuiz.question}</CardTitle>
                <RadioGroup value={currentQuizAnswer || undefined} onValueChange={setCurrentQuizAnswer} className="space-y-2" disabled={isLoadingAi}>
                  {displayQuiz.options.map((opt, idx) => (
                    <Label key={idx} htmlFor={`q_opt_${idx}`} className="flex items-center p-3 border rounded-md hover:bg-muted cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                      <RadioGroupItem value={idx.toString()} id={`q_opt_${idx}`} className="mr-2" /> {opt}
                    </Label>
                  ))}
                </RadioGroup>
                <Button onClick={handleQuizSubmit} className="w-full mt-4" disabled={currentQuizAnswer === null || isLoadingAi}>Submit Answer</Button>
              </Card>
            )}

            {showQuizFeedback && displayQuiz && (
              <Alert variant={isQuizCorrect ? "default" : "destructive"} className={cn(isQuizCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-red-500 bg-red-50 dark:bg-red-900/30")}>
                {isQuizCorrect ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                <AlertTitle className={cn("font-semibold", isQuizCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>{isQuizCorrect ? "Correct!" : "Not Quite!"}</AlertTitle>
                <AlertDescription className={cn(isQuizCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                  {displayQuiz.explanation || (isQuizCorrect ? "Excellent!" : `The correct answer was: ${displayQuiz.options[displayQuiz.answerIndex]}.`)}
                </AlertDescription>
                <Button onClick={handleNextAfterFeedbackOrQuiz} className="w-full mt-3" size="sm">Next</Button>
              </Alert>
            )}
            
            <Card className="p-3 shadow-sm">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="camera-analysis-toggle" className="flex items-center space-x-2 cursor-pointer">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Engagement Analysis</span>
                    </Label>
                    <Button onClick={toggleCameraAnalysis} size="sm" variant={sessionData.isCameraAnalysisEnabled ? "secondary" : "outline"}>
                        {sessionData.isCameraAnalysisEnabled ? "Disable" : "Enable"}
                    </Button>
                 </div>
                {sessionData.isCameraAnalysisEnabled && (
                <Alert variant="default" className="mt-2 text-xs bg-primary/10 border-primary/30 text-primary-foreground">
                    <AlertCircle className="h-4 w-4 !text-primary" />
                    <AlertTitle className="!text-primary text-xs">Conceptual Feature</AlertTitle>
                    <AlertDescription className="!text-primary/90">
                    Actual camera access and facial sentiment analysis require further client & server-side integration (e.g., OpenCV). This toggle is for demonstration purposes.
                    </AlertDescription>
                </Alert>
                )}
            </Card>


          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-auto pt-4 w-full max-w-4xl mx-auto">
            <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
                <ArrowLeft className="mr-2 h-5 w-5" /> End Session
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
                 <Home className="mr-2 h-5 w-5" /> Dashboard
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}

    