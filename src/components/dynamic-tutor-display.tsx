"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette } from 'lucide-react'; // Example icons
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicTutorDisplayProps {
  title: string;
  explanationSegments: string[];
  visualHint?: string;
  onSegmentSpoken?: (segmentIndex: number) => void; // Callback when a segment finishes speaking
  onAllSegmentsSpoken?: () => void; // Callback when all segments are done
  isTtsMuted: boolean;
  keyForReset: string | number; // To force re-render and restart animation
}

const VisualHintIcon = ({ hint }: { hint?: string }) => {
  if (!hint) return <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary/70" />;
  const lowerHint = hint.toLowerCase();
  if (lowerHint.includes("diagram") || lowerHint.includes("chart")) return <Palette className="w-8 h-8 md:w-10 md:h-10 text-primary/70" />;
  if (lowerHint.includes("code") || lowerHint.includes("example")) return <Zap className="w-8 h-8 md:w-10 md:h-10 text-primary/70" />;
  if (lowerHint.includes("concept") || lowerHint.includes("idea")) return <Lightbulb className="w-8 h-8 md:w-10 md:h-10 text-primary/70" />;
  if (lowerHint.includes("definition") || lowerHint.includes("term")) return <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-primary/70" />;
  return <Brain className="w-8 h-8 md:w-10 md:h-10 text-primary/70" />;
};


export const DynamicTutorDisplay: React.FC<DynamicTutorDisplayProps> = ({
  title,
  explanationSegments,
  visualHint,
  onSegmentSpoken,
  onAllSegmentsSpoken,
  isTtsMuted,
  keyForReset
}) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [spokenSegments, setSpokenSegments] = useState<boolean[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      if (typeof window !== 'undefined' && window.speechSynthesis && currentSpeech) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  useEffect(() => { // Reset animation and speech state when keyForReset changes
    setCurrentSegmentIndex(0);
    setSpokenSegments(new Array(explanationSegments.length).fill(false));
    if (typeof window !== 'undefined' && window.speechSynthesis && currentSpeech) {
      window.speechSynthesis.cancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyForReset, explanationSegments.length]);


  const speakSegment = useCallback((segmentText: string, segmentIndex: number) => {
    if (!isMounted || isTtsMuted || typeof window === 'undefined' || !window.speechSynthesis || spokenSegments[segmentIndex]) {
      if (spokenSegments[segmentIndex] && segmentIndex < explanationSegments.length -1 && !isTtsMuted) {
         // If already spoken and not last segment, try to move to next.
         // This might need adjustment if it causes rapid skipping.
         // setCurrentSegmentIndex(prev => prev + 1);
      }
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
    }

    const newUtterance = new SpeechSynthesisUtterance(segmentText);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 0.9;
    newUtterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const enUsVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google US English') || v.name.includes('Microsoft David') || v.name.includes('Samantha') || v.name.includes('Alex')));
        newUtterance.voice = enUsVoice || voices.find(v => v.lang === 'en-US') || voices[0];
    }
    
    setCurrentSpeech(newUtterance);

    newUtterance.onend = () => {
      if (!isMounted) return;
      setSpokenSegments(prev => {
        const newSpoken = [...prev];
        newSpoken[segmentIndex] = true;
        return newSpoken;
      });
      onSegmentSpoken?.(segmentIndex);
      if (segmentIndex < explanationSegments.length - 1) {
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        onAllSegmentsSpoken?.();
      }
    };
    
    newUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      // Try to advance state even if TTS fails for a segment
      if (!isMounted) return;
       setSpokenSegments(prev => {
        const newSpoken = [...prev];
        newSpoken[segmentIndex] = true; // Mark as "handled"
        return newSpoken;
      });
      if (segmentIndex < explanationSegments.length - 1) {
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        onAllSegmentsSpoken?.();
      }
    };

    window.speechSynthesis.speak(newUtterance);
  }, [isMounted, isTtsMuted, onSegmentSpoken, onAllSegmentsSpoken, explanationSegments.length, spokenSegments, currentSpeech]);

  useEffect(() => {
    if (explanationSegments && explanationSegments.length > 0 && currentSegmentIndex < explanationSegments.length) {
      speakSegment(explanationSegments[currentSegmentIndex], currentSegmentIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSegmentIndex, explanationSegments, speakSegment, keyForReset]); // keyForReset to re-trigger on new content

  if (!isMounted) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-6 shadow-lg rounded-xl">
        <Sparkles className="w-16 h-16 text-primary animate-pulse mb-4" />
        <p className="text-muted-foreground">Preparing tutor display...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col bg-gradient-to-br from-card via-card/95 to-muted/50 p-4 md:p-6 shadow-xl rounded-xl overflow-hidden">
      <motion.div
        key={`${keyForReset}-title`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-4 md:mb-6 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold font-headline text-primary">{title}</h2>
      </motion.div>

      <div className="flex-grow flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-6 overflow-y-auto pr-2">
        <motion.div
          key={`${keyForReset}-visual`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 bg-primary/10 rounded-full flex items-center justify-center p-2 md:p-3 shadow-md"
        >
          <VisualHintIcon hint={visualHint} />
          {visualHint && <p className="sr-only">Visual hint: {visualHint}</p>}
        </motion.div>

        <div className="flex-grow space-y-2 md:space-y-3 text-left md:max-w-prose">
          <AnimatePresence>
            {explanationSegments.map((segment, index) =>
              index <= currentSegmentIndex ? (
                <motion.p
                  key={`${keyForReset}-segment-${index}`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.6, ease: [0.42, 0, 0.58, 1] }}
                  className="text-base md:text-lg text-foreground/90 leading-relaxed p-2 bg-background/50 rounded-md shadow-sm"
                >
                  {segment}
                </motion.p>
              ) : null
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
};