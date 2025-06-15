
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import { generateFlashcards, type GenerateFlashcardsInput as AIFlashcardsInput } from "@/ai/flows/generate-flashcards";
import { getNextInteractiveTutorStep as getNextTutorStepFlow, type InteractiveTutorInput as AIInteractiveTutorInput } from "@/ai/flows/interactive-tutor-flow";
import { chatWithMrKnowMMLFlow, type AskMrKnowInput as AIAskMrKnowInput, AskMrKnowOutput } from "@/ai/flows/ask-mr-know-flow";
import { getProgrammingLanguages as getProgrammingLanguagesFlow, type GetProgrammingLanguagesInput as AIGetProgrammingLanguagesInput } from "@/ai/flows/get-programming-languages-flow";
import { getCodeTeachingStep as getCodeTeachingStepFlow, type GetCodeTeachingStepInput as AIGetCodeTeachingStepInput } from "@/ai/flows/get-code-teaching-step-flow";

import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";
import { generateId, type KnowledgeBaseItem } from '@/lib/knowledge-base-store'; 
import type { InteractiveTutorStepData, ActiveInteractiveTutorSessionData, AskMrKnowMessage, ActiveAskMrKnowSessionData, CodeTeachingStepData, ActiveCodeTeachingSessionData } from '@/lib/session-store';


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
      console.warn(`AI failed to generate flashcards for "${documentName}".`);
      return { documentName, flashcards: [] };
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
  kbItem: KnowledgeBaseItem
): Promise<ActiveInteractiveTutorSessionData | { error: string }> {
  try {
    if (!kbItem || (!kbItem.documentContent && !kbItem.mediaDataUri)) {
      return { error: "Knowledge base item is missing content. Cannot start tutor session." };
    }

    const firstStepInput: AIInteractiveTutorInput = {
        documentContent: kbItem.documentContent || "", 
        photoDataUri: kbItem.mediaDataUri,
        currentStep: 0,
    };
    
    const firstStepResult = await getNextTutorStepFlow(firstStepInput);
    
    if (typeof (firstStepResult as any).error === 'string') {
        return { error: `Failed to get first tutoring step: ${(firstStepResult as any).error}` };
    }
    
    const validFirstStepResult = firstStepResult as InteractiveTutorStepData;

    return {
      documentName: kbItem.documentName,
      documentContent: kbItem.documentContent || "", 
      mediaDataUri: kbItem.mediaDataUri,         
      currentStepIndex: 0,
      currentStepData: validFirstStepResult,
    };
  } catch (e) {
    console.error("Error starting interactive tutor session:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
      return { error: "The AI tutor service is currently busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
      return { error: "The content could not be processed by the AI tutor due to safety filters. Please try with different content."};
    }
    return { error: `Failed to start session: ${errorMessage}` };
  }
}

export async function getNextInteractiveTutorStep(
  currentSession: ActiveInteractiveTutorSessionData,
  targetStepIndex: number, 
  userQuizAnswer?: string,
): Promise<InteractiveTutorStepData | { error: string }> {
  try {
    const nextStepInput: AIInteractiveTutorInput = {
        documentContent: currentSession.documentContent,
        photoDataUri: currentSession.mediaDataUri,
        currentStep: targetStepIndex, 
        previousExplanation: currentSession.currentStepData.explanation,
        currentTopic: currentSession.currentStepData.topic,
        userQuizAnswer: userQuizAnswer,
    };

    const nextStepResult = await getNextTutorStepFlow(nextStepInput);

    if (typeof (nextStepResult as any).error === 'string') { 
        return { error: `Failed to get next tutoring step: ${(nextStepResult as any).error}` };
    }
    return nextStepResult as InteractiveTutorStepData;

  } catch (e) {
      console.error("Error getting next interactive tutor step:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI tutor service is currently busy. Please try again in a few moments." };
      }
      if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content could not be processed by the AI tutor due to safety filters. Please try with different content or ask a different question."};
      }
      return { error: `AI Tutor processing failed. Details: ${errorMessage}.` };
  }
}

