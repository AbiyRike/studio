
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsInput as AIQuestionsInput } from "@/ai/flows/generate-questions";
import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";

export interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Question[]; // Initial batch of questions
  documentContent?: string;
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
      return { error: "Document content or media (image/audio) must be provided." };
    }

    const aiSummarizeInput: SummarizeDocumentInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
    };
    const aiInitialQuestionsInput: AIQuestionsInput = {
      documentContent,
      ...(mediaDataUri && { photoDataUri: mediaDataUri }),
      numberOfQuestions: 5, // Request initial 5 questions
      previousQuestionTexts: [], // No previous questions for initial batch
    };

    const summaryResultPromise = summarizeDocument(aiSummarizeInput);
    const questionsResultPromise = generateQuestions(aiInitialQuestionsInput);

    const [summaryResult, questionsResult] = await Promise.all([
        summaryResultPromise,
        questionsResultPromise
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
