
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveQuiz } from '@/components/interactive-quiz';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { getActiveTutorSession, TutorSessionData } from '@/lib/session-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Image as ImageIcon, Volume2, ChevronRight, ChevronLeft, CheckSquare } from 'lucide-react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { AvatarPlaceholder } from '@/components/avatar-placeholder'; // Import AvatarPlaceholder

// This client-side component will handle the auth check and redirect if necessary
const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

export default function TutorPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<TutorSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summaryChunks, setSummaryChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isExplaining, setIsExplaining] = useState(true); // Start in explanation mode
  const [isSpeaking, setIsSpeaking] = useState(false);

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    const data = getActiveTutorSession();
    if (data) {
      setSessionData(data);
      if (data.summary) {
        const chunks = data.summary.split(/\n\s*\n/).filter(chunk => chunk.trim() !== ''); // Split by one or more newlines
        setSummaryChunks(chunks.length > 0 ? chunks : [data.summary]); // Ensure at least one chunk if summary exists
      } else {
        setSummaryChunks(["No summary was generated for this content."]);
      }
    } else {
      setError("No active session data found. Please start a new session from the dashboard.");
    }
    setIsLoading(false);
  }, []);

  const handleSpeak = useCallback(() => {
    if (!synth || summaryChunks.length === 0) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(summaryChunks[currentChunkIndex]);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false); // Handle potential errors
    synth.speak(utterance);
  }, [synth, summaryChunks, currentChunkIndex, isSpeaking]);

  useEffect(() => {
    // Cancel speech if component unmounts or chunk changes
    return () => {
      if (synth && isSpeaking) {
        synth.cancel();
        setIsSpeaking(false);
      }
    };
  }, [synth, currentChunkIndex, isSpeaking]);

  const handleNextChunk = () => {
    if (synth && isSpeaking) synth.cancel();
    if (currentChunkIndex < summaryChunks.length - 1) {
      setCurrentChunkIndex(prev => prev + 1);
    } else {
      setIsExplaining(false); // Finished explaining, move to quiz
    }
  };

  const handlePrevChunk = () => {
    if (synth && isSpeaking) synth.cancel();
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive">Session Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load session data."}</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 space-y-8">
        <AvatarPlaceholder 
          message={isExplaining ? (isSpeaking ? "Listen carefully..." : "Let's break this down...") : "Ready for a quick check?"} 
          subMessage={isExplaining ? `Topic: ${sessionData.documentName}` : undefined}
        />

        {sessionData.mediaDataUri && (
            <Card className="shadow-md mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center">
                  <ImageIcon className="mr-2 h-6 w-6 text-primary" /> Associated Image
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Image 
                  src={sessionData.mediaDataUri} 
                  alt="Associated media" 
                  width={400} 
                  height={300} 
                  className="rounded-md object-contain max-h-[300px]"
                />
              </CardContent>
            </Card>
          )}

        {isExplaining && summaryChunks.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-headline">Explanation</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Part {currentChunkIndex + 1} of {summaryChunks.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed min-h-[100px] text-lg">
                {summaryChunks[currentChunkIndex]}
              </p>
              <Button onClick={handleSpeak} variant="outline" disabled={!synth}>
                <Volume2 className="mr-2 h-5 w-5" /> {isSpeaking ? "Stop Speaking" : "Speak Text"}
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button onClick={handlePrevChunk} disabled={currentChunkIndex === 0} variant="outline">
                <ChevronLeft className="mr-2 h-5 w-5" /> Previous
              </Button>
              {currentChunkIndex < summaryChunks.length - 1 ? (
                <Button onClick={handleNextChunk}>
                  Next <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button onClick={() => setIsExplaining(false)} variant="default" className="bg-green-600 hover:bg-green-700">
                  Start Quiz <CheckSquare className="ml-2 h-5 w-5" />
                </Button>
              )}
            </CardFooter>
          </Card>
        )}

        {!isExplaining && (
          <InteractiveQuiz sessionData={sessionData} />
        )}
      </div>
    </ClientAuthGuard>
  );
}
