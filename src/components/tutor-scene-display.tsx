
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette, FileText, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, AlertCircle, HelpCircle, CheckCircle, XCircle, DivideCircle
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TutorSceneData {
  title: string;
  description: string; 
  iconName: string; 
  bgColorClass: string; 
  textColorClass: string; 
  id: string; 
}

interface TutorSceneDisplayProps {
  scene: TutorSceneData | null;
  isTtsMuted: boolean;
  isPaused: boolean; // New prop
  onSpeechEnd?: (isCompleted: boolean) => void; // Callback when all speech for the current scene ends, or if paused
  key: string | number; // Ensure component re-mounts or re-keys properly for new scenes
}

const iconMap: { [key: string]: React.ComponentType<LucideProps> } = {
  Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette, FileText, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, AlertCircle, HelpCircle, CheckCircle, XCircle, DivideCircle,
  Default: Sparkles, 
};

export const TutorSceneDisplay: React.FC<TutorSceneDisplayProps> = ({
  scene,
  isTtsMuted,
  isPaused, // Consuming new prop
  onSpeechEnd,
  key,
}) => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentSegmentIndexRef = useRef(0);
  const segmentsRef = useRef<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [displayText, setDisplayText] = useState(""); 
  const sceneIdRef = useRef<string | null>(null); // To track current scene for callbacks

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices(); 
      // Initial cleanup in case of fast re-mounts
      window.speechSynthesis.cancel();
      if (utteranceRef.current) {
          utteranceRef.current.onend = null;
          utteranceRef.current.onerror = null;
          utteranceRef.current = null;
      }
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

  const speakNextSegment = useCallback(() => {
    if (!isMounted || !scene || sceneIdRef.current !== scene.id) {
        // Scene changed or component unmounted, stop processing
        if (isMounted && utteranceRef.current) window.speechSynthesis.cancel();
        return;
    }
    
    if (isPaused) {
        if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
        }
        // Don't advance segments if paused
        return;
    } else {
         if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            // If it was paused mid-segment, let it finish
            // If it was paused between segments, it will pick up here
        }
    }

    if (currentSegmentIndexRef.current >= segmentsRef.current.length) {
      onSpeechEnd?.(true); // All segments spoken for this scene
      return;
    }

    const segmentToSpeak = segmentsRef.current[currentSegmentIndexRef.current];
    // Accumulate display text
    setDisplayText(prev => prev + (prev ? " " : "") + segmentToSpeak);


    if (isTtsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      const simulatedDuration = segmentToSpeak.length * 50; 
      setTimeout(() => {
        if (isMounted && sceneIdRef.current === scene.id && !isPaused) { 
            currentSegmentIndexRef.current++;
            speakNextSegment();
        }
      }, simulatedDuration);
      return;
    }
    
    // Ensure any previous utterance's handlers are cleared before starting a new one
    if (utteranceRef.current && utteranceRef.current.onend) {
        utteranceRef.current.onend = null; 
        utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel(); // Cancel any currently speaking/pending utterance

    const newUtterance = new SpeechSynthesisUtterance(segmentToSpeak);
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
      if (isMounted && utteranceRef.current === newUtterance && sceneIdRef.current === scene.id && !isPaused) {
        utteranceRef.current = null;
        currentSegmentIndexRef.current++;
        speakNextSegment();
      }
    };
    newUtterance.onerror = (event) => {
      if (isMounted && utteranceRef.current === newUtterance && sceneIdRef.current === scene.id && !isPaused) {
        console.error('Speech synthesis error:', event.error);
        utteranceRef.current = null;
        currentSegmentIndexRef.current++; 
        speakNextSegment();
      }
    };
    window.speechSynthesis.speak(newUtterance);
  }, [isMounted, scene, isTtsMuted, onSpeechEnd, isPaused]);

  useEffect(() => {
    if (isMounted && scene) {
      sceneIdRef.current = scene.id; // Track the ID of the current scene
      // Split title and description into segments
      const titleSegment = scene.title ? [scene.title] : [];
      const descriptionSegments = scene.description ? scene.description.split(/[.!?]+\s(?![a-z])/) // Split by sentence enders, but not for e.g. in "Mr. Know"
                                      .map(s => s.trim()).filter(s => s.length > 0) : [];
      segmentsRef.current = [...titleSegment, ...descriptionSegments];
      currentSegmentIndexRef.current = 0;
      setDisplayText(""); 

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
         if (utteranceRef.current) {
          utteranceRef.current.onend = null; 
          utteranceRef.current.onerror = null;
          utteranceRef.current = null;
        }
      }
      // Delay slightly to allow DOM to update with new scene key before starting speech
      const startTimer = setTimeout(() => {
        if (isMounted && scene && sceneIdRef.current === scene.id && !isPaused) { 
             speakNextSegment();
        }
      }, 150); 
      return () => clearTimeout(startTimer);
    } else if (!scene && isMounted) {
        // If scene becomes null, cancel any speech
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        sceneIdRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isMounted]); // Removed speakNextSegment to avoid loop, it's stable due to useCallback
  
  // Effect to handle pause/resume
  useEffect(() => {
      if (!isMounted || !scene || sceneIdRef.current !== scene.id) return;

      if (isPaused) {
          if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
          }
      } else { // Resuming
          if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
          } else if (typeof window !== 'undefined' && !window.speechSynthesis.speaking && currentSegmentIndexRef.current < segmentsRef.current.length) {
              // If it was paused between segments, or if speech ended while paused, restart current/next segment
              speakNextSegment();
          }
      }
  }, [isPaused, isMounted, scene, speakNextSegment]);


  if (!scene) {
    return (
        <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl p-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  const SceneIcon = iconMap[scene.iconName] || iconMap.Default;

  return (
    <motion.div
      key={key} 
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -50 }}
      transition={{ duration: 0.7, ease: [0.42, 0, 0.58, 1] }}
      className={cn(
        "w-full h-full rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-hidden",
        scene.bgColorClass,
        scene.textColorClass
      )}
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 150, damping: 15 }}
        className="mb-4 md:mb-6"
      >
        <SceneIcon className="w-12 h-12 md:w-16 md:h-16" />
      </motion.div>

      <motion.h3
        className="text-xl md:text-3xl font-bold mb-2 md:mb-4"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      >
        {scene.title}
      </motion.h3>

      <motion.div
        className="text-sm md:text-lg max-w-md md:max-w-lg leading-relaxed"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={displayText} 
            initial={{ opacity: 0.7 }} // Start slightly visible to avoid harsh pop
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.7 }}
            transition={{ duration: 0.3 }}
            className="whitespace-pre-line" // Allow newlines in description to render
          >
            {displayText || "..."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

