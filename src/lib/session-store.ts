
import type { Question, Flashcard } from '@/app/actions'; 

// ---- Quiz Session (Old Tutor) ----
export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Question[];
  documentContent?: string; // Original content used to generate quiz
  mediaDataUri?: string;  // Original media URI
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
  id: string; // Unique ID for the history entry
  documentName: string;
  summary: string; // Summary at the time of the quiz
  questions: Question[]; // Questions asked in that session
  documentContent?: string; // Full content (optional, for review context)
  mediaDataUri?: string;   // Media URI (optional, for review context)
  userAnswers: (number | null)[]; // User's answers (index or null if not answered)
  score: number; // Number of correct answers
  completedAt: string; // ISO date string
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
    history[existingIndex] = item; // Update if ID exists (e.g. re-quiz)
  } else {
    history.unshift(item); // Add new item to the beginning
  }
  // Limit history to a reasonable number, e.g., 50 items
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
};

// ---- Active Flashcard Session ----
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

// ---- Active Interactive Tavus Video Tutor Session ----
export interface ChatHistoryMessage { // For Tavus tutor chat log
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
export interface ActiveInteractiveTavusTutorSessionData {
  kbItemId: string; // ID of the knowledge base item being tutored
  documentName: string;
  documentContent: string; 
  mediaDataUri?: string;   
  conversationId: string; // Tavus conversation ID
  clientSecret: string;   // Tavus client secret
  chatHistory: ChatHistoryMessage[];
  initialVideoUrl?: string; // Video URL for the tutor's greeting
  initialAiText?: string;   // Text for the tutor's greeting
  tavusPersonaSystemPrompt: string; // The system prompt used to init Tavus persona context
}

const ACTIVE_INTERACTIVE_TAVUS_TUTOR_SESSION_KEY = 'activeInteractiveTavusTutorSession';

export const setActiveInteractiveTavusTutorSession = (data: ActiveInteractiveTavusTutorSessionData | null): void => {
  if (typeof window === 'undefined') return;
  if (data === null) {
    localStorage.removeItem(ACTIVE_INTERACTIVE_TAVUS_TUTOR_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_INTERACTIVE_TAVUS_TUTOR_SESSION_KEY, JSON.stringify(data));
  }
};

export const getActiveInteractiveTavusTutorSession = (): ActiveInteractiveTavusTutorSessionData | null => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem(ACTIVE_INTERACTIVE_TAVUS_TUTOR_SESSION_KEY);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error("Error parsing active interactive Tavus tutor session from localStorage", e);
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

    