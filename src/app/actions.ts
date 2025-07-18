
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import { generateFlashcards as generateFlashcardsFlowInternal, type GenerateFlashcardsInput as AIGenerateFlashcardsInput } from "@/ai/flows/generate-flashcards"; 
// Updated import for the dynamic tutor flow
import { getNextInteractiveTutorStep as getNextDynamicTutorStepFlow, type InteractiveTutorInput as DynamicTutorInput, type InteractiveTutorOutput as DynamicTutorOutput } from "@/ai/flows/interactive-tutor-flow"; 

import { chatWithStudyEthiopiaAI, type AskStudyEthiopiaAIInput as AIAskStudyEthiopiaAIInput, type AskStudyEthiopiaAIOutput } from "@/ai/flows/ask-mr-know-flow";
import { getProgrammingLanguages as getProgrammingLanguagesFlow, type GetProgrammingLanguagesInput as AIGetProgrammingLanguagesInput } from "@/ai/flows/get-programming-languages-flow.ts";
import { getCodeTeachingStep as getCodeTeachingStepFlow, type GetCodeTeachingStepInput as AIGetCodeTeachingStepInput, type GetCodeTeachingStepOutput as AIGetCodeTeachingStepOutput } from "@/ai/flows/get-code-teaching-step-flow.ts";

import { analyzeCode as analyzeCodeFlow, type AnalyzeCodeInput as AIAnalyzeCodeInput, type AnalyzeCodeOutput as AIAnalyzeCodeOutput } from "@/ai/flows/analyze-code-flow";
import { explainCode as explainCodeFlow, type ExplainCodeInput as AIExplainCodeInput, type ExplainCodeOutput as AIExplainCodeOutput } from "@/ai/flows/explain-code-flow";
import { optimizeCode as optimizeCodeFlow, type OptimizeCodeInput as AIOptimizeCodeInput, type OptimizeCodeOutput as AIOptimizeCodeOutput } from "@/ai/flows/optimize-code-flow";


import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";
import { generateId, type KnowledgeBaseItem } from '@/lib/knowledge-base-store'; 
import type { Flashcard as AppFlashcard } from '@/ai/flows/generate-flashcards'; 
// Updated import for new session data types
import type { AskMrKnowMessage, ActiveAskMrKnowSessionData, CodeTeachingStepData, ActiveCodeTeachingSessionData, ActiveDynamicTutorSessionData, ActiveCodeWizSessionData } from '@/lib/session-store'; 


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

export interface UpdateKnowledgeItemDetailsInput {
  id: string;
  documentName: string;
  documentContent: string;
  mediaDataUri?: string; 
  createdAt: string;     
}

export async function updateKnowledgeItemDetails(
  input: UpdateKnowledgeItemDetailsInput
): Promise<KnowledgeBaseItem | { error: string }> {
  try {
    const { id, documentName, documentContent, mediaDataUri, createdAt } = input;

    if (!documentName.trim()) {
      return { error: "Document name cannot be empty." };
    }
    if (!documentContent.trim() && !mediaDataUri) { 
      return { error: "Document content or associated media is required for summarization." };
    }

    const aiSummarizeInput: SummarizeDocumentInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
    };
    const summaryResult = await summarizeDocument(aiSummarizeInput);
    let newSummary = summaryResult.summary;

    if (!newSummary || newSummary.trim() === "" || newSummary.toLowerCase().includes("cannot generate summary") || newSummary.toLowerCase().includes("need some material")) {
      newSummary = "I wasn't able to generate an updated summary for this content, but your changes have been saved. The previous summary might still be relevant or you can try editing again.";
    }

    const updatedItem: KnowledgeBaseItem = {
      id,
      documentName,
      documentContent,
      mediaDataUri,
      summary: newSummary,
      createdAt, 
      updatedAt: new Date().toISOString(), 
    };

    return updatedItem;

  } catch (e) {
    console.error("Error in updateKnowledgeItemDetails:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is currently busy. Please try again later." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content changes could not be processed due to safety filters."};
    }
    return { error: `AI processing failed during update. Details: ${errorMessage}.` };
  }
}


export interface GenerateQuizFromKBItemInput {
  documentName: string;
  documentContent?: string; 
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
      documentContent: documentContent || "", 
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


export type { AppFlashcard }; 

export interface FlashcardSessionData {
  documentName: string;
  flashcards: AppFlashcard[];
  documentContent: string; 
  mediaDataUri?: string;   
}

export interface GenerateFlashcardsFromKBItemInput {
  documentName: string;
  documentContent?: string;
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

    const aiFlashcardsInput: AIGenerateFlashcardsInput = {
      documentContent: documentContent || "",
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfFlashcards: 10, 
    };

    const flashcardsResult = await generateFlashcardsFlowInternal(aiFlashcardsInput);
    let createdFlashcards = flashcardsResult.flashcards;