// ---- Ask Mr. Know Actions ----
export async function startAskMrKnowSession(
  kbItem: KnowledgeBaseItem
): Promise<ActiveAskMrKnowSessionData | { error: string }> {
  try {
    if (!kbItem) {
      return { error: "Knowledge base item is required to start a chat session." };
    }
     if (!kbItem.documentContent && !kbItem.mediaDataUri) {
      return { error: "The selected knowledge base item has no text or image content for Mr. Know to discuss." };
    }
    return {
      kbItemId: kbItem.id,
      documentName: kbItem.documentName,
      documentContent: kbItem.documentContent || "", 
      mediaDataUri: kbItem.mediaDataUri,
      chatHistory: [
        {
          role: 'model', 
          parts: [{ text: `Hello! I'm Mr. Know. Ask me anything about "${kbItem.documentName}".` }],
          timestamp: new Date().toISOString(),
        }
      ],
    };
  } catch (e) {
    console.error("Error starting Ask Mr. Know session:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { error: `Failed to start chat session: ${errorMessage}` };
  }
}

export async function getNextAskMrKnowResponse(
  currentSession: ActiveAskMrKnowSessionData,
  userMessage: string
): Promise<AskMrKnowMessage | { error: string }> {
  try {
    if (!userMessage.trim()) {
      return { error: "Your message to Mr. Know cannot be empty." };
    }
    const aiInput: AIAskMrKnowInput = {
      documentContent: currentSession.documentContent,
      photoDataUri: currentSession.mediaDataUri,
      chatHistory: currentSession.chatHistory.map(msg => ({ 
        role: msg.role,
        parts: msg.parts.map(p => ({ text: p.text })),
      })), 
      userQuery: userMessage,
    };

    const aiResponseOrError = await chatWithMrKnowMMLFlow(aiInput);

    if ('error' in aiResponseOrError) { 
        return { error: aiResponseOrError.error };
    }
    
    const aiResponse = aiResponseOrError as AskMrKnowOutput;

    if (!aiResponse.response) {
        return { error: "Mr. Know didn't provide a response. Please try again." };
    }
    
    return {
        role: 'model',
        parts: [{ text: aiResponse.response }],
        timestamp: new Date().toISOString(),
    };

  } catch (e) {
    console.error("Error in getNextAskMrKnowResponse server action:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred contacting Mr. Know.";
    return { error: `Mr. Know experienced an issue: ${errorMessage}.` };
  }
}

// ---- Code with Me Actions ----
export interface GetProgrammingLanguagesServerInput {
  category: 'frontend' | 'backend';
}
export interface GetProgrammingLanguagesServerOutput {
  languages: string[];
}

export async function getProgrammingLanguages(
  input: GetProgrammingLanguagesServerInput
): Promise<GetProgrammingLanguagesServerOutput | { error: string }> {
  try {
    const aiInput: AIGetProgrammingLanguagesInput = { category: input.category };
    const result = await getProgrammingLanguagesFlow(aiInput);
    return { languages: result.languages || [] };
  } catch (e) {
    console.error("Error fetching programming languages:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error.";
    return { error: `Failed to fetch languages: ${errorMessage}` };
  }
}

export interface StartCodeTeachingSessionInput {
  language: string;
}

export async function startCodeTeachingSession(
  input: StartCodeTeachingSessionInput
): Promise<ActiveCodeTeachingSessionData | { error: string }> {
  try {
    const firstStepInput: AIGetCodeTeachingStepInput = {
      language: input.language,
      currentTopic: "Syntax Basics", 
    };
    const firstStepResult = await getCodeTeachingStepFlow(firstStepInput);

    if (typeof (firstStepResult as any).error === 'string') {
      return { error: `Failed to get first coding step: ${(firstStepResult as any).error}` };
    }
    const validFirstStepResult = firstStepResult as CodeTeachingStepData;

    return {
      language: input.language,
      currentTopic: validFirstStepResult.topic, 
      currentStepData: validFirstStepResult,
      history: [],
    };
  } catch (e) {
    console.error("Error starting code teaching session:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error.";
    return { error: `Failed to start session: ${errorMessage}` };
  }
}

export async function getNextCodeTeachingStep(
  currentSession: ActiveCodeTeachingSessionData,
  userAnswerOrCode?: string
): Promise<CodeTeachingStepData | { error: string }> {
  try {
    const nextStepInput: AIGetCodeTeachingStepInput = {
      language: currentSession.language,
      currentTopic: currentSession.currentStepData.nextTopicSuggestion || currentSession.currentTopic,
      previousExplanation: currentSession.currentStepData.explanation,
      userAnswerOrCode: userAnswerOrCode,
    };
    const nextStepResult = await getCodeTeachingStepFlow(nextStepInput);
    
    if (typeof (nextStepResult as any).error === 'string') {
      return { error: `Failed to get next coding step: ${(nextStepResult as any).error}` };
    }
    return nextStepResult as CodeTeachingStepData;
  } catch (e)
   {
    console.error("Error getting next code teaching step:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error.";
    return { error: `Failed to get next step: ${errorMessage}` };
  }
}

// ---- Tavus Live Tutor Actions ----
export interface TavusConversationDetails {
  conversation_id: string;
  client_secret: string;
  // Add any other relevant fields from Tavus API response
}

// Simulates initiating a Tavus conversation.
// In a real application, this would make a POST request to https://tavusapi.com/v2/conversations
// with the API key in headers and persona_id in the body.
export async function initiateTavusLiveSession(personaId: string): Promise<TavusConversationDetails | { error: string }> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("Tavus API key is not set in .env file.");
    return { error: "Tavus API key is not configured. Please contact support." };
  }
  if (!personaId) {
    return { error: "Persona ID is required to start a Tavus session." };
  }

  // --- SIMULATED API CALL ---
  // console.log(`Simulating Tavus API call to create conversation for persona: ${personaId} with key ${apiKey}`);
  // Replace this with the actual fetch call in a real backend/secure environment
  try {
    // const response = await fetch('https://tavusapi.com/v2/conversations', {
    //   method: 'POST',
    //   headers: {
    //     "Content-Type": "application/json",
    //     "x-api-key": apiKey 
    //   },
    //   body: JSON.stringify({ persona_id: personaId }),
    // });
    // if (!response.ok) {
    //   const errorData = await response.json();
    //   console.error("Tavus API Error:", errorData);
    //   return { error: `Tavus API error: ${errorData.message || response.statusText}` };
    // }
    // const data = await response.json();
    // return { conversation_id: data.conversation_id, client_secret: data.client_secret };
    
    // Simulated success for now:
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const simulatedConversationId = `conv_sim_${Date.now()}`;
    const simulatedClientSecret = `sec_sim_${Math.random().toString(36).substring(2)}`;
    console.log(`Simulated Tavus Session: ID - ${simulatedConversationId}, Secret - ${simulatedClientSecret}`);
    return {
      conversation_id: simulatedConversationId,
      client_secret: simulatedClientSecret,
    };

  } catch (error) {
    console.error('Error initiating Tavus conversation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while initiating Tavus session.";
    return { error: errorMessage };
  }
  // --- END SIMULATED API CALL ---
}
