
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
  documentContent: string; 
  mediaDataUri?: string;   
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

// For "Ask Mr. Know" Chat Session
export interface AskMrKnowMessagePart {
  text?: string;
  // Future: inlineData for images/files from user or AI
}
export interface AskMrKnowMessage {
  role: 'user' | 'model';
  parts: AskMrKnowMessagePart[];
  timestamp: string;
}

export interface ActiveAskMrKnowSessionData {
  kbItemId: string; // To know which KB item is the context
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
  chatHistory: AskMrKnowMessage[];
}

const ACTIVE_ASK_MR_KNOW_SESSION_KEY = 'activeAskMrKnowSession';

export const setActiveAskMrKnowSession = (data: ActiveAskMrKnowSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_ASK_MR_KNOW_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_ASK_MR_KNOW_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveAskMrKnowSession = (): ActiveAskMrKnowSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_ASK_MR_KNOW_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active Ask Mr. Know session from localStorage", e);
    return null;
  }
};


// For "Code with Me" Session
export interface CodeTeachingStepData {
  topic: string;
  explanation: string;
  codeExample?: string;
  challenge: string;
  feedbackOnPrevious?: string;
  nextTopicSuggestion: string;
  isLastStepInTopic?: boolean;
}

export interface CodeTeachingSessionHistoryItem {
    previousStep: CodeTeachingStepData;
    userAnswerSubmitted: string;
}

export interface ActiveCodeTeachingSessionData {
  language: string;
  currentTopic: string; // The broader topic, managed by AI's nextTopicSuggestion
  currentStepData: CodeTeachingStepData;
  history: CodeTeachingSessionHistoryItem[]; // To provide context for feedback
}

const ACTIVE_CODE_TEACHING_SESSION_KEY = 'activeCodeTeachingSession';

export const setActiveCodeTeachingSession = (data: ActiveCodeTeachingSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_CODE_TEACHING_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_CODE_TEACHING_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveCodeTeachingSession = (): ActiveCodeTeachingSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_CODE_TEACHING_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active code teaching session from localStorage", e);
    return null;
  }
};
