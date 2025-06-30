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
}

const iconMap: { [key: string]: React.ComponentType<LucideProps> } = {
  Sparkles, Lightbulb, Zap, BookOpen, Brain, Palette, FileText, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, AlertCircle, HelpCircle, CheckCircle, XCircle, DivideCircle,
  Default: Sparkles,
};

// Preferred voice options with gender balance
const PREFERRED_MALE_VOICES = ['Google US English Male', 'Microsoft David', 'Daniel', 'Alex', 'Google UK English Male'];
const PREFERRED_FEMALE_VOICES = ['Google US English Female', 'Microsoft Zira', 'Samantha', 'Karen', 'Google UK English Female'];

export const TutorSceneDisplay: React.FC<TutorSceneDisplayProps> = ({
  scene,
  isTtsMuted,
  isPaused,
  onSpeechEnd,
}) => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentSegmentIndexRef = useRef(0);
  const segmentsRef = useRef<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const sceneIdRef = useRef<string | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [preferMaleVoice, setPreferMaleVoice] = useState(false); // Alternate between male and female voices

  useEffect(() => {
    setIsMounted(true);
    
    // Ensure voices are loaded
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Force voices to load
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          // Voices not loaded yet, wait for the event
          window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
        }
      };
      loadVoices();
      
      // Clean up any existing speech
      window.speechSynthesis.cancel();
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current = null;
      }
    }
    
    return () => {
      setIsMounted(false);
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
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

  // Toggle preferred voice gender when scene changes
  useEffect(() => {
    if (scene) {
      setPreferMaleVoice(prev => !prev);
    }
  }, [scene?.id]);

  const findBestVoice = useCallback((voices: SpeechSynthesisVoice[]) => {
    if (!voices || voices.length === 0) return null;
    
    // Prioritize voices based on gender preference
    const preferredVoiceList = preferMaleVoice ? PREFERRED_MALE_VOICES : PREFERRED_FEMALE_VOICES;
    
    // Try to find a voice from our preferred list
    for (const voiceName of preferredVoiceList) {
      const match = voices.find(v => v.name.includes(voiceName));
      if (match) return match;
    }
    
    // Fallback to any English voice
    const anyEnglishVoice = voices.find(v => v.lang.startsWith('en'));
    if (anyEnglishVoice) return anyEnglishVoice;
    
    // Last resort: use any available voice
    return voices[0];
  }, [preferMaleVoice]);

  const speakNextSegment = useCallback(() => {
    if (!isMounted || !scene || sceneIdRef.current !== scene.id) {
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
        return; // Don't start new speech if resuming
      }
    }

    // Check if all segments are spoken
    if (currentSegmentIndexRef.current >= segmentsRef.current.length) {
      onSpeechEnd?.(true);
      return;
    }

    const segmentToSpeak = segmentsRef.current[currentSegmentIndexRef.current];
    
    if (isTtsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      // Simulate speech duration if TTS is muted
      const simulatedDuration = Math.max(segmentToSpeak.length * 50, 1000);
      speechTimeoutRef.current = setTimeout(() => {
        if (isMounted && scene && sceneIdRef.current === scene.id && !isPaused) {
          currentSegmentIndexRef.current++;
          speakNextSegment();
        }
      }, simulatedDuration);
      return;
    }

    // Clear previous utterance's handlers and cancel speech
    if (utteranceRef.current) {
      utteranceRef.current.onend = null; 
      utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel();

    const newUtterance = new SpeechSynthesisUtterance(segmentToSpeak);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 0.95; // Slightly slower for better comprehension
    newUtterance.pitch = preferMaleVoice ? 0.9 : 1.1; // Lower pitch for male, higher for female
    newUtterance.volume = 1.0;

    // Get voices and select appropriate one based on gender preference
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const selectedVoice = findBestVoice(voices);
      if (selectedVoice) {
        newUtterance.voice = selectedVoice;
      }
    }
    
    utteranceRef.current = newUtterance; // Assign new utterance to ref

    newUtterance.onend = () => {
      if (isMounted && utteranceRef.current === newUtterance && scene && sceneIdRef.current === scene.id && !isPaused) {
        utteranceRef.current = null; // Clear ref after use
        currentSegmentIndexRef.current++;
        speakNextSegment();
      }
    };
    
    newUtterance.onerror = (event) => {
      if (isMounted && utteranceRef.current === newUtterance) {
        console.error('Speech synthesis error:', event.error);
        utteranceRef.current = null; // Clear ref
        currentSegmentIndexRef.current++; // Still advance to not get stuck
        speakNextSegment();
      }
    };

    try {
      window.speechSynthesis.speak(newUtterance);
    } catch (error) {
      console.error('Error speaking utterance:', error);
      // Fallback to next segment
      currentSegmentIndexRef.current++;
      speakNextSegment();
    }
  }, [isMounted, scene, isTtsMuted, onSpeechEnd, isPaused, preferMaleVoice, findBestVoice]);

  // Effect to initialize or reset speech when the scene changes
  useEffect(() => {
    if (isMounted && scene) {
      sceneIdRef.current = scene.id;
      
      // Prepare segments: Split description into sentences
      const sentences = scene.description 
        ? scene.description.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
        : [];
      
      // Include title as first segment if it exists
      segmentsRef.current = scene.title ? [scene.title, ...sentences] : sentences;
      currentSegmentIndexRef.current = 0;

      // Cancel any previous speech
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        if (utteranceRef.current) {
          utteranceRef.current.onend = null;
          utteranceRef.current.onerror = null;
          utteranceRef.current = null;
        }
      }
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      // Start speaking after a brief delay
      speechTimeoutRef.current = setTimeout(() => {
        if (isMounted && scene && sceneIdRef.current === scene.id && !isPaused) {
          speakNextSegment();
        }
      }, 300);
      
      return () => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
      };
    } else if (!scene && isMounted) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      sceneIdRef.current = null;
    }
  }, [scene, isMounted, speakNextSegment]);

  // Effect to handle pause/resume externally
  useEffect(() => {
    if (!isMounted || !scene || sceneIdRef.current !== scene.id) return;

    if (isPaused) {
      if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
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
        "bg-slate-700 text-slate-100"
      )}>
        <Sparkles className="w-12 h-12 md:w-16 md:h-16 animate-pulse" />
        <p className="mt-4 text-lg">Preparing next scene...</p>
      </div>
    );
  }

  const SceneIcon = iconMap[scene.iconName] || iconMap.Default;

  return (
    <motion.div
      key={scene.id}
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

      <div className="flex-grow w-full max-w-md md:max-w-lg overflow-y-auto px-2">
        <AnimatePresence mode="popLayout">
          {segmentsRef.current.map((segment, index) => (
            // Only render segments up to the current one being processed
            index <= currentSegmentIndexRef.current && segment !== scene.title ? (
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
            ) : null
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};