"use server";

import { summarizeDocument, type SummarizeDocumentOutput } from "@/ai/flows/summarize-document";
import { generateQuestions, type GenerateQuestionsOutput } from "@/ai/flows/generate-questions";

export interface TutorSessionData {
  documentName: string;
  summary: string;
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
    explanation?: string; // Optional detailed explanation for wrong answers
  }>;
}

export async function processContentForTutor(
  documentName: string,
  documentContent: string
): Promise<TutorSessionData | { error: string }> {
  try {
    if (!documentContent.trim()) {
      return { error: "Document content cannot be empty." };
    }

    const summaryResult: SummarizeDocumentOutput = await summarizeDocument({ documentContent });
    const questionsResult: GenerateQuestionsOutput = await generateQuestions({ documentContent });

    if (!summaryResult.summary || !questionsResult.questions) {
      return { error: "Failed to process content with AI. Please try again." };
    }
    
    const questionsWithExplanationPlaceholder = questionsResult.questions.map(q => ({
        ...q,
        explanation: `The correct answer is option ${q.answer + 1} because... [detailed explanation to be enhanced]`
    }));


    return {
      documentName,
      summary: summaryResult.summary,
      questions: questionsWithExplanationPlaceholder,
    };
  } catch (e) {
    console.error("Error processing content:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
    return { error: `AI processing failed: ${errorMessage}` };
  }
}
