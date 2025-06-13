
import type { Question } from '@/app/actions'; // Import Question type

// Re-define TutorSessionData here or import from actions if it's fully defined there.
// For clarity, let's assume it's mostly defined by its use in actions.ts
export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Question[]; // Initial batch of questions
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
  return storedData ? JSON.parse(storedData) : null;
};


// For learning history (persisted)
const HISTORY_STORAGE_KEY = 'geminiAITutorHistory';

export interface HistoryItem {
  id: string;
  documentName: string;
  summary: string;
  questions: Question[]; // Can now contain up to 100 questions
  documentContent?: string;
  mediaDataUri?: string;
  userAnswers: (number | null)[]; // Corresponding answers for all questions
  score: number; // Score based on all questions answered
  completedAt: string; // ISO date string
}

export const getLearningHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
  return storedHistory ? JSON.parse(storedHistory) : [];
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
