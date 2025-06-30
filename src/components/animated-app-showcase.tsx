"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DatabaseZap,
  Edit3,
  Layers,
  GraduationCap,
  MessageCircleQuestion,
  Code2,
  Sparkles,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  description: string;
  Icon: React.ComponentType<LucideProps>;
  color: string;
  textColor: string;
  duration: number;
}

const scenes: Scene[] = [
  { id: 'welcome', title: 'Welcome to Study AI+', description: 'Unlock your learning potential. Let\'s explore the modules!', Icon: Sparkles, color: 'bg-slate-700', textColor: 'text-slate-100', duration: 6000 },
  { id: 'kb', title: 'Knowledge Base', description: 'Upload documents, images, or audio. AI summarizes and stores them.', Icon: DatabaseZap, color: 'bg-sky-600', textColor: 'text-sky-100', duration: 7000 },
  { id: 'quiz', title: 'AI-Powered Quizzes', description: 'Generate dynamic quizzes from your content to test your understanding.', Icon: Edit3, color: 'bg-emerald-600', textColor: 'text-emerald-100', duration: 7000 },
  { id: 'flashcards', title: 'Smart Flashcards', description: 'Create and study flashcards generated from your materials for effective memorization.', Icon: Layers, color: 'bg-amber-600', textColor: 'text-amber-100', duration: 7000 },
  { id: 'tutor', title: 'Interactive Tutor', description: 'Step-by-step AI video tutoring with explanations from Study AI+.', Icon: GraduationCap, color: 'bg-purple-600', textColor: 'text-purple-100', duration: 7000 },
  { id: 'ask', title: 'Ask Mr. Know', description: 'Engage in contextual chat with an AI about any item in your knowledge base.', Icon: MessageCircleQuestion, color: 'bg-teal-600', textColor: 'text-teal-100', duration: 7000 },
  { id: 'code', title: 'Code with Me', description: 'Learn programming languages interactively, from syntax basics to core concepts.', Icon: Code2, color: 'bg-rose-600', textColor: 'text-rose-100', duration: 7000 },
];

// Preferred voice options with gender balance
const PREFERRED_MALE_VOICES = ['Google US English Male', 'Microsoft David', 'Daniel', 'Alex', 'Google UK English Male'];
const PREFERRED_FEMALE_VOICES = ['Google US English Female', 'Microsoft Zira', 'Samantha', 'Karen', 'Google UK English Female'];

const AnimatedAppShowcase: React.FC = () => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sceneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSpeakingAllowed, setIsSpeakingAllowed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerContainerRef = useRef<HTMLDivElement>(null);
  const [preferMaleVoice, setPreferMaleVoice] = useState(true); // Start with male voice

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setIsSpeakingAllowed(true);
        } else {
          window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
        }
      };
      loadVoices();
    }
    
    return () => {
      setIsMounted(false);
      if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, []);

  // IntersectionObserver setup
  useEffect(() => {
    if (!isMounted || !observerContainerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.intersectionRatio === 1);
      },
      { threshold: 1.0 }
    );

    observer.observe(observerContainerRef.current);

    return () => {
      if (observerContainerRef.current) {
        observer.unobserve(observerContainerRef.current);
      }
      observer.disconnect();
    };
  }, [isMounted]);

  // Toggle voice gender when scene changes
  useEffect(() => {
    setPreferMaleVoice(prev => !prev);
  }, [currentSceneIndex]);

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

  const speak = useCallback((text: string) => {
    if (!isMounted || !isSpeakingAllowed || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 0.95;
    newUtterance.pitch = preferMaleVoice ? 0.9 : 1.1; // Lower pitch for male, higher for female
    newUtterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const selectedVoice = findBestVoice(voices);
      if (selectedVoice) {
        newUtterance.voice = selectedVoice;
      }
    }

    utteranceRef.current = newUtterance;
    
    try {
      window.speechSynthesis.speak(newUtterance);
    } catch (error) {
      console.error('Error speaking utterance:', error);
    }
  }, [isMounted, isSpeakingAllowed, preferMaleVoice, findBestVoice]);

  // Main effect for scene transitions and speech
  useEffect(() => {
    if (!isMounted || !isIntersecting) {
      if (isMounted && typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
      }
      if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
      return;
    }

    // If intersecting, resume speech if it was paused
    if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }

    const currentScene = scenes[currentSceneIndex];
    const textToSpeak = `${currentScene.title}. ${currentScene.description}`;
    
    const speechTimeout = setTimeout(() => {
      if (isMounted && isIntersecting) {
        speak(textToSpeak);
      }
    }, 500);

    if (sceneTimeoutRef.current) {
      clearTimeout(sceneTimeoutRef.current);
    }

    sceneTimeoutRef.current = setTimeout(() => {
      if (isMounted && isIntersecting) {
        setCurrentSceneIndex((prevIndex) => (prevIndex + 1) % scenes.length);
      }
    }, currentScene.duration);

    return () => {
      clearTimeout(speechTimeout);
      if (sceneTimeoutRef.current) {
        clearTimeout(sceneTimeoutRef.current);
      }
    };
  }, [currentSceneIndex, speak, isMounted, isIntersecting]);

  // Effect for handling browser tab visibility
  useEffect(() => {
    if (!isMounted) return;

    const handleVisibilityChange = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      
      if (document.hidden) {
        window.speechSynthesis.pause();
        if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
      } else {
        if (isIntersecting) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          if (!sceneTimeoutRef.current && scenes[currentSceneIndex] && isMounted && isIntersecting) {
            sceneTimeoutRef.current = setTimeout(() => {
              if (isMounted && isIntersecting) {
                setCurrentSceneIndex((prevIndex) => (prevIndex + 1) % scenes.length);
              }
            }, scenes[currentSceneIndex].duration);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMounted, isIntersecting, currentSceneIndex]);

  if (!isMounted) {
    return (
      <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden shadow-2xl bg-slate-700 flex flex-col items-center justify-center p-6 text-slate-100">
        <Sparkles className="w-16 h-16 md:w-20 md:h-20 mb-4 opacity-50" />
        <h3 className="text-xl md:text-3xl font-bold mb-2 text-center">Loading Study AI+ Showcase...</h3>
        <p className="text-xs md:text-sm text-center max-w-md">Preparing interactive overview.</p>
      </div>
    );
  }

  const currentScene = scenes[currentSceneIndex];

  return (
    <div ref={observerContainerRef} className="relative w-full h-full rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center p-1">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene.id}
          initial={{ opacity: 0, scale: 0.9, x: 100 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -100 }}
          transition={{ duration: 0.8, ease: [0.42, 0, 0.58, 1] }}
          className={`absolute inset-0 ${currentScene.color} ${currentScene.textColor} flex flex-col items-center justify-center p-4 md:p-6 text-center`}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 150, damping: 15 }}
          >
            <currentScene.Icon className="w-12 h-12 md:w-16 md:h-16 mb-3 md:mb-4" />
          </motion.div>
          <motion.h3
            className="text-lg md:text-2xl font-bold mb-1 md:mb-2"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
          >
            {currentScene.title}
          </motion.h3>
          <motion.p
            className="text-xs md:text-base max-w-xs md:max-w-md leading-snug"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
          >
            {currentScene.description}
          </motion.p>
        </motion.div>
      </AnimatePresence>
      <div className="opacity-0 pointer-events-none absolute" aria-hidden="true">
        <h1>Study AI+ Application Modules</h1>
        {scenes.map(s => <div key={`seo-${s.id}`}><h2>{s.title}</h2><p>{s.description}</p></div>)}
      </div>
    </div>
  );
};

export default AnimatedAppShowcase;