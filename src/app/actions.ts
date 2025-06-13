
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
    if (!documentName.trim()) {
        return { error: "Document name cannot be empty." };
    }

    // Attempt to get summary and questions from AI in parallel
    const summaryResultPromise = summarizeDocument({ documentContent });
    const questionsResultPromise = generateQuestions({ documentContent });

    const [summaryResult, questionsResult] = await Promise.all([
        summaryResultPromise,
        questionsResultPromise
    ]);

    let finalSummary = summaryResult.summary;
    let finalQuestions = questionsResult.questions;

    // Fallback for summary if AI doesn't provide one
    if (!finalSummary) {
      finalSummary = "The AI could not generate a summary for the provided content. This might be because the content was too short or not suitable for summarization. Please try with more detailed text or a different document.";
      console.warn("AI did not return a summary, using placeholder. Document content snippet:", documentContent.substring(0, 100));
    }

    // Fallback for questions if AI doesn't provide them or returns an empty list
    if (!finalQuestions || finalQuestions.length === 0) {
      finalQuestions = [
        {
          question: "Sample Question 1: What is the primary benefit of using placeholder content in development?",
          options: ["Testing UI flow and interactions", "Providing end-users with real data", "Making the application slower", "It has no benefits"],
          answer: 0,
          // Explanation will be added in the mapping step
        },
        {
          question: "Sample Question 2: If an AI model fails to generate questions from short text, what is a good fallback strategy?",
          options: ["Show an error and stop", "Retry indefinitely", "Use a predefined set of sample questions", "Ask the user to write questions"],
          answer: 2,
          // Explanation will be added in the mapping step
        }
      ];
      console.warn("AI did not return questions or returned an empty list, using placeholder questions. Document content snippet:", documentContent.substring(0, 100));
    }
    
    // Map questions to include a default explanation
    // The AI flow for questions currently doesn't generate explanations, so we add them here.
    const questionsWithExplanation = finalQuestions.map(q => ({
        ...q,
        explanation: q.explanation || `The correct answer is "${q.options[q.answer]}" (option ${q.answer + 1}). For actual content, a more detailed AI-generated explanation would ideally appear here.`
    }));

    return {
      documentName,
      summary: finalSummary,
      questions: questionsWithExplanation,
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

