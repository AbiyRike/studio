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
  description: string; // Can be multi-line, will be split for TTS
  iconName: string; // e.g., "Sparkles", "Brain"
  bgColorClass: string; // Tailwind CSS class, e.g., "bg-sky-600"
  textColorClass: string; // Tailwind CSS class, e.g., "text-sky-100"
  id: string; // Unique ID for the scene, for keying animations
}

interface TutorSceneDisplayProps {
  scene: TutorSceneData | null;
  isTtsMuted: boolean;
  onSpeechEnd?: () => void; // Callback when all speech for the current scene ends
}

const iconMap: { [key: string]: React.ComponentType<LucideProps> } = {
  Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette, FileText, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, AlertCircle, HelpCircle, CheckCircle, XCircle, DivideCircle,
  Default: Sparkles, // Fallback icon
};

export const TutorSceneDisplay: React.FC<TutorSceneDisplayProps> = ({
  scene,
  isTtsMuted,
  onSpeechEnd,
}) => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentSegmentIndexRef = useRef(0);
  const segmentsRef = useRef<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [displayText, setDisplayText] = useState(""); // For animating text display

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices(); // Preload voices
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
    if (!isMounted || !scene || currentSegmentIndexRef.current >= segmentsRef.current.length) {
      if (isMounted && scene) onSpeechEnd?.(); // All segments spoken
      return;
    }

    const segmentToSpeak = segmentsRef.current[currentSegmentIndexRef.current];
    setDisplayText(segmentsRef.current.slice(0, currentSegmentIndexRef.current + 1).join(" "));


    if (isTtsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      // Simulate speech duration for visual flow if TTS is muted
      const simulatedDuration = segmentToSpeak.length * 40; // Adjusted timing
      setTimeout(() => {
        if (isMounted) {
            currentSegmentIndexRef.current++;
            speakNextSegment();
        }
      }, simulatedDuration);
      return;
    }

    if (utteranceRef.current && utteranceRef.current.onend) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel();

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
      if (isMounted && utteranceRef.current === newUtterance) {
        utteranceRef.current = null;
        currentSegmentIndexRef.current++;
        speakNextSegment();
      }
    };
    newUtterance.onerror = (event) => {
      if (isMounted && utteranceRef.current === newUtterance) {
        console.error('Speech synthesis error:', event.error);
        utteranceRef.current = null;
        currentSegmentIndexRef.current++; // Still advance to not get stuck
        speakNextSegment();
      }
    };
    window.speechSynthesis.speak(newUtterance);
  }, [isMounted, scene, isTtsMuted, onSpeechEnd]);

  useEffect(() => {
    if (isMounted && scene) {
      // Prepare segments for speech and display
      segmentsRef.current = [scene.title, ...scene.description.split(/[.!?]+\s/).filter(s => s.trim().length > 0)];
      currentSegmentIndexRef.current = 0;
      setDisplayText(""); // Reset display text for new scene

      // Cancel any ongoing speech from previous scene
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
         if (utteranceRef.current) {
          utteranceRef.current.onend = null; // Important to clear old handlers
          utteranceRef.current.onerror = null;
        }
      }
      // Delay slightly to allow DOM to update with new scene key before starting speech
      setTimeout(() => {
        if (isMounted && scene) { // Check again if scene is still current
             speakNextSegment();
        }
      }, 100); // Short delay
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isMounted]); // speakNextSegment is memoized but its internals depend on scene.

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
      key={scene.id} // Animate presence based on scene ID
      initial={{ opacity: 0, scale: 0.9, x: 100 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
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
        {/* Display progressively revealed text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={displayText} // Re-animate when displayText changes
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {displayText || "..."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
