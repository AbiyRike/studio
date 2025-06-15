
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import { generateFlashcards, type GenerateFlashcardsInput as AIFlashcardsInput } from "@/ai/flows/generate-flashcards";
// Removed import for old interactive tutor flow: import { getNextInteractiveTutorStep as getNextTutorStepFlow, type InteractiveTutorInput as AIInteractiveTutorInput } from "@/ai/flows/interactive-tutor-flow";
import { chatWithStudyEthiopiaAI, type AskStudyEthiopiaAIInput as AIAskStudyEthiopiaAIInput, type AskStudyEthiopiaAIOutput } from "@/ai/flows/ask-mr-know-flow.ts";
import { getProgrammingLanguages as getProgrammingLanguagesFlow, type GetProgrammingLanguagesInput as AIGetProgrammingLanguagesInput } from "@/ai/flows/get-programming-languages-flow.ts";
import { getCodeTeachingStep as getCodeTeachingStepFlow, type GetCodeTeachingStepInput as AIGetCodeTeachingStepInput } from "@/ai/flows/get-code-teaching-step-flow.ts";
import { generateTavusTutorPersonaContextFlow, type GenerateTavusTutorPersonaContextInput, type GenerateTavusTutorPersonaContextOutput } from "@/ai/flows/generate-tavus-tutor-persona-context-flow";
import { getNextTavusTutorTextFlow, type GetNextTavusTutorTextInput, type GetNextTavusTutorTextOutput } from "@/ai/flows/get-next-tavus-tutor-text-flow";


import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";
import { generateId, type KnowledgeBaseItem } from '@/lib/knowledge-base-store'; 
import type { AskMrKnowMessage, ActiveAskMrKnowSessionData, CodeTeachingStepData, ActiveCodeTeachingSessionData, ActiveInteractiveTavusTutorSessionData, ChatHistoryMessage } from '@/lib/session-store'; // Added new Tavus session types


export interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface TutorSessionData { // This is for the Quiz feature
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
          answer: 3, 
          explanation: "Sometimes content is very unique! Let's explore it together."
        }
      ];
       console.warn("AI failed to generate initial questions. Using sample questions.");
       // toast is not available in server actions, logging is appropriate
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

export interface SummarizeAndGetDataForStorageOutput extends KnowledgeBaseItem {}


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
        return { error: "Content processing for quiz generation was blocked by AI safety filters. Please try with different content."};
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

