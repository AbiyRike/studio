
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import { generateFlashcards, type GenerateFlashcardsInput as AIFlashcardsInput } from "@/ai/flows/generate-flashcards";
import { getNextInteractiveTutorStep as getNextTextTutorStepFlow, type InteractiveTutorInput as TextTutorInput, type InteractiveTutorOutput as TextTutorOutput } from "@/ai/flows/interactive-tutor-flow"; // Aliased
import { chatWithStudyEthiopiaAI, type AskStudyEthiopiaAIInput as AIAskStudyEthiopiaAIInput, type AskStudyEthiopiaAIOutput } from "@/ai/flows/ask-mr-know-flow";
import { getProgrammingLanguages as getProgrammingLanguagesFlow, type GetProgrammingLanguagesInput as AIGetProgrammingLanguagesInput } from "@/ai/flows/get-programming-languages-flow.ts";
import { getCodeTeachingStep as getCodeTeachingStepFlow, type GetCodeTeachingStepInput as AIGetCodeTeachingStepInput, type GetCodeTeachingStepOutput as AIGetCodeTeachingStepOutput } from "@/ai/flows/get-code-teaching-step-flow.ts";
import { generateTavusTutorPersonaContext, type GenerateTavusTutorPersonaContextInput } from "@/ai/flows/generate-tavus-tutor-persona-context-flow";
import { getNextTavusTutorText as getNextTavusTutorTextFlow, type GetNextTavusTutorTextInput } from "@/ai/flows/get-next-tavus-tutor-text-flow";


import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";
import { generateId, type KnowledgeBaseItem } from '@/lib/knowledge-base-store'; 
import type { AskMrKnowMessage, ActiveAskMrKnowSessionData, CodeTeachingStepData, ActiveCodeTeachingSessionData, ActiveInteractiveTavusTutorSessionData, ChatHistoryMessage as TavusChatMessage } from '@/lib/session-store'; 


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
  documentContent?: string; // Made optional as media can be primary
  mediaDataUri?: string;
  summary: string; 
}

