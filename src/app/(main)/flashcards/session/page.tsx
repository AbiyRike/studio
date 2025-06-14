
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveFlashcardSession, FlashcardSessionData, setActiveFlashcardSession } from '@/lib/session-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Layers, ArrowLeft, ChevronLeft, ChevronRight, Home } from 'lucide-react';
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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const data = getActiveFlashcardSession();
    if (data) {
      if (data.flashcards && data.flashcards.length > 0) {
        setSessionData(data);
      } else {
        setError("No flashcards were generated for this content. Please try a different document from your knowledge base.");
        setActiveFlashcardSession(null); 
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

  const handleReturnToDashboard = () => {
    setActiveFlashcardSession(null);
    router.push('/dashboard');
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (sessionData && currentCardIndex < sessionData.flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };


  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-96 w-full max-w-xl mx-auto" /> {/* Adjusted height for flashcard */}
          <div className="flex justify-between gap-4 max-w-xl mx-auto">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData || sessionData.flashcards.length === 0) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive mt-2">Session Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load flashcard session data or no flashcards available."}</p>
              <Button onClick={() => router.push('/flashcards')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Flashcard Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  const currentCard = sessionData.flashcards[currentCardIndex];

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-8">
        <div className="text-center">
            <Layers className="mx-auto h-12 w-12 text-primary mb-2" />
            <h1 className="text-3xl font-bold font-headline">Flashcards: {sessionData.documentName}</h1>
        </div>
        
        <FlashcardDisplay 
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          currentCardNumber={currentCardIndex + 1}
          totalCards={sessionData.flashcards.length}
        />

        <div className="w-full max-w-xl mx-auto flex items-center justify-between mt-2">
          <Button onClick={handlePrevious} disabled={currentCardIndex === 0} variant="outline" size="lg" className="shadow-md">
            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
          </Button>
          <Button onClick={handleNext} disabled={currentCardIndex === sessionData.flashcards.length - 1} variant="outline" size="lg" className="shadow-md">
            Next <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full max-w-xl">
            <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
                <ArrowLeft className="mr-2 h-5 w-5" /> End Session
            </Button>
            <Button onClick={handleReturnToDashboard} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
                 <Home className="mr-2 h-5 w-5" /> Return to Dashboard
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}
