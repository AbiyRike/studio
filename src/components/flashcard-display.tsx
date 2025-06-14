
"use client";

import { useState } from 'react';
import type { Flashcard } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashcardDisplayProps {
  flashcards: Flashcard[];
}

export function FlashcardDisplay({ flashcards }: FlashcardDisplayProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <Card className="w-full max-w-lg mx-auto text-center shadow-lg">
        <CardContent className="p-10">
          <p className="text-muted-foreground">No flashcards available for this session.</p>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentCardIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentCardIndex < flashcards.length - 1) {
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

  // Basic styling for the card flip - can be enhanced with more CSS
  const cardBaseStyle = "w-full h-80 rounded-xl shadow-xl cursor-pointer transition-transform duration-700 ease-in-out flex items-center justify-center p-6 text-center text-xl font-semibold";
  const cardFrontStyle = "bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground";
  const cardBackStyle = "bg-gradient-to-br from-secondary/80 to-background/80 text-foreground transform rotate-y-180";
  
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="perspective-1000">
        <div
          className={cn("relative preserve-3d", isFlipped && "rotate-y-180")}
          style={{ transition: 'transform 0.7s', transformStyle: 'preserve-3d' }}
          onClick={handleFlip}
        >
          <div className={cn(cardBaseStyle, cardFrontStyle, "backface-hidden absolute inset-0")}>
            <p>{currentCard.term}</p>
          </div>
          <div className={cn(cardBaseStyle, cardBackStyle, "backface-hidden absolute inset-0")}>
            <p>{currentCard.definition}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button onClick={handlePrevious} disabled={currentCardIndex === 0} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-5 w-5" /> Previous
        </Button>
        <p className="text-muted-foreground">
          Card {currentCardIndex + 1} of {flashcards.length}
        </p>
        <Button onClick={handleNext} disabled={currentCardIndex === flashcards.length - 1} variant="outline" size="lg">
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
       <div className="flex justify-center">
         <Button onClick={handleFlip} variant="ghost" className="text-muted-foreground">
            <RefreshCcw className="mr-2 h-4 w-4" /> Flip Card
        </Button>
       </div>
       <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