// ---- Tavus-based Interactive Video Tutor Actions ----
export async function startInteractiveTavusTutorSession(
  kbItem: KnowledgeBaseItem
): Promise<ActiveInteractiveTavusTutorSessionData | { error: string }> {
  try {
    if (!kbItem || (!kbItem.documentContent && !kbItem.mediaDataUri)) {
      return { error: "Knowledge base item is missing content. Cannot start Tavus tutor session." };
    }

    const personaInput: GenerateTavusTutorPersonaContextInput = {
        documentName: kbItem.documentName,
        documentContent: kbItem.documentContent || "", 
        mediaDataUri: kbItem.mediaDataUri,
    };
    
    const personaContextResult = await generateTavusTutorPersonaContextFlow(personaInput);
    
    if ('error' in personaContextResult) {
        return { error: `Failed to get first tutoring step: ${personaContextResult.error}` };
    }
    
    // Simulate initial greeting from Tavus based on custom_greeting
    const initialAiText = personaContextResult.custom_greeting || `Hello! I'm StudyEthiopia AI+, your tutor for ${kbItem.documentName}. What would you like to explore first regarding '${kbItem.documentName}'?`;
    // Placeholder for the actual video URL that Tavus would provide for the greeting
    const initialVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; 

    // Simulate Tavus API call to create conversation
    const tavusApiKey = process.env.TAVUS_API_KEY;
    if (!tavusApiKey) {
      console.error("TAVUS_API_KEY not found in .env for startInteractiveTavusTutorSession");
      return { error: "Video Tutor configuration error (API Key). Please contact support." };
    }

    const simulatedConversationId = `tavus_conv_${generateId()}`;
    const simulatedClientSecret = `tavus_secret_${generateId()}`;
    console.log(`Simulated Tavus Conversation Creation for: ${kbItem.documentName}, Persona Context: ${personaContextResult.conversational_context}`);


    const sessionData: ActiveInteractiveTavusTutorSessionData = {
      kbItemId: kbItem.id,
      documentName: kbItem.documentName,
      documentContent: kbItem.documentContent || "",
      mediaDataUri: kbItem.mediaDataUri,
      conversationId: simulatedConversationId, // From simulated Tavus API
      clientSecret: simulatedClientSecret,   // From simulated Tavus API
      chatHistory: [{ role: 'model', text: initialAiText, timestamp: new Date().toISOString() }],
      initialVideoUrl: initialVideoUrl, // URL for the greeting video
      initialAiText: initialAiText,     // Text of the greeting
      tavusPersonaSystemPrompt: personaContextResult.conversational_context, // Store for potential future use if Tavus API structure allows modifying context mid-session
    };
    return sessionData;

  } catch (e) {
    console.error("Error in startInteractiveTavusTutorSession:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
      return { error: "The AI tutor service is currently busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
      return { error: "The content could not be processed by the AI tutor due to safety filters. Please try with different content."};
    }
    // This will catch errors from generateTavusTutorPersonaContextFlow if they are not handled inside it
    return { error: `Failed to start Tavus tutoring session: ${errorMessage}` };
  }
}

export async function getTavusTutorVideoResponse(
  currentSession: ActiveInteractiveTavusTutorSessionData,
  userText: string,
): Promise<{ videoUrl?: string; aiTextResponse?: string; error?: string }> {
  try {
    if (!userText.trim()) {
      return { error: "Your message cannot be empty." };
    }
    
    const aiInput: GetNextTavusTutorTextInput = {
        documentName: currentSession.documentName,
        documentContent: currentSession.documentContent,
        photoDataUri: currentSession.mediaDataUri,
        chatHistory: currentSession.chatHistory.map(m => ({ role: m.role, text: m.text })), // Map to simpler structure for AI
        userQuery: userText,
    };

    const textResult = await getNextTavusTutorTextFlow(aiInput);

    if ('error' in textResult || !textResult.tutorTextResponse) {
        return { error: textResult.error || "The tutor could not generate a text response." };
    }

    // Simulate sending textResult.tutorTextResponse to Tavus for video generation
    // and getting a video URL back.
    console.log(`Simulating Tavus video generation for conversation ${currentSession.conversationId} with text: "${textResult.tutorTextResponse}"`);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); // Simulate API latency

    // Use a different placeholder video for subsequent responses
    const simulatedVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"; 
    
    return {
        videoUrl: simulatedVideoUrl,
        aiTextResponse: textResult.tutorTextResponse,
    };

  } catch (e) {
      console.error("Error getting Tavus tutor video response:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI video tutor service is currently busy. Please try again in a few moments." };
      }
      if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the context could not be processed for video tutoring due to safety filters."};
      }
      return { error: `AI video tutor processing failed. Details: ${errorMessage}.` };
  }
}

export async function endTavusTutorSession(conversationId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const tavusApiKey = process.env.TAVUS_API_KEY;
    if (!tavusApiKey) {
        console.error("TAVUS_API_KEY not found in .env for endTavusTutorSession");
        return { success: false, error: "Video Tutor configuration error (API Key). Cannot end session formally." };
    }

    console.log(`Simulating ending Tavus conversation: ${conversationId}`);
    // In a real scenario:
    // const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, {
    //   method: 'POST',
    //   headers: { 'x-api-key': tavusApiKey }
    // });
    // if (!response.ok) { 
    //   const errorData = await response.json().catch(() => ({}));
    //   return { success: false, error: `Failed to end Tavus session: ${errorData.message || response.statusText}` };
    // }
    // const data = await response.json().catch(() => ({}));
    // return { success: true, message: data.message || "Session ended successfully." };
    
    // Simulated success:
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true, message: "Tavus tutoring session ended successfully (simulated)." };
}


