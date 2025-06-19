
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
  isPaused: boolean;
  onSpeechEnd?: (isCompleted: boolean) => void;
  // The 'key' prop is special and handled by React, not passed into the component.
  // It was used on the instance of this component to trigger re-renders.
}

const iconMap: { [key: string]: React.ComponentType<LucideProps> } = {
  Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette, FileText, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, AlertCircle, HelpCircle, CheckCircle, XCircle, DivideCircle,
  Default: Sparkles,
};

export const TutorSceneDisplay: React.FC<TutorSceneDisplayProps> = ({
  scene,
  isTtsMuted,
  isPaused,
  onSpeechEnd,
  // key, // Removed from here
}) => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentSegmentIndexRef = useRef(0);
  const segmentsRef = useRef<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const sceneIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
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
        if (isMounted && utteranceRef.current) window.speechSynthesis.cancel();
        return;
    }

    if (isPaused) {
        if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
        }
        return;
    } else {
         if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }

    if (currentSegmentIndexRef.current >= segmentsRef.current.length) {
      onSpeechEnd?.(true);
      return;
    }

    const segmentToSpeak = segmentsRef.current[currentSegmentIndexRef.current];
    setDisplayText(prev => {
        const newText = segmentsRef.current.slice(0, currentSegmentIndexRef.current + 1).join(" ");
        return newText;
    });


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
      sceneIdRef.current = scene.id;
      const titleSegment = scene.title ? [scene.title] : [];
      const descriptionSegments = scene.description ? scene.description.split(/[.!?]+\s(?![a-z])/)
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
      const startTimer = setTimeout(() => {
        if (isMounted && scene && sceneIdRef.current === scene.id && !isPaused) {
             speakNextSegment();
        }
      }, 150);
      return () => clearTimeout(startTimer);
    } else if (!scene && isMounted) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        sceneIdRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isMounted]);

  useEffect(() => {
      if (!isMounted || !scene || sceneIdRef.current !== scene.id) return;

      if (isPaused) {
          if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
          }
      } else {
          if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
          } else if (typeof window !== 'undefined' && !window.speechSynthesis.speaking && currentSegmentIndexRef.current < segmentsRef.current.length) {
              speakNextSegment();
          }
      }
  }, [isPaused, isMounted, scene, speakNextSegment]);


  if (!scene) {
    return (
        <div className={cn(
          "w-full h-full rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-hidden",
          "bg-slate-700 text-slate-100" // Default background if no scene
        )}>
            <Sparkles className="w-12 h-12 md:w-16 md:h-16 animate-pulse" />
            <p className="mt-4 text-lg">Preparing next scene...</p>
        </div>
    );
  }

  const SceneIcon = iconMap[scene.iconName] || iconMap.Default;

  return (
    <motion.div
      key={scene.id} // Use scene.id for framer-motion's key here for transitions
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

      <AnimatePresence mode="wait">
        <motion.h3
          key={`${scene.id}-title`}
          className="text-xl md:text-3xl font-bold mb-2 md:mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
        >
          {scene.title}
        </motion.h3>
      </AnimatePresence>

      <div className="flex-grow w-full max-w-md md:max-w-lg overflow-y-auto px-2 tutor-description-scroll">
          <AnimatePresence mode="popLayout">
              {segmentsRef.current.map((segment, index) => (
                  (index === 0 && segment === scene.title) || index > currentSegmentIndexRef.current
                  ? null 
                  : (
                    <motion.p
                        key={`${scene.id}-segment-${index}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                        className="text-sm md:text-lg leading-relaxed mb-3 whitespace-pre-line"
                    >
                        {segment}
                    </motion.p>
                  )
              ))}
          </AnimatePresence>
           {currentSegmentIndexRef.current < segmentsRef.current.length && segmentsRef.current[currentSegmentIndexRef.current] !== scene.title && (
                <motion.p
                    key={`${scene.id}-currentsegment-${currentSegmentIndexRef.current}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm md:text-lg leading-relaxed mb-3 whitespace-pre-line"
                >
                    {/* Placeholder for currently forming segment for smoother visual update */}
                </motion.p>
            )}
      </div>
      <style jsx>{`
        .tutor-description-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .tutor-description-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .tutor-description-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
        }
        .tutor-description-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
        .tutor-description-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.3) transparent;
        }
      `}</style>
    </motion.div>
  );
};

