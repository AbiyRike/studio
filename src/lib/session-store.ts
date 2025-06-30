import type { Question } from '@/app/actions'; 
import type { Flashcard as AppFlashcard } from '@/ai/flows/generate-flashcards';
// Import the *new* schema for teaching scene data for ActiveDynamicTutorSessionData
import type { TeachingSceneSchema, QuizSchema, FeedbackSchema } from '@/ai/flows/interactive-tutor-flow';
import { supabase } from '@/lib/supabase';

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

export const getLearningHistory = async (): Promise<HistoryItem[]> => {
  if (typeof window === 'undefined') return [];
  
  // Try to get user from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, get history from Supabase
    const { data, error } = await supabase
      .from('learning_history')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching learning history from Supabase", error);
      // Fall back to localStorage
      return getLocalLearningHistory();
    }
    
    // Transform Supabase data to match HistoryItem interface
    return data.map(item => ({
      id: item.id,
      documentName: item.document_name,
      summary: item.summary,
      questions: item.questions as Question[],
      documentContent: item.document_content,
      mediaDataUri: item.media_data_uri,
      userAnswers: item.user_answers as (number | null)[],
      score: item.score,
      completedAt: item.completed_at
    }));
  } else {
    // User is not authenticated, use localStorage
    return getLocalLearningHistory();
  }
};

// Get learning history from localStorage only
const getLocalLearningHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
  try {
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (e) {
    console.error("Error parsing learning history from localStorage", e);
    return [];
  }
};

export const addToLearningHistory = async (item: HistoryItem): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Try to get user from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, save to Supabase
    const { error } = await supabase
      .from('learning_history')
      .upsert({
        id: item.id,
        user_id: user.id,
        document_name: item.documentName,
        summary: item.summary,
        questions: item.questions,
        document_content: item.documentContent,
        media_data_uri: item.mediaDataUri,
        user_answers: item.userAnswers,
        score: item.score,
        completed_at: item.completedAt
      });
      
    if (error) {
      console.error("Error saving learning history to Supabase", error);
      // Fall back to localStorage
      addToLocalLearningHistory(item);
    }
  } else {
    // User is not authenticated, use localStorage
    addToLocalLearningHistory(item);
  }
};

// Add to learning history in localStorage only
const addToLocalLearningHistory = (item: HistoryItem): void => {
  if (typeof window === 'undefined') return;
  const history = getLocalLearningHistory();
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
export type { TeachingSceneSchema, QuizSchema, FeedbackSchema };

export interface UserQuestionRecord {
    interactionMode: "answer_query"; // To identify this record type
    userQueryOrAnswer: string; // The user's question
    aiQueryResponseText: string; // The AI's answer
    timestamp: string;
}

export interface ActiveDynamicTutorSessionData {
  id: string; 
  kbItemId: string; 
  documentName: string;
  documentContent: string; 
  mediaDataUri?: string;   
  currentTeachingScene: TeachingSceneSchema | null; 
  currentQuizData: QuizSchema | null;
  quizFeedback: FeedbackSchema | null;
  currentMode: "loading_teach" | "teaching" | "loading_quiz" | "quizzing" | "loading_feedback" | "feedback" | "finished" | "loading_query_answer" | "answered_query";
  isTtsMuted: boolean;
  cumulativeLearningContext: string; 
  userQuestionsHistory: UserQuestionRecord[]; // To store ad-hoc Q&A
  //presentationStateBeforeQuery: { scene: TeachingSceneSchema; segmentIndex: number } | null; // To resume presentation
}

const ACTIVE_DYNAMIC_TUTOR_SESSION_KEY = 'activeDynamicTutorSessionNew'; 

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