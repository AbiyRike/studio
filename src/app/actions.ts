
"use server";

import { summarizeDocument } from "@/ai/flows/summarize-document";
import { generateQuestions } from "@/ai/flows/generate-questions";
import type { SummarizeDocumentInput } from "@/ai/flows/summarize-document";
import type { GenerateQuestionsInput } from "@/ai/flows/generate-questions";


export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
    explanation?: string; 
  }>;
  documentContent?: string; // Optional: store original text content for reference
  mediaDataUri?: string; // Optional: store media URI for reference
}

export interface ProcessContentInput {
  documentName: string;
  documentContent: string;
  mediaDataUri?: string; // For images or future audio data URIs
}

export async function processContentForTutor(
  input: ProcessContentInput
): Promise<TutorSessionData | { error: string }> {
  try {
    const { documentName, documentContent, mediaDataUri } = input;

    if (!documentName.trim()) {
        return { error: "Document name cannot be empty." };
    }
    // Content can be empty if mediaDataUri is provided for image-only analysis
    if (!documentContent.trim() && !mediaDataUri) {
      return { error: "Document content or media (image/audio) must be provided." };
    }

    const aiInputBase = { documentContent };
    const aiInputWithMedia: SummarizeDocumentInput & GenerateQuestionsInput = mediaDataUri 
      ? { ...aiInputBase, photoDataUri: mediaDataUri } 
      : aiInputBase;

    const summaryResultPromise = summarizeDocument(aiInputWithMedia);
    const questionsResultPromise = generateQuestions(aiInputWithMedia);

    const [summaryResult, questionsResult] = await Promise.all([
        summaryResultPromise,
        questionsResultPromise
    ]);

    let finalSummary = summaryResult.summary;
    let finalQuestions = questionsResult.questions;

    if (!finalSummary) {
      finalSummary = "The AI could not generate a summary. This might be because the content was too short, unsuitable for summarization, or an issue occurred. Please try with different content or ensure the provided image (if any) is clear.";
      console.warn("AI did not return a summary, using placeholder. Document content snippet:", documentContent.substring(0, 100), "Media URI present:", !!mediaDataUri);
    }

    if (!finalQuestions || finalQuestions.length === 0) {
      finalQuestions = [
        {
          question: "Sample Question 1: What is a key characteristic of effective learning material?",
          options: ["Clarity and conciseness", "Length and complexity", "Use of jargon", "Ambiguity"],
          answer: 0,
        },
        {
          question: "Sample Question 2: If an AI fails to generate questions, what might be a reason?",
          options: ["The input content was too short or unclear", "The AI model is perfect", "The user interface is faulty", "Network connectivity is always perfect"],
          answer: 0,
        }
      ];
      console.warn("AI did not return questions or returned an empty list, using placeholder questions. Document content snippet:", documentContent.substring(0, 100), "Media URI present:", !!mediaDataUri);
    }
    
    const questionsWithExplanation = finalQuestions.map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.answer]}" (option ${q.answer + 1}). For actual content, a more detailed AI-generated explanation would ideally appear here.`
    }));

    return {
      documentName,
      summary: finalSummary,
      questions: questionsWithExplanation,
      documentContent: documentContent, // Store for potential future use/reference
      mediaDataUri: mediaDataUri, // Store for potential future use/reference
    };

  } catch (e) {
    console.error("Error processing content in processContentForTutor:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
        return { error: "The AI service is currently busy or rate limits have been exceeded. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content could not be processed due to safety filters or was blocked by the AI. Please try with different content."};
    }
    return { error: `AI processing failed. This could be due to the content provided or a temporary issue with the AI service. Details: ${errorMessage}. If the problem persists, try with different content.` };
  }
}