export async function generateQuizSessionFromKBItem(
  input: GenerateQuizFromKBItemInput
): Promise<TutorSessionData | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri, summary } = input;

    if (!documentName || (!documentContent && !mediaDataUri)) {
      return { error: "Invalid knowledge base item data provided. Document name and content (text or media) are required." };
    }

    const aiInitialQuestionsInput: AIQuestionsInput = {
      documentContent: documentContent || "", // Pass empty string if not available
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
      documentContent: documentContent || "",
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
  documentContent?: string; // Made optional
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
      documentContent: documentContent || "",
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
export async function startInteractiveTutorSession( 
  kbItem: KnowledgeBaseItem
): Promise<ActiveInteractiveTavusTutorSessionData | { error: string }> {
  try {
    if (!kbItem || (!kbItem.documentContent && !kbItem.mediaDataUri)) {
      return { error: "Knowledge base item is missing content. Cannot start video tutor session." };
    }

    const personaInput: GenerateTavusTutorPersonaContextInput = {
        documentName: kbItem.documentName,
        documentContent: kbItem.documentContent || "", 
        mediaDataUri: kbItem.mediaDataUri,
    };
    
    const personaContextResult = await generateTavusTutorPersonaContext(personaInput);
    
    if ('error' in personaContextResult || !personaContextResult.conversation_name || !personaContextResult.conversational_context || !personaContextResult.custom_greeting) {
        return { error: `Failed to generate tutor persona: ${personaContextResult.error || "Incomplete persona data returned."}` };
    }
    
    const tavusApiKey = process.env.TAVUS_API_KEY;
    if (!tavusApiKey) {
      console.error("TAVUS_API_KEY not found in .env for startInteractiveTutorSession (Video Tutor)");
      return { error: "Video Tutor configuration error (API Key). Please contact support." };
    }

    console.log(`SIMULATING Tavus Conversation Creation for Video Tutor:
      Replica ID: r_generic_tutor_replica (Placeholder)
      Conversation Name: ${personaContextResult.conversation_name}
      Conversational Context (System Prompt for Tavus): ${personaContextResult.conversational_context}
      Custom Greeting: ${personaContextResult.custom_greeting}
      Properties: max_call_duration: 3600, enable_recording: true, etc.
    `);

    // Simulate actual API call
    // const options = {
    //   method: 'POST',
    //   headers: {'x-api-key': tavusApiKey, 'Content-Type': 'application/json'},
    //   body: JSON.stringify({
    //     replica_id: "r_generic_tutor_replica", // Replace with actual generic replica if available
    //     persona_id: "p_generic_tutor_persona", // Replace with actual generic persona if available
    //     conversation_name: personaContextResult.conversation_name,
    //     conversational_context: personaContextResult.conversational_context,
    //     custom_greeting: personaContextResult.custom_greeting,
    //     properties: { 
    //       max_call_duration: 3600, enable_recording: true, enable_closed_captions: true, language: "english" 
    //     }
    //   })
    // };
    // try {
    //   const response = await fetch('https://tavusapi.com/v2/conversations', options);
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     console.error("Tavus API error (create conversation):", errorData);
    //     return { error: `Tavus API error: ${errorData.message || response.statusText}`};
    //   }
    //   const tavusData = await response.json();
    //   const conversationId = tavusData.conversation_id;
    //   const clientSecret = tavusData.client_secret;
    //   // The initial video/text might come from a webhook or first message if not part of creation response.
    //   // For now, we'll use the custom_greeting as the initial AI text.
    // } catch (fetchError) {
    //   console.error("Fetch error calling Tavus API:", fetchError);
    //   return { error: "Network error connecting to Tavus API for video tutor." };
    // }


    const simulatedConversationId = `tavus_tutor_conv_${generateId()}`;
    const simulatedClientSecret = `tavus_tutor_secret_${generateId()}`;
    
    // Simulate initial video URL from Tavus based on custom_greeting
    // This would normally be the first video Tavus sends back after conversation creation or first interaction
    const initialVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"; // Placeholder

    const sessionData: ActiveInteractiveTavusTutorSessionData = {
      kbItemId: kbItem.id,
      documentName: kbItem.documentName,
      documentContent: kbItem.documentContent || "",
      mediaDataUri: kbItem.mediaDataUri,
      conversationId: simulatedConversationId, 
      clientSecret: simulatedClientSecret,  
      chatHistory: [{ role: 'model', text: personaContextResult.custom_greeting, timestamp: new Date().toISOString() }],
      initialVideoUrl: initialVideoUrl, 
      initialAiText: personaContextResult.custom_greeting,
      tavusPersonaSystemPrompt: personaContextResult.conversational_context,
    };
    return sessionData;

  } catch (e) {
    console.error("Error in startInteractiveTutorSession (Video Tutor):", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
      return { error: "The AI video tutor service is currently busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
      return { error: "The content could not be processed by the video tutor due to safety filters. Please try with different content."};
    }
    return { error: `Failed to start video tutoring session: ${errorMessage}` };
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
        chatHistory: currentSession.chatHistory.map(m => ({ role: m.role, text: m.text })),
        userQuery: userText,
    };

    const textResult = await getNextTavusTutorTextFlow(aiInput);

    if ('error' in textResult || !textResult.tutorTextResponse) {
        return { error: textResult.error || "The tutor could not generate a text response." };
    }

    const tavusApiKey = process.env.TAVUS_API_KEY;
    if (!tavusApiKey) {
      console.error("TAVUS_API_KEY not found for getTavusTutorVideoResponse");
      return { error: "Video Tutor configuration error (API Key).", aiTextResponse: textResult.tutorTextResponse };
    }

    console.log(`SIMULATING Tavus video generation for VIDEO TUTOR conversation ${currentSession.conversationId} with text: "${textResult.tutorTextResponse}"`);
    // In a real Tavus integration, you would send textResult.tutorTextResponse to Tavus API
    // (e.g., POST /v2/conversations/{conversation_id}/generate_video or via SDK methods)
    // and then receive a video URL.
    
    // Simulate API call latency
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); 

    const simulatedVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"; // Placeholder for subsequent videos
    
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

    console.log(`SIMULATING ending Tavus conversation: ${conversationId}`);
    // Real API call: POST https://tavusapi.com/v2/conversations/{conversation_id}/end
    // const options = {method: 'POST', headers: {'x-api-key': tavusApiKey}};
    // try {
    //   const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, options);
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     return { success: false, error: `Failed to end Tavus session: ${errorData.message || response.statusText}` };
    //   }
    // } catch (fetchError) {
    //   console.error("Fetch error ending Tavus session:", fetchError);
    //   return { success: false, error: "Network error connecting to Tavus API to end session." };
    // }
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true, message: "Tavus tutoring session ended successfully (simulated)." };
}


