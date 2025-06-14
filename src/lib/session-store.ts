
import type { Question, Flashcard } from '@/app/actions'; 

export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Question[];
  documentContent?: string;
  mediaDataUri?: string;
}

const ACTIVE_TUTOR_SESSION_KEY = 'activeTutorSession';

export const setActiveTutorSession = (data: TutorSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_TUTOR_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_TUTOR_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveTutorSession = (): TutorSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_TUTOR_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active tutor session from localStorage", e);
    return null;
  }
};


// For learning history (persisted)
const HISTORY_STORAGE_KEY = 'geminiAITutorHistory';

export interface HistoryItem {
  id: string;
  documentName: string;
  summary: string;
  questions: Question[]; 
  documentContent?: string;
  mediaDataUri?: string;
  userAnswers: (number | null)[]; 
  score: number; 
  completedAt: string; 
}

export const getLearningHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
  try {
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (e) {
    console.error("Error parsing learning history from localStorage", e);
    return [];
  }
};

export const addToLearningHistory = (item: HistoryItem): void => {
  if (typeof window === 'undefined') return;
  const history = getLearningHistory();
  const existingIndex = history.findIndex(h => h.id === item.id);
  if (existingIndex > -1) {
    history[existingIndex] = item;
  } else {
    history.unshift(item);
  }
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
};

// For active flashcard session
export interface FlashcardSessionData {
  documentName: string;
  flashcards: Flashcard[];
}

const ACTIVE_FLASHCARD_SESSION_KEY = 'activeFlashcardSession';

export const setActiveFlashcardSession = (data: FlashcardSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_FLASHCARD_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_FLASHCARD_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveFlashcardSession = (): FlashcardSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_FLASHCARD_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active flashcard session from localStorage", e);
    return null;
  }
};

// For Interactive Tutor Session
export interface InteractiveTutorMiniQuiz {
  question: string;
  type: 'mcq' | 'short_answer';
  options?: string[]; 
  answer?: number | string; 
  explanation?: string;
}

export interface InteractiveTutorStepData {
  topic: string;
  explanation: string;
  explanationAudioUri?: string; 
  miniQuiz?: InteractiveTutorMiniQuiz;
  isLastStep: boolean;
}

export interface ActiveInteractiveTutorSessionData {
  documentName: string;
  documentContent: string; // Store full content for AI context
  mediaDataUri?: string;   // Store media URI for AI context
  currentStepIndex: number;
  currentStepData: InteractiveTutorStepData;
}

const ACTIVE_INTERACTIVE_TUTOR_SESSION_KEY = 'activeInteractiveTutorSession';

export const setActiveInteractiveTutorSession = (data: ActiveInteractiveTutorSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_INTERACTIVE_TUTOR_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_INTERACTIVE_TUTOR_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveInteractiveTutorSession = (): ActiveInteractiveTutorSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_INTERACTIVE_TUTOR_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active interactive tutor session from localStorage", e);
    return null;
  }
};