// ---- Ask Mr. Know (now Chat with StudyEthiopia AI+ for persona) Actions ----
export async function startAskMrKnowSession(
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
    console.error("Error starting Ask Mr. Know chat session:", e);
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
      return { error: "Your message cannot be empty. What would you like to ask?" };
    }
    const aiInput: AIAskStudyEthiopiaAIInput = {
      documentName: currentSession.documentName,
      documentContent: currentSession.documentContent,
      photoDataUri: currentSession.mediaDataUri,
      chatHistory: currentSession.chatHistory.map(msg => ({ 
        role: msg.role,
        parts: msg.parts.map(p => ({ text: p.text })), // Ensure parts is an array of objects with text
      })), 
      userQuery: userMessage,
    };

    const aiResponseOrError = await chatWithStudyEthiopiaAI(aiInput);

    if ('error' in aiResponseOrError) { 
        return { error: aiResponseOrError.error };
    }
    
    const aiResponse = aiResponseOrError as AskStudyEthiopiaAIOutput; // Type assertion

    if (!aiResponse.response) {
        // Fallback if AI gives an empty response, which can happen with stricter output schemas or safety filters
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
    // Ensure languages is always an array, even if AI returns null/undefined
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
      currentTopic: "Syntax Basics", // Initial topic for any language
    };
    const firstStepResult = await getCodeTeachingStepFlow(firstStepInput);

    if (typeof (firstStepResult as any).error === 'string') {
      return { error: `Failed to get first coding step: ${(firstStepResult as any).error}` };
    }
    const validFirstStepResult = firstStepResult as CodeTeachingStepData;

    return {
      language: input.language,
      currentTopic: validFirstStepResult.topic, // The AI suggests the specific sub-topic
      currentStepData: validFirstStepResult,
      history: [], // Initialize history
    };
  } catch (e) {
    console.error("Error starting code teaching session:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error.";
     if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI Code Tutor service is currently busy. Please try again in a few moments." };
    }
    // Catch specific errors from the flow if not handled inside
    return { error: `Failed to start coding session: ${errorMessage}` };
  }
}

export async function getNextCodeTeachingStep(
  currentSession: ActiveCodeTeachingSessionData,
  userAnswerOrCode?: string
): Promise<CodeTeachingStepData | { error: string }> {
  try {
    // Determine the next topic based on the AI's suggestion from the *previous* step.
    const nextTopic = currentSession.currentStepData.nextTopicSuggestion || currentSession.currentTopic;

    const nextStepInput: AIGetCodeTeachingStepInput = {
      language: currentSession.language,
      currentTopic: nextTopic, 
      previousExplanation: currentSession.currentStepData.explanation,
      userAnswerOrCode: userAnswerOrCode,
    };
    const nextStepResult = await getCodeTeachingStepFlow(nextStepInput);
    
    if (typeof (nextStepResult as any).error === 'string') {
      return { error: `Failed to get next coding step: ${(nextStepResult as any).error}` };
    }
    return nextStepResult as CodeTeachingStepData; // Type assertion
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

// ---- Tavus Live (Mock Interview) Actions ----
export interface TavusConversationDetails {
  conversation_id: string;
  client_secret: string;
  initial_video_url?: string; // Added for the initial greeting video
  initial_ai_text?: string;   // Added for the initial greeting text
}

// Persona ID for Jane Smith, Case Interviewer
const TAVUS_PERSONA_ID_JANE_SMITH = "pc55154f229a";

export async function initiateTavusLiveSession(personaId: string): Promise<TavusConversationDetails | { error: string }> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("Tavus API key is not set in .env file (TAVUS_API_KEY).");
    return { error: "Mock Interview feature is not fully configured. API Key missing." };
  }
  if (!personaId) {
    return { error: "Persona ID is required to start a session." };
  }

  // SIMULATED API CALL for initiating a conversation
  console.log(`Simulating Tavus API call to v2/conversations for persona_id: ${personaId}`);
  await new Promise(resolve => setTimeout(resolve, 750)); // Simulate network delay

  const simulatedConversationId = `sim_conv_${Date.now()}`;
  const simulatedClientSecret = `sim_sec_${Math.random().toString(36).substring(2)}`;
  
  let initialAiText = "Hello! I'm ready for our session.";
  let initialVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"; // Generic placeholder

  if (personaId === TAVUS_PERSONA_ID_JANE_SMITH) {
    initialAiText = "Hi there, I'm Jane Smith, a Principal at Morrison & Blackwell. It's great to connect with you today. Before we dive into the case, could you tell me a little bit about your background and what brings you to Morrison & Blackwell?";
    initialVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; // Jane's intro video placeholder
  }
  
  return {
    conversation_id: simulatedConversationId,
    client_secret: simulatedClientSecret,
    initial_video_url: initialVideoUrl,
    initial_ai_text: initialAiText,
  };
}