// ---- Ask Mr. Know (Chat with StudyEthiopia AI+) Actions ----
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
    const firstStepResultOrError = await getCodeTeachingStepFlow(firstStepInput);

    if ('error' in firstStepResultOrError) {
      return { error: `Failed to get first coding step: ${firstStepResultOrError.error}` };
    }
    const firstStepResult = firstStepResultOrError as AIGetCodeTeachingStepOutput;


    return {
      language: input.language,
      currentTopic: firstStepResult.topic, 
      currentStepData: firstStepResult,
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
    const nextTopic = currentSession.currentStepData.nextTopicSuggestion || currentSession.currentTopic;

    const nextStepInput: AIGetCodeTeachingStepInput = {
      language: currentSession.language,
      currentTopic: nextTopic, 
      previousExplanation: currentSession.currentStepData.explanation,
      userAnswerOrCode: userAnswerOrCode,
    };
    const nextStepResultOrError = await getCodeTeachingStepFlow(nextStepInput);
    
    if ('error' in nextStepResultOrError) {
      return { error: `Failed to get next coding step: ${nextStepResultOrError.error}` };
    }
    return nextStepResultOrError as CodeTeachingStepData;
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
  initial_video_url?: string; 
  initial_ai_text?: string;   
}

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

  console.log(`Simulating Tavus API call to v2/conversations for persona_id: ${personaId}`);
  await new Promise(resolve => setTimeout(resolve, 750)); 

  const simulatedConversationId = `sim_conv_${Date.now()}`;
  const simulatedClientSecret = `sim_sec_${Math.random().toString(36).substring(2)}`;
  
  let initialAiText = "Hello! I'm ready for our session.";
  let initialVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"; 

  if (personaId === TAVUS_PERSONA_ID_JANE_SMITH) {
    initialAiText = "Hi there, I'm Jane Smith, a Principal at Morrison & Blackwell. It's great to connect with you today. Before we dive into the case, could you tell me a little bit about your background and what brings you to Morrison & Blackwell?";
    initialVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }
  
  // Real API call to Tavus:
  // const tavusOptions = {
  //     method: 'POST',
  //     headers: {'x-api-key': apiKey, 'Content-Type': 'application/json'},
  //     body: JSON.stringify({
  //       replica_id: "r79e1c033f", // Example replica_id from user docs
  //       persona_id: personaId,
  //       conversation_name: personaId === TAVUS_PERSONA_ID_JANE_SMITH ? "Mock Interview with Jane Smith" : "Tavus Live Session",
  //       conversational_context: personaId === TAVUS_PERSONA_ID_JANE_SMITH ? "You are Jane Smith conducting a case interview." : "You are a helpful AI assistant.", // Simplified, full context from persona config
  //       custom_greeting: personaId === TAVUS_PERSONA_ID_JANE_SMITH ? initialAiText : undefined, // Use persona's default or this
  //       properties: { max_call_duration:3600, enable_recording:true, enable_closed_captions:true, language:"english" }
  //     })
  //   };
  // try {
  //   const response = await fetch('https://tavusapi.com/v2/conversations', tavusOptions);
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     console.error("Tavus API error (create conversation):", errorData);
  //     return { error: `Tavus API error: ${errorData.message || response.statusText}`};
  //   }
  //   const tavusData = await response.json();
  //   // Real data extraction:
  //   // const conversationId = tavusData.conversation_id;
  //   // const clientSecret = tavusData.client_secret;
  //   // initialVideoUrl and initialAiText might come from a webhook or a follow-up GET /conversations/{id} or first message event
  // } catch (fetchError) {
  //     console.error("Fetch error calling Tavus API:", fetchError);
  //     return { error: "Network error connecting to Tavus API." };
  // }

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
  personaId: string 
): Promise<{ videoUrl?: string; aiTextResponse?: string; error?: string }> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("Tavus API key is not set in .env file (TAVUS_API_KEY).");
    return { error: "Feature is not fully configured. API Key missing." };
  }

  console.log(`Simulating Tavus API call to send message in conversation ${conversationId}. User text: "${text}" for persona ${personaId}`);
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); 

  let aiResponseText = "That's an interesting point. Let's explore that further. (Simulated video response)";
  if (personaId === TAVUS_PERSONA_ID_JANE_SMITH) {
    if (text.toLowerCase().includes("background") || text.toLowerCase().includes("about me")) {
        aiResponseText = "Thank you for sharing that. Now, let's dive into the case. SodaPop Inc. is considering launching 'Light Bolt', a low-sugar, electrolyte-focused sports drink. How would you approach analyzing this market opportunity for them? (Simulated video response)";
    } else if (text.toLowerCase().includes("market size") || text.toLowerCase().includes("profitability")) {
        aiResponseText = "Good question. For the purpose of this initial discussion, let's assume the sports drink market is substantial and growing. What key factors would you consider to assess the potential profitability of Light Bolt? (Simulated video response)";
    } else if (text.toLowerCase().includes("strategy") || text.toLowerCase().includes("capture market share")) {
        aiResponseText = "That's a valid consideration. What specific strategies could SodaPop Inc. employ to effectively capture market share for 'Light Bolt' against established players? (Simulated video response)";
    } else if (text.toLowerCase().includes("risks") || text.toLowerCase().includes("challenges")) {
        aiResponseText = "Identifying risks is crucial. What are some potential challenges or risks SodaPop Inc. might face with this new product launch? (Simulated video response)";
    } else if (text.toLowerCase().includes("thank you") || text.toLowerCase().includes("appreciate it")) {
        aiResponseText = "You're welcome. Do you have any questions for me about Morrison & Blackwell or the role? (Simulated video response)";
    }
     else {
        aiResponseText = "Okay, interesting. And what would be your next step in thinking about this? Or do you have any clarifying questions about the case so far? (Simulated video response)";
    }
  }
  
  // Simulate actual video generation by Tavus. This would involve:
  // POST /v2/conversations/{conversation_id}/generate_video with { "text": aiResponseText, "controls": { "end_call": false } }
  // Then polling GET /v2/videos/{video_id} or waiting for a webhook.
  // For this simulation, we return a placeholder video.
  const simulatedVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"; 

  return {
    videoUrl: simulatedVideoUrl,
    aiTextResponse: aiResponseText,
  };
}

