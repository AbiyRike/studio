
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import { generateFlashcards, type GenerateFlashcardsInput as AIFlashcardsInput } from "@/ai/flows/generate-flashcards";
import { getNextInteractiveTutorStep as getNextTutorStepFlow, type InteractiveTutorInput as AIInteractiveTutorInput } from "@/ai/flows/interactive-tutor-flow";
import { chatWithStudyEthiopiaAI, type AskStudyEthiopiaAIInput as AIAskStudyEthiopiaAIInput, type AskStudyEthiopiaAIOutput } from "@/ai/flows/ask-mr-know-flow"; // Renamed flow, kept variable name for consistency
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

    if (!finalSummary || finalSummary.trim() === "" || finalSummary.toLowerCase().includes("cannot generate summary")) {
      finalSummary = "I wasn't able to generate a detailed summary for this content, perhaps it's very concise already or an image that's best explored directly. Let's dive into some questions!";
    }

    if (!initialQuestions || initialQuestions.length === 0) {
      initialQuestions = [
        {
          question: "It seems I couldn't generate specific questions for this content right away. Perhaps we can start with a general question: What is the main topic of this material?",
          options: ["Topic A", "Topic B", "Topic C", "Let's discuss"],
          answer: 3, // Placeholder, student might need to discuss
          explanation: "Sometimes content is very unique! Let's explore it together."
        }
      ];
       console.warn("AI failed to generate initial questions. Using sample questions.");
       toast({
        title: "Quiz Update",
        description: "I couldn't generate specific questions for this content, but we can still explore it!",
        variant: "default"
       })
    }
    
    const questionsWithExplanation = initialQuestions.map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.answer]}" (option ${q.answer + 1}). Understanding this point is key!`
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

    if (!finalSummary || finalSummary.trim() === "" || finalSummary.toLowerCase().includes("cannot generate summary") || finalSummary.toLowerCase().includes("need some material")) {
      finalSummary = "I wasn't able to generate a detailed summary for this content at the moment, but it has been saved to your knowledge base. You can still use it for quizzes or other features!";
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
          question: "It seems I couldn't generate specific questions for this content right away. Perhaps we can start with a general question: What is the main topic of this material?",
          options: ["Topic A", "Topic B", "Topic C", "Let's discuss"],
          answer: 3, 
          explanation: "Sometimes content is very unique! Let's explore it together."
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
      return { error: "Invalid knowledge base item data. I need some content to make flashcards!" };
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
      // Return an error object instead of empty flashcards to be handled by UI
      return { error: `I couldn't create flashcards from "${documentName}". The content might be too short or not well-suited for flashcards. Try with a different document or more detailed text!` };
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
        documentName: kbItem.documentName,
        documentContent: kbItem.documentContent || "", 
        photoDataUri: kbItem.mediaDataUri,
        currentStep: 0,
    };
    
    const firstStepResult = await getNextTutorStepFlow(firstStepInput);
    
    if (typeof (firstStepResult as any).error === 'string') {
        return { error: `Failed to get first tutoring step: ${(firstStepResult as any).error}` };
    }
    
    const validFirstStepResult = firstStepResult as InteractiveTutorStepData;
     if (validFirstStepResult.topic === "Unable to Proceed" || validFirstStepResult.explanation.includes("No content was provided")) {
      return { error: "The AI Tutor could not start with the provided content. It might be too brief or unsuitable for tutoring." };
    }


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
        documentName: currentSession.documentName,
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
    const validNextStepResult = nextStepResult as InteractiveTutorStepData;
    if (validNextStepResult.topic === "Unable to Proceed" || validNextStepResult.explanation.includes("No content was provided")) {
       return { error: "The AI Tutor feels we've covered the material or cannot proceed further with the current content." };
    }
    return validNextStepResult;

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

