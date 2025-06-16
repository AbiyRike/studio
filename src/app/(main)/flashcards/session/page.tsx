
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveFlashcardSession, setActiveFlashcardSession, type FlashcardSessionData } from '@/lib/session-store';
import { generateMoreFlashcards, type AppFlashcard } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Layers, ArrowLeft, ChevronLeft, ChevronRight, Home, Loader2, PlusCircle } from 'lucide-react';
import { FlashcardDisplay } from '@/components/flashcard-display';
import { redirect } from 'next/navigation';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

const FLASHCARDS_TO_FETCH_PER_BATCH = 5;

export default function FlashcardSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<FlashcardSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [noMoreNewFlashcards, setNoMoreNewFlashcards] = useState(false);


  useEffect(() => {
    const data = getActiveFlashcardSession();
    if (data) {
      if (data.flashcards && data.flashcards.length > 0) {
        setSessionData(data);
      } else {
        // If initial load has no flashcards, try to fetch them once.
        // This handles cases where KB item was selected but initial generation failed or was empty.
        if (data.documentName && (data.documentContent || data.mediaDataUri)) {
          setIsFetchingMore(true); // Use this state to show loading
          generateMoreFlashcards({
            documentName: data.documentName,
            documentContent: data.documentContent,
            mediaDataUri: data.mediaDataUri,
            allPreviousTerms: [],
            count: FLASHCARDS_TO_FETCH_PER_BATCH * 2, // Fetch a bit more initially
          }).then(result => {
            setIsFetchingMore(false);
            if ('error' in result) {
              setError(result.error || "Failed to fetch initial flashcards.");
              setActiveFlashcardSession(null);
            } else if (result.flashcards.length === 0) {
              setError("No flashcards could be generated for this content. Please try a different document.");
              setNoMoreNewFlashcards(true);
              setActiveFlashcardSession(null); // Clear invalid session
            } else {
              const updatedSession = { ...data, flashcards: result.flashcards };
              setSessionData(updatedSession);
              setActiveFlashcardSession(updatedSession);
            }
          });
        } else {
           setError("No flashcards available for this session and content is missing to generate them.");
           setActiveFlashcardSession(null);
        }
      }
    } else {
      setError("No active flashcard session found. Please start by selecting content.");
    }
    setIsLoading(false); // Initial page structure loading is done
  }, []); // Run only on mount

  const fetchMoreFlashcards = useCallback(async () => {
    if (!sessionData || isFetchingMore || noMoreNewFlashcards) return;

    setIsFetchingMore(true);
    toast({ title: "Fetching More Flashcards...", description: "Please wait a moment." });

    const previousTerms = sessionData.flashcards.map(fc => fc.term);
    const result = await generateMoreFlashcards({
      documentName: sessionData.documentName,
      documentContent: sessionData.documentContent,
      mediaDataUri: sessionData.mediaDataUri,
      allPreviousTerms: previousTerms,
      count: FLASHCARDS_TO_FETCH_PER_BATCH,
    });

    setIsFetchingMore(false);

    if ('error' in result) {
      toast({ title: "Error Fetching More Flashcards", description: result.error, variant: "destructive" });
      // Optionally setNoMoreNewFlashcards(true) if error indicates no more can be fetched
    } else if (result.flashcards.length > 0) {
      setSessionData(prev => {
        if (!prev) return null;
        const updatedSession = { ...prev, flashcards: [...prev.flashcards, ...result.flashcards] };
        setActiveFlashcardSession(updatedSession);
        return updatedSession;
      });
      toast({ title: "More Flashcards Loaded!", description: `${result.flashcards.length} new cards added.` });
    } else {
      toast({ title: "No More New Flashcards", description: "You've reviewed all available unique flashcards for this content!" });
      setNoMoreNewFlashcards(true);
    }
  }, [sessionData, isFetchingMore, noMoreNewFlashcards, toast]);

  useEffect(() => {
    if (sessionData && sessionData.flashcards.length > 0 && 
        currentCardIndex >= sessionData.flashcards.length - 3 && 
        !isFetchingMore && !noMoreNewFlashcards) {
      fetchMoreFlashcards();
    }
  }, [currentCardIndex, sessionData, isFetchingMore, noMoreNewFlashcards, fetchMoreFlashcards]);


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
    } else if (sessionData && currentCardIndex === sessionData.flashcards.length - 1 && !noMoreNewFlashcards && !isFetchingMore) {
      // At the last card of current batch, but more might be available/fetching
      fetchMoreFlashcards(); // Attempt to fetch more if not already
    } else if (sessionData && currentCardIndex === sessionData.flashcards.length - 1 && (noMoreNewFlashcards || isFetchingMore)) {
      // At the very last card and no more are coming or currently fetching
      toast({ title: "End of Deck", description: "You've reached the end of the flashcards!" });
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };


  if (isLoading) { // This is for the initial component mount loading
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-96 w-full max-w-xl mx-auto" />
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

  if (error || !sessionData) { // Handles errors or if sessionData is definitively null after initial checks
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive mt-2">Session Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load flashcard session data. Please try starting a new session."}</p>
              <Button onClick={() => router.push('/flashcards')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  // If sessionData exists but flashcards array is empty (e.g., after initial fetch attempt)
  if (sessionData && sessionData.flashcards.length === 0 && !isFetchingMore) {
     return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="text-muted-foreground mt-2">No Flashcards</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "No flashcards could be generated for this content, or the session is empty."}</p>
              <Button onClick={() => router.push('/flashcards')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Try Different Content
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }

  const currentCard = sessionData.flashcards[currentCardIndex];
  const isLastCardOverall = currentCardIndex === sessionData.flashcards.length - 1 && noMoreNewFlashcards;

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-8">
        <div className="text-center">
            <Layers className="mx-auto h-12 w-12 text-primary mb-2" />
            <h1 className="text-3xl font-bold font-headline">Flashcards: {sessionData.documentName}</h1>
        </div>
        
        {currentCard ? (
            <FlashcardDisplay 
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              currentCardNumber={currentCardIndex + 1}
              totalCards={sessionData.flashcards.length}
            />
        ) : isFetchingMore ? (
            <Card className="w-full max-w-lg mx-auto text-center shadow-xl bg-muted/50 perspective-1000 h-96 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading more flashcards...</p>
            </Card>
        ) : (
             <Card className="w-full max-w-lg mx-auto text-center shadow-xl bg-muted/50 perspective-1000 h-96 flex flex-col items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive-foreground">Error loading current card.</p>
            </Card>
        )
        }


        <div className="w-full max-w-xl mx-auto flex items-center justify-between mt-2">
          <Button onClick={handlePrevious} disabled={currentCardIndex === 0 || isFetchingMore} variant="outline" size="lg" className="shadow-md">
            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={isFetchingMore || (currentCardIndex === sessionData.flashcards.length - 1 && noMoreNewFlashcards)} 
            variant="outline" 
            size="lg" 
            className="shadow-md"
          >
            {isLastCardOverall ? "End of Deck" : "Next"}
            {!isLastCardOverall && <ChevronRight className="ml-2 h-5 w-5" />}
          </Button>
        </div>

        {isFetchingMore && (
          <div className="text-center text-muted-foreground flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading more flashcards...
          </div>
        )}
        
        {!isFetchingMore && !noMoreNewFlashcards && currentCardIndex >= sessionData.flashcards.length -1 && (
            <Button onClick={fetchMoreFlashcards} variant="ghost" className="text-primary hover:text-primary/80">
                <PlusCircle className="mr-2 h-4 w-4" /> Load More Flashcards
            </Button>
        )}


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