    if (!createdFlashcards || createdFlashcards.length === 0) {
      console.warn(`AI failed to generate initial flashcards for "${documentName}".`);
      return {
        documentName,
        flashcards: [],
        documentContent: documentContent || "",
        mediaDataUri: mediaDataUri,
      };
    }

    return {
      documentName,
      flashcards: createdFlashcards,
      documentContent: documentContent || "",
      mediaDataUri: mediaDataUri,
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

export interface GenerateMoreFlashcardsInput {
  documentName: string;
  documentContent: string;
  mediaDataUri?: string;
  allPreviousTerms: string[];
  count: number;
}

export async function generateMoreFlashcards(
  input: GenerateMoreFlashcardsInput
): Promise<{ flashcards: AppFlashcard[] } | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri, allPreviousTerms, count } = input;

    if (!documentName || (!documentContent && !mediaDataUri)) {
      return { error: "Content missing for generating more flashcards." };
    }
    if (allPreviousTerms.length >= 50) { 
        return { flashcards: [] }; 
    }

    const aiFlashcardsInput: AIGenerateFlashcardsInput = {
      documentContent: documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfFlashcards: count,
      previousFlashcardTerms: allPreviousTerms,
    };

    const flashcardsResult = await generateFlashcardsFlowInternal(aiFlashcardsInput);
    
    if (!flashcardsResult.flashcards) { 
        console.warn(`AI returned null or undefined flashcards array for "more" in "${documentName}".`);
        return { flashcards: [] };
    }

    return {
      flashcards: flashcardsResult.flashcards,
    };

  } catch (e) {
    console.error("Error in generateMoreFlashcards:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
     if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI service is busy. Please try again later." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Content processing for more flashcards was blocked by AI safety filters."};
    }
    return { error: `AI processing failed for more flashcards. Details: ${errorMessage}.` };
  }
}


// ---- Dynamic Interactive Tutor Actions ----
export async function startDynamicTutorSession( 
  kbItem: KnowledgeBaseItem
): Promise<ActiveDynamicTutorSessionData | { error: string }> {
  try {
    if (!kbItem || (!kbItem.documentContent && !kbItem.mediaDataUri)) {
      return { error: "Knowledge base item is missing content. Cannot start dynamic tutor session." };
    }
    
    const firstStepInput: DynamicTutorInput = {
        documentName: kbItem.documentName,
        documentContent: kbItem.documentContent || "",
        photoDataUri: kbItem.mediaDataUri,
        currentLearningContext: "Start of session",
        interactionMode: "teach",
    };
    
    const firstStepResultOrError = await getNextDynamicTutorStepFlow(firstStepInput);

    if ('error' in firstStepResultOrError) {
        return { error: `Failed to get the first tutoring step: ${firstStepResultOrError.error}` };
    }
    
    const firstStepData = firstStepResultOrError as DynamicTutorOutput;

    if (firstStepData.mode !== "teach" || !firstStepData.teachingScene) {
      return { error: "AI did not return a valid initial teaching scene." };
    }
    
    const sessionData: ActiveDynamicTutorSessionData = {
      id: `dyn_${generateId()}`,
      kbItemId: kbItem.id,
      documentName: kbItem.documentName,
      documentContent: kbItem.documentContent || "",
      mediaDataUri: kbItem.mediaDataUri,
      currentTeachingScene: firstStepData.teachingScene,
      currentQuizData: null,
      quizFeedback: null,
      currentMode: "teaching",
      isTtsMuted: false,
      cumulativeLearningContext: `Topic: ${firstStepData.teachingScene.title}. Initial content: ${firstStepData.teachingScene.description.substring(0,150)}...`, 
      userQuestionsHistory: [],
      //presentationStateBeforeQuery: null, // Initialize this for the new interruptible feature
    };
    return sessionData;

  } catch (e) {
    console.error("Error in startDynamicTutorSession:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
      return { error: "The AI tutor service is currently busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
      return { error: "The content could not be processed by the tutor due to safety filters. Please try with different content."};
    }
    return { error: `Failed to start dynamic tutoring session: ${errorMessage}` };
  }
}

export interface GetNextDynamicTutorResponseInput {
    currentSessionData: ActiveDynamicTutorSessionData;
    interactionMode: "teach" | "generate_quiz" | "evaluate_answer" | "answer_query";
    userQueryOrAnswer?: string; 
}

export async function getNextDynamicTutorResponse(
  input: GetNextDynamicTutorResponseInput
): Promise<DynamicTutorOutput | { error: string }> {
  try {
    const { currentSessionData, interactionMode, userQueryOrAnswer } = input;

    let learningContext = currentSessionData.cumulativeLearningContext || "General knowledge about " + currentSessionData.documentName;
    
    if (interactionMode === "generate_quiz" && currentSessionData.currentTeachingScene) {
        learningContext = `Based on the topic: "${currentSessionData.currentTeachingScene.title}", which explained: "${currentSessionData.currentTeachingScene.description.substring(0, 250)}..."`;
    } else if (interactionMode === "answer_query" && currentSessionData.currentTeachingScene) {
        // For answering a query, the context is the specific scene the user was viewing
        learningContext = `The user is currently viewing a presentation slide titled "${currentSessionData.currentTeachingScene.title}" with the content: "${currentSessionData.currentTeachingScene.description.substring(0,300)}...". They have the following question related to this or the broader topic of ${currentSessionData.documentName}.`;
    } else if (interactionMode === "teach" && currentSessionData.userQuestionsHistory && currentSessionData.userQuestionsHistory.length > 0) {
        const lastQuestion = currentSessionData.userQuestionsHistory[currentSessionData.userQuestionsHistory.length-1];
        if (lastQuestion.interactionMode === "answer_query") {
            learningContext += `\nPreviously, the user asked: "${lastQuestion.userQueryOrAnswer}" and you responded. Now continue the presentation.`;
        }
    }
    
    let questionContextForEval: string | undefined = undefined;
    if (interactionMode === "evaluate_answer" && currentSessionData.currentQuizData) {
        questionContextForEval = currentSessionData.currentQuizData.question;
    }

    const aiInput: DynamicTutorInput = {
        documentName: currentSessionData.documentName,
        documentContent: currentSessionData.documentContent,
        photoDataUri: currentSessionData.mediaDataUri,
        currentLearningContext: learningContext,
        interactionMode: interactionMode,
        userQueryOrAnswer: userQueryOrAnswer,
        quizQuestionContext: questionContextForEval,
    };

    const result = await getNextDynamicTutorStepFlow(aiInput);
    
    if ('error' in result) return result;
    
    if (result.mode === "teach" && !result.teachingScene) {
        return { error: "The AI tutor an incomplete teaching response. Please try again." };
    }
    if (result.mode === "quiz" && !result.quiz) {
        return { error: "The AI tutor an incomplete quiz response. Please try again." };
    }
    if (result.mode === "feedback" && !result.feedback) {
        return { error: "The AI tutor an incomplete feedback response. Please try again." };
    }
    if (result.mode === "answer_query" && !result.aiQueryResponseText) {
        return { error: "The AI tutor failed to provide an answer to your query. Please try rephrasing." };
    }
    return result;

  } catch (e)
   {
      console.error("Error getting next dynamic tutor response:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI tutor service is currently busy. Please try again." };
      }
      if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the context could not be processed due to safety filters."};
      }
      return { error: `AI tutor processing failed. Details: ${errorMessage}.` };
  }
}


