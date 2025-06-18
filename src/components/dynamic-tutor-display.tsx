
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card'; // Keep Card for potential internal styling consistency
import { Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  if (!hint) return <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary/80" />;
  const lowerHint = hint.toLowerCase();
  if (lowerHint.includes("diagram") || lowerHint.includes("chart")) return <Palette className="w-10 h-10 md:w-12 md:h-12 text-primary/80" />;
  if (lowerHint.includes("code") || lowerHint.includes("example")) return <Zap className="w-10 h-10 md:w-12 md:h-12 text-primary/80" />;
  if (lowerHint.includes("concept") || lowerHint.includes("idea")) return <Lightbulb className="w-10 h-10 md:w-12 md:h-12 text-primary/80" />;
  if (lowerHint.includes("definition") || lowerHint.includes("term")) return <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-primary/80" />;
  return <Brain className="w-10 h-10 md:w-12 md:h-12 text-primary/80" />;
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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices(); 
    }
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
      if (isMounted && indexToSpeak >= explanationSegments.length -1 && explanationSegments.length > 0) {
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
      // Simulate speech duration for visual flow if TTS is muted
      setTimeout(completeSegmentProcessing, explanationSegments[indexToSpeak].length * 50); // Approx 50ms per char
      return;
    }
    
    if (utteranceRef.current && utteranceRef.current.onend) {
        utteranceRef.current.onend = null; 
        utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel(); 

    const segmentText = explanationSegments[indexToSpeak];
    const newUtterance = new SpeechSynthesisUtterance(segmentText);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 0.9; 
    newUtterance.pitch = 1.0; 
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const enUsVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google US English') || v.name.includes('Microsoft David') || v.name.includes('Samantha') || v.name.includes('Alex') || v.name.includes('Google UK English Female')));
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
        completeSegmentProcessing(); 
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
  
  const motionKeyBase = `${keyForReset}`;

  return (
    <motion.div
      key={motionKeyBase} // Main animation key for the whole "slide"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.42, 0, 0.58, 1] }}
      className="w-full h-full flex flex-col bg-gradient-to-br from-card via-card/95 to-muted/30 p-4 md:p-6 shadow-xl rounded-xl overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        className="mb-4 text-center flex-shrink-0"
      >
        <h2 className="text-xl md:text-2xl font-bold font-headline text-primary">{title}</h2>
      </motion.div>

      <div className="flex-grow flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 min-h-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center p-2 shadow-md"
        >
          <VisualHintIcon hint={visualHint} />
          {visualHint && <p className="sr-only">Visual hint: {visualHint}</p>}
        </motion.div>

        <ScrollArea className="flex-grow w-full md:max-w-prose min-h-0 bg-background/50 p-3 rounded-lg shadow-inner">
          <div className="space-y-2 md:space-y-3">
            <AnimatePresence mode="popLayout">
              {explanationSegments.map((segment, index) =>
                index <= currentSegmentIndex ? ( 
                  <motion.p
                    key={`${motionKeyBase}-segment-${index}`} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.5, ease: "circOut", delay: index === currentSegmentIndex ? 0.1 : 0 }}
                    className={cn(
                        "text-sm md:text-base text-foreground/90 leading-relaxed p-2.5 rounded-md",
                        index === currentSegmentIndex ? "bg-primary/10 ring-2 ring-primary/50" : "bg-transparent text-foreground/70"
                    )}
                  >
                    {segment}
                  </motion.p>
                ) : null
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
};
