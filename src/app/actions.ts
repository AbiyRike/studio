
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import { generateFlashcards, type GenerateFlashcardsInput as AIFlashcardsInput } from "@/ai/flows/generate-flashcards";
import { getNextInteractiveTutorStep as getNextTutorStepFlow } from "@/ai/flows/interactive-tutor-flow"; // Placeholder
import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";
import { generateId, type KnowledgeBaseItem, getKnowledgeBaseItemById } from '@/lib/knowledge-base-store'; 
import type { InteractiveTutorStepData, ActiveInteractiveTutorSessionData } from '@/lib/session-store';


export interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Question[];
  documentContent: string; 
  mediaDataUri?: string;  
}

export interface ProcessContentInput {
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
}

export async function processContentForTutor(
  input: ProcessContentInput
): Promise<TutorSessionData | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri } = input;

    if (!documentName.trim()) {
        return { error: "Document name cannot be empty." };
    }
    if (!documentContent.trim() && !mediaDataUri) {
      return { error: "Document content or media (image/PDF) must be provided." };
    }

    const aiSummarizeInput: SummarizeDocumentInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
    };
    const aiInitialQuestionsInput: AIQuestionsInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfQuestions: 5,
      previousQuestionTexts: [],
    };

    const [summaryResult, questionsResult] = await Promise.all([
        summarizeDocument(aiSummarizeInput),
        generateQuestions(aiInitialQuestionsInput)
    ]);

    let finalSummary = summaryResult.summary;
    let initialQuestions = questionsResult.questions;

    if (!finalSummary) {
      finalSummary = "The AI could not generate a summary. This might be because the content was too short, unsuitable for summarization, or an issue occurred. Please try with different content or ensure the provided image (if any) is clear.";
    }

    if (!initialQuestions || initialQuestions.length === 0) {
      initialQuestions = [
        {
          question: "Sample Question: What is the primary goal of this learning session?",
          options: ["To understand the material", "To test memory", "To pass time", "To generate summaries"],
          answer: 0,
          explanation: "The primary goal is typically to understand the presented material."
        }
      ];
       console.warn("AI failed to generate initial questions. Using sample questions.");
    }
    
    const questionsWithExplanation = initialQuestions.map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.answer]}" (option ${q.answer + 1}). For actual content, a more detailed AI-generated explanation would ideally appear here.`
    }));

    return {
      documentName,
      summary: finalSummary,
      questions: questionsWithExplanation,
      documentContent: documentContent, 
      mediaDataUri: mediaDataUri,     
    };

  } catch (e) {
    console.error("Error processing content in processContentForTutor:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is currently busy or rate limits have been exceeded. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content could not be processed due to safety filters or was blocked by the AI. Please try with different content."};
    }
    return { error: `AI processing failed. Details: ${errorMessage}.` };
  }
}

export interface GenerateAdditionalQuestionsInput {
  documentContent: string;
  mediaDataUri?: string;
  previousQuestionTexts: string[];
}

export async function generateAdditionalQuestions(
  input: GenerateAdditionalQuestionsInput
): Promise<{ questions: Question[] } | { error: string }> {
  try {
    const { documentContent, mediaDataUri, previousQuestionTexts } = input;

    if (!documentContent.trim() && !mediaDataUri) {
      return { error: "Document content or media must be provided to generate more questions." };
    }
     if (previousQuestionTexts.length >= 100) { 
      return { questions: [] }; 
    }

    const aiInput: AIQuestionsInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfQuestions: 5, 
      previousQuestionTexts,
    };

    const result = await generateQuestions(aiInput);

    if (!result.questions || result.questions.length === 0) {
      return { questions: [] }; 
    }
    
    const questionsWithExplanation = result.questions.map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.answer]}" (option ${q.answer + 1}). A detailed explanation would ideally be here.`
    }));

    return { questions: questionsWithExplanation };

  } catch (e) {
    console.error("Error in generateAdditionalQuestions:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
     if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is currently busy or rate limits have been exceeded. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content could not be processed due to safety filters or was blocked by the AI. Please try with different content or a new topic."};
    }
    return { error: `Failed to generate additional questions. Details: ${errorMessage}` };
  }
}

export interface SummarizeAndGetDataForStorageInput {
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
}

