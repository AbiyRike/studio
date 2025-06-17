import type { Question } from '@/app/actions'; 
import type { Flashcard as AppFlashcard } from '@/ai/flows/generate-flashcards';
import type { InteractiveTutorOutput as DynamicTutorStepData } from '@/ai/flows/interactive-tutor-flow'; // Import the output type

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

// ---- Active Dynamic Interactive Tutor Session (Replaces Tavus Tutor) ----
export { type DynamicTutorStepData }; // Export the imported type

export interface ChatMessage { 
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ActiveDynamicTutorSessionData {
  kbItemId: string; 
  documentName: string;
  documentContent: string; 
  mediaDataUri?: string;   
  currentStepData: DynamicTutorStepData | null; 
  chatHistory: ChatMessage[];
  isTtsMuted: boolean;
  isCameraAnalysisEnabled: boolean; 
  currentQuizAttempt: { question: string; answerIndex: number | null } | null; // For managing quiz state within the tutor
}

const ACTIVE_DYNAMIC_TUTOR_SESSION_KEY = 'activeDynamicTutorSession'; // New key

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