// ---- Ask Mr. Know (now Chat with StudyEthiopia AI+) Actions ----
export async function startAskMrKnowSession( // Function name kept for session store key consistency
  kbItem: KnowledgeBaseItem
): Promise<ActiveAskMrKnowSessionData | { error: string }> {
  try {
    if (!kbItem) {
      return { error: "Knowledge base item is required to start a chat session." };
    }
     if (!kbItem.documentContent && !kbItem.mediaDataUri) {
      return { error: "The selected knowledge base item has no text or image content for me to discuss." };
    }
    return {
      kbItemId: kbItem.id,
      documentName: kbItem.documentName,
      documentContent: kbItem.documentContent || "", 
      mediaDataUri: kbItem.mediaDataUri,
      chatHistory: [
        {
          role: 'model', 
          parts: [{ text: `Hello! I'm StudyEthiopia AI+. I'm ready to discuss "${kbItem.documentName}". What would you like to know?` }],
          timestamp: new Date().toISOString(),
        }
      ],
    };
  } catch (e) {
    console.error("Error starting StudyEthiopia AI+ chat session:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { error: `Failed to start chat session: ${errorMessage}` };
  }
}

export async function getNextAskMrKnowResponse( // Function name kept for session store key consistency
  currentSession: ActiveAskMrKnowSessionData,
  userMessage: string
): Promise<AskMrKnowMessage | { error: string }> {
  try {
    if (!userMessage.trim()) {
      return { error: "Your message cannot be empty. What would you like to ask?" };
    }
    const aiInput: AIAskStudyEthiopiaAIInput = {
      documentName: currentSession.documentName,
      documentContent: currentSession.documentContent,
      photoDataUri: currentSession.mediaDataUri,
      chatHistory: currentSession.chatHistory.map(msg => ({ 
        role: msg.role,
        parts: msg.parts.map(p => ({ text: p.text })),
      })), 
      userQuery: userMessage,
    };

    const aiResponseOrError = await chatWithStudyEthiopiaAI(aiInput);

    if ('error' in aiResponseOrError) { 
        return { error: aiResponseOrError.error };
    }
    
    const aiResponse = aiResponseOrError as AskStudyEthiopiaAIOutput;

    if (!aiResponse.response) {
        return { error: "I couldn't formulate a response to that. Could you try rephrasing or asking something else about the material?" };
    }
    
    return {
        role: 'model',
        parts: [{ text: aiResponse.response }],
        timestamp: new Date().toISOString(),
    };

  } catch (e) {
    console.error("Error in getNextAskMrKnowResponse server action:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred contacting StudyEthiopia AI+.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "I'm currently very busy helping other students. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the provided context could not be processed due to safety filters. Perhaps we can try a different phrasing or focus on another aspect of the material?"};
    }
    return { error: `I experienced an issue: ${errorMessage}. Let's try that again, shall we?` };
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
    return { error: `I had trouble fetching languages: ${errorMessage}` };
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
     if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI Code Tutor service is currently busy. Please try again in a few moments." };
    }
    return { error: `Failed to start coding session: ${errorMessage}` };
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
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI Code Tutor service is currently busy. Please try again in a few moments." };
    }
    return { error: `Failed to get next coding step: ${errorMessage}` };
  }
}

// ---- Tavus Live Tutor Actions (Mock Interview) ----
export interface TavusConversationDetails {
  conversation_id: string;
  client_secret: string;
}

export async function initiateTavusLiveSession(personaId: string): Promise<TavusConversationDetails | { error: string }> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("Tavus API key is not set in .env file.");
    return { error: "Mock Interview feature is not fully configured. Please contact support." };
  }
  if (!personaId) {
    return { error: "Persona ID is required to start a session." };
  }

  // --- SIMULATED API CALL FOR NOW ---
  // In a real application, you would use fetch to call the Tavus API:
  // try {
  //   const response = await fetch('https://tavusapi.com/v2/conversations', {
  //     method: 'POST',
  //     headers: {
  //       "Content-Type": "application/json",
  //       "x-api-key": apiKey
  //     },
  //     body: JSON.stringify({ persona_id: personaId }),
  //   });
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     console.error("Tavus API Error:", errorData);
  //     return { error: `Tavus API error: ${errorData.message || response.statusText}` };
  //   }
  //   const data = await response.json();
  //   return { conversation_id: data.conversation_id, client_secret: data.client_secret };
  // } catch (error) {
  //   console.error('Error initiating Tavus conversation:', error);
  //   const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
  //   return { error: `Failed to initiate Tavus session: ${errorMessage}` };
  // }

  // Simulated success for development:
  console.log(`Simulating Tavus API call for persona_id: ${personaId}`);
  await new Promise(resolve => setTimeout(resolve, 750)); // Simulate network delay
  const simulatedConversationId = `sim_conv_${Date.now()}`;
  const simulatedClientSecret = `sim_sec_${Math.random().toString(36).substring(2)}`;
  return {
    conversation_id: simulatedConversationId,
    client_secret: simulatedClientSecret,
  };
}

    
