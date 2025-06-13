import type { TutorSessionData } from '@/app/actions';

interface StoredSessionData extends TutorSessionData {
  // any additional fields if needed for storage
}

// This is a very simple in-memory store for demonstration.
// It only holds one session at a time. For multiple sessions or persistence,
// use localStorage, IndexedDB, or a state management library like Zustand/Redux.

let currentSession: StoredSessionData | null = null;

export const setTemporarySessionData = (data: StoredSessionData): void => {
  currentSession = data;
};

export const getTemporarySessionData = (): StoredSessionData | null => {
  const data = currentSession;
  currentSession = null; // Consume once
  return data;
};

// For learning history (persisted)
const HISTORY_STORAGE_KEY = 'geminiAITutorHistory';

export interface HistoryItem extends TutorSessionData {
  id: string;
  userAnswers: (number | null)[];
  score: number;
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
  // Prevent duplicates by ID if this function could be called multiple times for the same session
  const existingIndex = history.findIndex(h => h.id === item.id);
  if (existingIndex > -1) {
    history[existingIndex] = item;
  } else {
    history.unshift(item); // Add to the beginning
  }
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50))); // Limit history size
};
