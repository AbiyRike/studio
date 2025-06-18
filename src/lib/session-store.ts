import type { Question } from '@/app/actions'; 
import type { Flashcard as AppFlashcard } from '@/ai/flows/generate-flashcards';
// Import the *new* schema for teaching scene data for ActiveDynamicTutorSessionData
import type { TeachingSceneSchema, QuizSchema, FeedbackSchema } from '@/ai/flows/interactive-tutor-flow';


// ---- Quiz Session (Old Tutor) ----
export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Question[];
  documentContent?: string; 
  mediaDataUri?: string;  
}

const ACTIVE_TUTOR_SESSION_KEY = 'activeTutorSession'; // For quiz feature

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
    console.error("Error parsing active quiz session from localStorage", e);
    return null;
  }
};


// ---- Learning History (Persisted for Quizzes) ----
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

// ---- Active Flashcard Session ----
export interface FlashcardSessionData {
  documentName: string;
  flashcards: AppFlashcard[];
  documentContent: string; 
  mediaDataUri?: string;   
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

// ---- Active Dynamic Interactive Tutor Session (Scene-based) ----
// Re-exporting schemas from the AI flow to be used here.
// This avoids circular dependencies if AI flow also needed types from here.
export type { TeachingSceneSchema, QuizSchema, FeedbackSchema };


export interface ActiveDynamicTutorSessionData {
  id: string; // Unique ID for this session instance
  kbItemId: string; 
  documentName: string;
  documentContent: string; 
  mediaDataUri?: string;   
  currentTeachingScene: TeachingSceneSchema | null; 
  currentQuizData: QuizSchema | null;
  quizFeedback: FeedbackSchema | null;
  currentMode: "loading_teach" | "teaching" | "loading_quiz" | "quizzing" | "loading_feedback" | "feedback" | "finished";
  isTtsMuted: boolean;
  cumulativeLearningContext: string; // Built up summary of taught content for AI context
}

const ACTIVE_DYNAMIC_TUTOR_SESSION_KEY = 'activeDynamicTutorSessionNew'; // New key to avoid conflicts

export const setActiveDynamicTutorSession = (data: ActiveDynamicTutorSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_DYNAMIC_TUTOR_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_DYNAMIC_TUTOR_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveDynamicTutorSession = (): ActiveDynamicTutorSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_DYNAMIC_TUTOR_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active dynamic tutor session from localStorage", e);
    return null;
  }
};


// ---- Active "Ask Mr. Know" Chat Session ----
export interface AskMrKnowMessagePart {
  text?: string;
}
export interface AskMrKnowMessage {
  role: 'user' | 'model';
  parts: AskMrKnowMessagePart[];
  timestamp: string;
}

export interface ActiveAskMrKnowSessionData {
  kbItemId: string; 
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


// ---- Active "Code with Me" Session ----
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
  currentTopic: string; 
  currentStepData: CodeTeachingStepData;
  history: CodeTeachingSessionHistoryItem[]; 
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

// ---- Active "Code Wiz" Session ----
export interface ActiveCodeWizSessionData {
  id: string; 
  originalCode: string;
  languageHint?: string;
  analysis?: string;
  explanation?: string;
  optimizedCode?: string;
  optimizationSummary?: string;
  currentOperation?: 'analyze' | 'explain' | 'optimize' | null;
  isLoadingAi: boolean;
  isTtsMuted: boolean;
  createdAt: string; 
}

const ACTIVE_CODE_WIZ_SESSION_KEY = 'activeCodeWizSession';

export const setActiveCodeWizSession = (data: ActiveCodeWizSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_CODE_WIZ_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_CODE_WIZ_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveCodeWizSession = (): ActiveCodeWizSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_CODE_WIZ_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active Code Wiz session from localStorage", e);
    return null;
  }
};