// ---- Ask Mr. Know (Chat with Study AI+) Actions ----
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
          parts: [{ text: `Hello! I'm Study AI+. I'm ready to discuss "${kbItem.documentName}". What would you like to know?` }],
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
    
    const aiResponse = aiResponseOrError as AIAskStudyEthiopiaAIOutput;

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
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred contacting Study AI+.";
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
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return { success: true, message: "Tavus live session ended successfully (simulated)." };
}


// ---- Code Wiz Actions ----
export interface AnalyzeCodeActionInput {
  code: string;
  languageHint?: string;
}
export async function analyzeCodeAction(input: AnalyzeCodeActionInput): Promise<AIAnalyzeCodeOutput | { error: string }> {
  try {
    return await analyzeCodeFlow(input);
  } catch (e) {
    console.error("Error in analyzeCodeAction:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during code analysis.";
    return { error: `Code analysis failed: ${errorMessage}` };
  }
}

export interface ExplainCodeActionInput {
  code: string;
  languageHint?: string;
}
export async function explainCodeAction(input: ExplainCodeActionInput): Promise<AIExplainCodeOutput | { error: string }> {
  try {
    return await explainCodeFlow(input);
  } catch (e) {
    console.error("Error in explainCodeAction:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during code explanation.";
    return { error: `Code explanation failed: ${errorMessage}` };
  }
}

export interface OptimizeCodeActionInput {
  code: string;
  languageHint?: string;
}
export async function optimizeCodeAction(input: OptimizeCodeActionInput): Promise<AIOptimizeCodeOutput | { error: string }> {
  try {
    return await optimizeCodeFlow(input);
  } catch (e) {
    console.error("Error in optimizeCodeAction:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during code optimization.";
    return { error: `Code optimization failed: ${errorMessage}` };
  }
}

export async function fetchCodeFromUrlAction(url: string): Promise<{ code: string } | { error: string }> {
  try {
    if (!url || !url.trim()) {
      return { error: "URL cannot be empty." };
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { error: "Invalid URL. Must start with http:// or https://" };
    }

    const response = await fetch(url);
    if (!response.ok) {
      return { error: `Failed to fetch code from URL: ${response.status} ${response.statusText}` };
    }
    const code = await response.text();
    if (code.length > 200000) { 
        return { error: "Fetched code is too large (max 200KB). Please provide a smaller file." };
    }
    return { code };
  } catch (e) {
    console.error("Error fetching code from URL:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching code.";
    return { error: `Could not fetch code: ${errorMessage}` };
  }
}

