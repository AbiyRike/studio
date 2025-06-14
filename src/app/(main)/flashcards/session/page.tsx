
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveFlashcardSession, FlashcardSessionData, setActiveFlashcardSession } from '@/lib/session-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Layers, ArrowLeft } from 'lucide-react';
import { FlashcardDisplay } from '@/components/flashcard-display';
import { redirect } from 'next/navigation';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

export default function FlashcardSessionPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<FlashcardSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = getActiveFlashcardSession();
    if (data) {
      if (data.flashcards && data.flashcards.length > 0) {
        setSessionData(data);
      } else {
        setError("No flashcards were generated for this content. Please try a different document from your knowledge base.");
        setActiveFlashcardSession(null); // Clear invalid session
      }
    } else {
      setError("No active flashcard session found. Please start by selecting content from your knowledge base.");
    }
    setIsLoading(false);
  }, []);

  const handleEndSession = () => {
    setActiveFlashcardSession(null);
    router.push('/flashcards');
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full max-w-lg mx-auto" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
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
              <p>{error || "Could not load flashcard session data."}</p>
              <Button onClick={() => router.push('/flashcards')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Flashcard Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-8">
        <div className="text-center">
            <Layers className="mx-auto h-12 w-12 text-primary mb-2" />
            <h1 className="text-3xl font-bold font-headline">Flashcards: {sessionData.documentName}</h1>
        </div>
        
        <FlashcardDisplay flashcards={sessionData.flashcards} />

        <Button onClick={handleEndSession} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" /> End Session & Return
        </Button>
      </div>
    </ClientAuthGuard>
  );
}