export interface SummarizeAndGetDataForStorageOutput {
  id: string;
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
  summary: string;
  createdAt: string; 
  updatedAt: string; 
}

export async function summarizeAndGetDataForStorage(
  input: SummarizeAndGetDataForStorageInput
): Promise<SummarizeAndGetDataForStorageOutput | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri } = input;

    if (!documentName.trim()) {
      return { error: "Document name cannot be empty." };
    }
    if (!documentContent.trim() && !mediaDataUri) {
      return { error: "Document content or media (image/PDF) must be provided." };
    }

    const aiSummarizeInput: SummarizeDocumentInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
    };

    const summaryResult = await summarizeDocument(aiSummarizeInput);
    let finalSummary = summaryResult.summary;

    if (!finalSummary) {
      finalSummary = "The AI could not generate a summary for this content. It might be too short or unsuitable. The content is still saved.";
    }
    
    const now = new Date().toISOString();

    return {
      id: generateId(), 
      documentName,
      documentContent,
      mediaDataUri,
      summary: finalSummary,
      createdAt: now,
      updatedAt: now,
    };

  } catch (e) {
    console.error("Error in summarizeAndGetDataForStorage:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is currently busy or rate limits have been exceeded. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content could not be processed due to safety filters or was blocked by the AI. Please try with different content."};
    }
    return { error: `AI processing failed for summarization. Details: ${errorMessage}.` };
  }
}

export interface GenerateQuizFromKBItemInput {
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
  summary: string; 
}

export async function generateQuizSessionFromKBItem(
  input: GenerateQuizFromKBItemInput
): Promise<TutorSessionData | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri, summary } = input;

    if (!documentName || (!documentContent && !mediaDataUri)) {
      return { error: "Invalid knowledge base item data provided." };
    }

    const aiInitialQuestionsInput: AIQuestionsInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfQuestions: 5,
      previousQuestionTexts: [],
    };

    const questionsResult = await generateQuestions(aiInitialQuestionsInput);
    let initialQuestions = questionsResult.questions;

    if (!initialQuestions || initialQuestions.length === 0) {
      initialQuestions = [
        {
          question: "Sample Question: What is a key concept from this material?",
          options: ["Concept A", "Concept B", "Concept C", "Concept D"],
          answer: 0,
          explanation: "This is a sample question as initial generation failed."
        }
      ];
      console.warn("AI failed to generate initial questions from KB item. Using sample questions.");
    }

    const questionsWithExplanation = initialQuestions.map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.answer]}" (option ${q.answer + 1}).`
    }));

    return {
      documentName,
      summary: summary, 
      questions: questionsWithExplanation,
      documentContent: documentContent,
      mediaDataUri: mediaDataUri,
    };

  } catch (e) {
    console.error("Error in generateQuizSessionFromKBItem:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is currently busy. Please try again later." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Content processing was blocked by AI safety filters. Please try with different content."};
    }
    return { error: `AI processing failed for quiz generation. Details: ${errorMessage}.` };
  }
}


// ---- Flashcard Related Actions ----
export interface Flashcard {
  term: string;
  definition: string;
}

export interface FlashcardSessionData {
  documentName: string;
  flashcards: Flashcard[];
}

export interface GenerateFlashcardsFromKBItemInput {
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
}

export async function generateFlashcardsFromKBItem(
  input: GenerateFlashcardsFromKBItemInput
): Promise<FlashcardSessionData | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri } = input;

    if (!documentName || (!documentContent && !mediaDataUri)) {
      return { error: "Invalid knowledge base item data provided for flashcards." };
    }

    const aiFlashcardsInput: AIFlashcardsInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfFlashcards: 10, 
    };

    const flashcardsResult = await generateFlashcards(aiFlashcardsInput);
    let createdFlashcards = flashcardsResult.flashcards;

    if (!createdFlashcards || createdFlashcards.length === 0) {
      createdFlashcards = [
        { term: "Sample Term 1", definition: "This is a sample definition for when AI flashcard generation fails." },
        { term: "Sample Term 2", definition: "Ensure your document content is suitable for flashcard creation." }
      ];
      console.warn("AI failed to generate flashcards from KB item. Using sample flashcards.");
    }

    return {
      documentName,
      flashcards: createdFlashcards,
    };

  } catch (e) {
    console.error("Error in generateFlashcardsFromKBItem:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is currently busy for flashcard generation. Please try again later." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Content processing for flashcards was blocked by AI safety filters. Please try with different content."};
    }
    return { error: `AI processing failed for flashcard generation. Details: ${errorMessage}.` };
  }
}

