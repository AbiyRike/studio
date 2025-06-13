import type { TutorSessionData } from '@/app/actions';

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
