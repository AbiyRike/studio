
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface DynamicTutorDisplayProps {
  title: string;
  explanationSegments: string[];
  visualHint?: string;
  onSegmentSpoken?: (segmentIndex: number) => void;
  onAllSegmentsSpoken?: () => void;
  isTtsMuted: boolean;
  keyForReset: string | number; 
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
  const spokenSegmentsRef = useRef<boolean[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
    };
  }, []);
  
  useEffect(() => { 
    setCurrentSegmentIndex(0);
    spokenSegmentsRef.current = new Array(explanationSegments.length).fill(false);
    if (isMounted && typeof window !== 'undefined' && window.speechSynthesis) {
        if (utteranceRef.current) {
            utteranceRef.current.onend = null;
            utteranceRef.current.onerror = null;
        }
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyForReset, explanationSegments.length, isMounted]);


  const speakAndAdvance = useCallback((indexToSpeak: number) => {
    if (!isMounted || !explanationSegments[indexToSpeak]) {
      // If component unmounted or segment doesn't exist, try to gracefully complete if possible
      if (isMounted && indexToSpeak >= explanationSegments.length -1) {
        onAllSegmentsSpoken?.();
      }
      return;
    }

    const completeSegmentProcessing = () => {
      if (!isMounted) return;
      spokenSegmentsRef.current[indexToSpeak] = true;
      onSegmentSpoken?.(indexToSpeak);

      if (indexToSpeak < explanationSegments.length - 1) {
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        onAllSegmentsSpoken?.();
      }
    };

    if (isTtsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      completeSegmentProcessing();
      return;
    }

    if (utteranceRef.current) { // Clean up previous utterance's handlers
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel(); // Cancel any ongoing or pending speech

    const segmentText = explanationSegments[indexToSpeak];
    const newUtterance = new SpeechSynthesisUtterance(segmentText);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 0.9;
    newUtterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const enUsVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google US English') || v.name.includes('Microsoft David') || v.name.includes('Samantha') || v.name.includes('Alex')));
        newUtterance.voice = enUsVoice || voices.find(v => v.lang === 'en-US') || voices[0];
    }
    
    utteranceRef.current = newUtterance;

    newUtterance.onend = () => {
      if (isMounted && utteranceRef.current === newUtterance) {
        utteranceRef.current = null;
        completeSegmentProcessing();
      }
    };
    
    newUtterance.onerror = (event) => {
      if (isMounted && utteranceRef.current === newUtterance) {
        console.error('Speech synthesis error:', event.error);
        utteranceRef.current = null;
        completeSegmentProcessing(); // Still advance
      }
    };

    window.speechSynthesis.speak(newUtterance);

  }, [isMounted, isTtsMuted, explanationSegments, onSegmentSpoken, onAllSegmentsSpoken]);

  useEffect(() => {
    if (isMounted && explanationSegments && explanationSegments.length > 0 && currentSegmentIndex < explanationSegments.length) {
      if (!spokenSegmentsRef.current[currentSegmentIndex]) {
        speakAndAdvance(currentSegmentIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSegmentIndex, explanationSegments, speakAndAdvance, isMounted]); 
  // keyForReset is implicitly handled by the other useEffect that resets currentSegmentIndex and spokenSegmentsRef

  if (!isMounted) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-6 shadow-lg rounded-xl">
        <Sparkles className="w-16 h-16 text-primary animate-pulse mb-4" />
        <p className="text-muted-foreground">Preparing tutor display...</p>
      </Card>
    );
  }
  
  const motionKey = `${keyForReset}-${currentSegmentIndex}`;

  return (
    <Card className="w-full h-full flex flex-col bg-gradient-to-br from-card via-card/95 to-muted/50 p-4 md:p-6 shadow-xl rounded-xl overflow-hidden">
      <motion.div
        key={`${keyForReset}-titleanim`} // Ensure title also animates on reset
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-4 md:mb-6 text-center flex-shrink-0"
      >
        <h2 className="text-2xl md:text-3xl font-bold font-headline text-primary">{title}</h2>
      </motion.div>

      <div className="flex-grow flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-6 overflow-y-auto pr-2">
        <motion.div
          key={`${keyForReset}-visualanim`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 bg-primary/10 rounded-full flex items-center justify-center p-2 md:p-3 shadow-md"
        >
          <VisualHintIcon hint={visualHint} />
          {visualHint && <p className="sr-only">Visual hint: {visualHint}</p>}
        </motion.div>

        <div className="flex-grow space-y-2 md:space-y-3 text-left md:max-w-prose w-full">
          <AnimatePresence mode="popLayout">
            {explanationSegments.map((segment, index) =>
              index === currentSegmentIndex ? ( // Only render the current segment for animation
                <motion.p
                  key={motionKey} // Use a key that changes for each segment
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.6, ease: [0.42, 0, 0.58, 1] }}
                  className="text-base md:text-lg text-foreground/90 leading-relaxed p-3 bg-background/70 rounded-md shadow-sm"
                >
                  {segment}
                </motion.p>
              ) : index < currentSegmentIndex ? ( // Render previously spoken segments statically
                 <p key={`${keyForReset}-segment-${index}-static`}
                    className="text-base md:text-lg text-foreground/70 leading-relaxed p-3 bg-transparent rounded-md"
                  >
                    {segment}
                  </p>
              )
              : null
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
};