// ---- Interactive Tutor Actions ----
export async function startInteractiveTutorSession(
  kbItemId: string
): Promise<ActiveInteractiveTutorSessionData | { error: string }> {
  const kbItem = getKnowledgeBaseItemById(kbItemId); // This function runs on the client, but we are in a server action.
                                                    // This will need to be refactored if KB is server-side.
                                                    // For now, assuming this action might be called from client where KB is accessible.
                                                    // Or, this needs to be an API endpoint that client calls, not a server action directly
                                                    // if KB items are purely client-side.
                                                    // *** For this placeholder, we'll mock it. ***
  if (!kbItem) {
    // In a real scenario, if getKnowledgeBaseItemById was server-side, it would fetch from a DB.
    // Since it's client-side, this check is more conceptual if kbItemId is just passed.
    // To make this fully work server-side, the KB content would need to be passed in or fetched.
    // For now, we'll proceed with a mock if not found, but ideally the client ensures kbItem exists.
     return { error: "Knowledge base item not found. Cannot start tutor session." };
  }

  // Placeholder: Call Genkit flow to get the first step
  // const firstStep = await getNextTutorStepFlow({ documentContent: kbItem.documentContent, photoDataUri: kbItem.mediaDataUri, currentStep: 0, userQuery: undefined });
  // if ('error' in firstStep) return firstStep;

  // Dummy first step for now
  const dummyFirstStep: InteractiveTutorStepData = {
    topic: "Introduction to " + kbItem.documentName,
    explanation: `This is the beginning of your interactive tutoring session on "${kbItem.documentName}". Let's start with the basics. (This is placeholder content from the server action).`,
    miniQuiz: {
      question: `What is the main subject of "${kbItem.documentName}"? (Placeholder quiz)`,
      type: 'short_answer',
    },
    isLastStep: false,
  };

  return {
    kbItemId: kbItem.id,
    documentName: kbItem.documentName,
    currentStepIndex: 0,
    currentStepData: dummyFirstStep,
  };
}

export async function getNextInteractiveTutorStep(
  currentSession: ActiveInteractiveTutorSessionData,
  userInput?: string // Could be an answer to a mini-quiz, or a question
): Promise<InteractiveTutorStepData | { error: string }> {
  
  // Placeholder: Call Genkit flow to get the next step
  // const kbItem = getKnowledgeBaseItemById(currentSession.kbItemId); // Again, this implies client-side access or needs content.
  // if (!kbItem) return { error: "Original content not found for session."};
  // const nextStep = await getNextTutorStepFlow({ 
  //   documentContent: kbItem.documentContent, // Pass full content for context
  //   photoDataUri: kbItem.mediaDataUri,
  //   currentStep: currentSession.currentStepIndex + 1, 
  //   previousExplanation: currentSession.currentStepData.explanation,
  //   userQuery: userInput 
  // });
  // if ('error' in nextStep) return nextStep;
  // return nextStep;

  // Dummy next step logic
  const nextStepIndex = currentSession.currentStepIndex + 1;
  if (nextStepIndex >= 3) { // Simulate 3 steps total
    return { 
        topic: "Conclusion",
        explanation: `This concludes our placeholder tutoring session on "${currentSession.documentName}". You've reached the end!`,
        isLastStep: true
    };
  }

  const dummyNextStep: InteractiveTutorStepData = {
    topic: `Topic ${nextStepIndex + 1} for ${currentSession.documentName}`,
    explanation: `This is placeholder explanation for step ${nextStepIndex + 1}. User input was: "${userInput || 'None'}".`,
    miniQuiz: {
      question: `Placeholder MCQ for step ${nextStepIndex + 1}. Option A or B?`,
      type: 'mcq',
      options: ["Option A", "Option B", "Option C"],
      answer: 0,
    },
    isLastStep: false,
  };
  return dummyNextStep;
}