export async function endTavusLiveSession(conversationId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const tavusApiKey = process.env.TAVUS_API_KEY;
    if (!tavusApiKey) {
        console.error("TAVUS_API_KEY not found in .env for endTavusLiveSession");
        return { success: false, error: "Feature is not fully configured. API Key missing." };
    }

    console.log(`Simulating ending Tavus conversation: ${conversationId}`);
    // Real API call: POST https://tavusapi.com/v2/conversations/{conversation_id}/end
    // const options = {method: 'POST', headers: {'x-api-key': tavusApiKey}};
    // try {
    //   const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, options);
    //   if (!response.ok) { /* ... error handling ... */ }
    // } catch (fetchError) { /* ... error handling ... */ }
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return { success: true, message: "Tavus live session ended successfully (simulated)." };
}


// ----- Legacy Text-Based Interactive Tutor - Retained for reference or specific use cases -----
export async function getNextInteractiveTextTutorStep(
  sessionData: { documentName: string, documentContent: string, mediaDataUri?: string, currentTopic?: string, previousExplanation?: string, currentStep: number },
  userQuizAnswer?: string
): Promise<TextTutorOutput | { error: string }> {
  try {
    const input: TextTutorInput = {
      documentName: sessionData.documentName,
      documentContent: sessionData.documentContent,
      photoDataUri: sessionData.mediaDataUri,
      currentTopic: sessionData.currentTopic,
      previousExplanation: sessionData.previousExplanation,
      userQuizAnswer: userQuizAnswer,
      currentStep: sessionData.currentStep,
    };
    const result = await getNextTextTutorStepFlow(input);
    return result;
  } catch (e) {
    console.error('Error getting next text tutor step:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error in text tutor step.';
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI tutor is currently very busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content or your response could not be processed by the tutor due to safety filters. Let's try a different angle."};
    }
    return { error: `AI text tutor encountered an issue: ${errorMessage}` };
  }
}