export async function sendTavusMessageAndGetVideo(
  conversationId: string,
  text: string,
  personaId: string // Added to determine AI's response style if needed for simulation
): Promise<{ videoUrl?: string; aiTextResponse?: string; error?: string }> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("Tavus API key is not set in .env file (TAVUS_API_KEY).");
    return { error: "Mock Interview feature is not fully configured. API Key missing." };
  }

  // SIMULATED API CALL for sending a message and getting a video response
  console.log(`Simulating Tavus API call to send message in conversation ${conversationId}. User text: "${text}"`);
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); // Simulate processing and video generation

  let aiResponseText = "That's an interesting point. Let's explore that further. (Simulated video response)";
  if (personaId === TAVUS_PERSONA_ID_JANE_SMITH) {
    // Simulate a more contextual response for Jane
    if (text.toLowerCase().includes("background") || text.toLowerCase().includes("about me")) {
        aiResponseText = "Thank you for sharing that. Now, let's dive into the case. SodaPop Inc. is considering launching 'Light Bolt', a low-sugar, electrolyte-focused sports drink. How would you approach analyzing this market opportunity for them? (Simulated video response)";
    } else if (text.toLowerCase().includes("market size") || text.toLowerCase().includes("profitability")) {
        aiResponseText = "Good question. For the purpose of this initial discussion, let's assume the sports drink market is substantial and growing. What key factors would you consider to assess the potential profitability of Light Bolt? (Simulated video response)";
    } else {
        aiResponseText = "Okay, interesting. And what would be your next step in thinking about this? (Simulated video response)";
    }
  }

  const simulatedVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"; // Different placeholder

  return {
    videoUrl: simulatedVideoUrl,
    aiTextResponse: aiResponseText,
  };
}

export async function endTavusLiveSession(conversationId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const tavusApiKey = process.env.TAVUS_API_KEY;
    if (!tavusApiKey) {
        console.error("TAVUS_API_KEY not found in .env for endTavusLiveSession");
        return { success: false, error: "Mock Interview feature is not fully configured. API Key missing." };
    }

    console.log(`Simulating ending Tavus conversation: ${conversationId}`);
    // In a real scenario:
    // const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, {
    //   method: 'POST',
    //   headers: { 'x-api-key': tavusApiKey }
    // });
    // ... handle response ...
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API call
    return { success: true, message: "Tavus live session ended successfully (simulated)." };
}

// Helper to ensure toast is only called on client, not directly in server actions
// This is a placeholder, actual toast calls should be in client components
const showClientToast = (options: { title: string, description: string, variant?: "default" | "destructive" }) => {
  if (typeof window !== 'undefined') {
    // This function is a stub. In a real app, you might use a global event bus
    // or a state management solution to trigger toasts from server action responses.
    console.log(`TOAST (server-side log): ${options.title} - ${options.description}`);
  }
};

    