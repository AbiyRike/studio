
"use client";

import type { Flashcard } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashcardDisplayProps {
  card: Flashcard | undefined;
  isFlipped: boolean;
  onFlip: () => void;
  currentCardNumber: number;
  totalCards: number;
}

export function FlashcardDisplay({ card, isFlipped, onFlip, currentCardNumber, totalCards }: FlashcardDisplayProps) {
  if (!card) {
    return (
      <Card className="w-full max-w-lg mx-auto text-center shadow-xl bg-muted/50 perspective-1000 h-96 flex items-center justify-center">
        <CardContent className="p-10">
          <p className="text-muted-foreground">Loading flashcard...</p>
        </CardContent>
      </Card>
    );
  }

  const cardBaseStyle = "w-full h-96 rounded-xl shadow-2xl cursor-pointer transition-transform duration-700 ease-in-out flex items-center justify-center p-8 text-center text-2xl font-semibold leading-relaxed";
  const cardFrontStyle = "bg-gradient-to-br from-primary via-primary/80 to-accent text-primary-foreground";
  const cardBackStyle = "bg-gradient-to-br from-secondary via-secondary/90 to-background text-foreground transform rotate-y-180";
  
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="perspective-1000">
        <div
          className={cn("relative preserve-3d w-full h-96", isFlipped && "rotate-y-180")}
          style={{ transition: 'transform 0.7s', transformStyle: 'preserve-3d' }}
          onClick={onFlip}
        >
          <div className={cn(cardBaseStyle, cardFrontStyle, "backface-hidden absolute inset-0")}>
            <p>{card.term}</p>
          </div>
          <div className={cn(cardBaseStyle, cardBackStyle, "backface-hidden absolute inset-0")}>
            <p>{card.definition}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <Button onClick={onFlip} variant="outline" className="flex-grow sm:flex-grow-0">
            <RefreshCcw className="mr-2 h-4 w-4" /> Flip Card
        </Button>
        <p className="text-muted-foreground text-sm font-medium">
          Card {currentCardNumber} of {totalCards}
        </p>
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
