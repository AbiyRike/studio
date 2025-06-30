"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { getActiveCodeWizSession, setActiveCodeWizSession, type ActiveCodeWizSessionData } from '@/lib/session-store';
import { analyzeCodeAction, explainCodeAction, optimizeCodeAction, type AnalyzeCodeActionInput, type ExplainCodeActionInput, type OptimizeCodeActionInput } from '@/app/actions';
import { Wand2, Loader2, Lightbulb, Zap, Sparkles, AlertTriangle, Volume2, VolumeX, ArrowLeft, Home, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function CodeWizSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveCodeWizSessionData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        } else {
          window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
        }
      };
      loadVoices();
    }
    
    const data = getActiveCodeWizSession();
    if (data) {
      setSessionData(data);
    } else {
      setError("No active Code Wiz session found. Please start a new session.");
      setActiveCodeWizSession(null);
    }
    setIsLoadingPage(false);
    
    return () => {
      setIsMounted(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isMounted || !sessionData || sessionData.isTtsMuted || !voicesLoaded || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 0.9;
    newUtterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha') || v.name.includes('Alex'))
      );
      newUtterance.voice = preferredVoice || voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    utteranceRef.current = newUtterance;
    
    try {
      window.speechSynthesis.speak(newUtterance);
    } catch (error) {
      console.error('Error speaking utterance:', error);
    }
  }, [isMounted, sessionData, voicesLoaded]);

  const updateSession = (updates: Partial<ActiveCodeWizSessionData>) => {
    setSessionData(prev => {
      if (!prev) return null;
      const newState = { ...prev, ...updates };
      setActiveCodeWizSession(newState);
      return newState;
    });
  };

  const handleOperation = async (operation: 'analyze' | 'explain' | 'optimize') => {
    if (!sessionData || sessionData.isLoadingAi) return;

    updateSession({ isLoadingAi: true, currentOperation: operation, analysis: undefined, explanation: undefined, optimizedCode: undefined, optimizationSummary: undefined });

    const input = { code: sessionData.originalCode, languageHint: sessionData.languageHint };
    let result;
    let textToSpeak = "";

    try {
      if (operation === 'analyze') {
        result = await analyzeCodeAction(input as AnalyzeCodeActionInput);
        if (!('error' in result) && result.analysis) {
          updateSession({ analysis: result.analysis });
          textToSpeak = result.analysis;
        }
      } else if (operation === 'explain') {
        result = await explainCodeAction(input as ExplainCodeActionInput);
        if (!('error' in result) && result.explanation) {
          updateSession({ explanation: result.explanation });
          textToSpeak = result.explanation;
        }
      } else if (operation === 'optimize') {
        result = await optimizeCodeAction(input as OptimizeCodeActionInput);
        if (!('error' in result) && result.optimizationSummary) {
          updateSession({ optimizedCode: result.optimizedCode, optimizationSummary: result.optimizationSummary });
          textToSpeak = result.optimizationSummary;
        }
      }

      if (result && 'error' in result) {
        toast({ title: `Error during ${operation}`, description: result.error, variant: "destructive" });
      } else if (textToSpeak) {
        speak(textToSpeak);
      }
    } catch (e: any) {
      toast({ title: `Error during ${operation}`, description: e.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      updateSession({ isLoadingAi: false, currentOperation: null });
    }
  };

  const toggleMute = () => {
    if (!sessionData) return;
    const newMuteState = !sessionData.isTtsMuted;
    updateSession({ isTtsMuted: newMuteState });
    if (newMuteState && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    toast({ title: newMuteState ? "TTS Muted" : "TTS Unmuted" });
  };
  
  const copyToClipboard = (textToCopy?: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Copied!", description: "Content copied to clipboard." }))
      .catch(err => toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" }));
  };

  const handleEndSession = () => {
    setActiveCodeWizSession(null);
    router.push('/code-wiz');
  };

  if (isLoadingPage) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive mt-2">Session Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load Code Wiz session data."}</p>
              <Button onClick={() => router.push('/code-wiz')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Code Input
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  let resultTitle = "";
  let resultTextContent: string | undefined = "";
  let codeToDisplayInResult: string | undefined = "";

  if (sessionData.analysis) {
    resultTitle = "Code Analysis";
    resultTextContent = sessionData.analysis;
  } else if (sessionData.explanation) {
    resultTitle = "Code Explanation";
    resultTextContent = sessionData.explanation;
  } else if (sessionData.optimizationSummary) {
    resultTitle = "Code Optimization Suggestion";
    resultTextContent = sessionData.optimizationSummary;
    codeToDisplayInResult = sessionData.optimizedCode;
  }

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-6xl mx-auto shadow-xl mb-6">
          <CardHeader className="text-center">
            <Wand2 className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Code Wiz Session</CardTitle>
            <CardDescription>
              Interacting with your {sessionData.languageHint ? `${sessionData.languageHint} ` : ''}code.
              Language Hint: {sessionData.languageHint || "Not specified"}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 flex-grow min-h-0">
          {/* Original Code Panel */}
          <Card className="flex flex-col shadow-lg">
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle className="text-xl">Original Code</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(sessionData.originalCode)} title="Copy original code">
                <Copy className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden pt-2 px-0 pb-0">
              <ScrollArea className="h-full p-4">
                <pre className="text-sm whitespace-pre-wrap break-all font-code bg-muted/50 p-3 rounded-md">
                  {sessionData.originalCode}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* AI Output Panel */}
          <Card className="flex flex-col shadow-lg">
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle className="text-xl">{resultTitle || "AI Output"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={toggleMute} title={sessionData.isTtsMuted ? "Unmute TTS" : "Mute TTS"}>
                {sessionData.isTtsMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden pt-2 px-0 pb-0">
              <ScrollArea className="h-full p-4">
                {sessionData.isLoadingAi && sessionData.currentOperation && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p>Code Wiz is {sessionData.currentOperation}ing your code...</p>
                  </div>
                )}
                {!sessionData.isLoadingAi && !resultTextContent && !codeToDisplayInResult && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Sparkles className="h-10 w-10 text-primary mb-3" />
                    <p>Select an action (Analyze, Explain, Optimize) to get started.</p>
                  </div>
                )}
                {resultTextContent && (
                  <div className="prose dark:prose-invert max-w-none text-sm mb-4 whitespace-pre-wrap">
                    {resultTextContent}
                  </div>
                )}
                {codeToDisplayInResult && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-md">Optimized Code Suggestion:</h4>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(codeToDisplayInResult)} title="Copy optimized code">
                        <Copy className="mr-1 h-4 w-4" /> Copy
                      </Button>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap break-all font-code bg-muted/50 p-3 rounded-md">
                      {codeToDisplayInResult}
                    </pre>
                  </>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 mt-6 pt-6 border-t">
          <Button onClick={() => handleOperation('analyze')} disabled={sessionData.isLoadingAi} size="lg" className="w-full sm:w-auto shadow-md bg-blue-600 hover:bg-blue-700">
            {sessionData.isLoadingAi && sessionData.currentOperation === 'analyze' ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Lightbulb className="mr-2 h-5 w-5" />}
            Analyze Code
          </Button>
          <Button onClick={() => handleOperation('explain')} disabled={sessionData.isLoadingAi} size="lg" className="w-full sm:w-auto shadow-md bg-green-600 hover:bg-green-700">
            {sessionData.isLoadingAi && sessionData.currentOperation === 'explain' ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Sparkles className="mr-2 h-5 w-5" />}
            Explain Code
          </Button>
          <Button onClick={() => handleOperation('optimize')} disabled={sessionData.isLoadingAi} size="lg" className="w-full sm:w-auto shadow-md bg-purple-600 hover:bg-purple-700">
            {sessionData.isLoadingAi && sessionData.currentOperation === 'optimize' ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Zap className="mr-2 h-5 w-5" />}
            Optimize Code
          </Button>
        </CardFooter>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4 w-full max-w-6xl mx-auto">
          <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
            <ArrowLeft className="mr-2 h-5 w-5" /> New Code Wiz Session
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
            <Home className="mr-2 h-5 w-5" /> Dashboard
          </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}