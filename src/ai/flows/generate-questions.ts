
'use server';

/**
 * @fileOverview Generates multiple-choice questions based on the uploaded document content and/or an image, using the StudyEthiopia AI+ persona.
 *
 * - generateQuestions - A function that generates multiple-choice questions.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The content of the document to generate questions from. Can be empty if photoDataUri is provided.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  numberOfQuestions: z
    .number()
    .optional()
    .default(5)
    .describe('The desired number of questions to generate, defaults to 5.'),
  previousQuestionTexts: z
    .array(z.string())
    .optional()
    .describe('An array of question texts that have already been asked, to encourage variety and avoid repetition.')
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const QuestionSchema = z.object({
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).length(4).describe('The four multiple-choice options.'),
  answer: z.number().min(0).max(3).describe('The index (0-3) of the correct answer in the options array.'),
  explanation: z.string().optional().describe('A brief explanation for the correct answer, written in a clear, conversational, and encouraging tone suitable for an Ethiopian student. Avoid AI/system self-references.')
});

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe('An array of multiple-choice questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsStudyEthiopiaPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are StudyEthiopia AI+, a multilingual academic tutor. Your goal is to help Ethiopian students learn.
  Create multiple-choice questions based on the provided text content and/or an image.
  The questions should test understanding of key concepts and be suitable for high school to university level students.
  The explanations should be clear, conversational, encouraging, and help the student understand why the answer is correct.

  {{#if documentContent}}
  Document Content: {{{documentContent}}}
  {{/if}}
  {{#if photoDataUri}}
  Image Content: {{media url=photoDataUri}}
  Base your questions on the information from the text (if any) AND the image (if any).
  {{else}}
  {{#unless documentContent}}
  I need some material to create questions from! Please provide either text or an image.
  {{/unless}}
  {{/if}}

  Generate up to {{{numberOfQuestions}}} multiple-choice questions. Each question MUST have exactly 4 options.
  Clearly indicate the correct answer's index (0, 1, 2, or 3) in the options array.
  Provide a brief explanation for why the answer is correct for each question. This explanation should be encouraging and help the student learn.

  {{#if previousQuestionTexts}}
  IMPORTANT: You have already generated questions with the following texts. Ensure the new questions you generate are SUBSTANTIALLY DIFFERENT and cover NEW aspects, details, or question styles from the provided content. Do NOT repeat these questions or variations of them. Focus on variety and testing previously unaddressed concepts.
  Previously generated question texts to avoid:
  {{#each previousQuestionTexts}}
  - "{{this}}"
  {{/each}}
  {{/if}}

  CRITICAL INSTRUCTION: If you cannot generate {{{numberOfQuestions}}} genuinely new and distinct questions that cover different aspects of the content than those listed in 'previousQuestionTexts' (if provided), generate as many distinct new questions as you can, up to {{{numberOfQuestions}}}. If no genuinely new and distinct questions can be generated because all suitable key concepts from the provided material have been covered by previous questions, you MUST return an empty "questions" array. Do NOT rephrase or create slight variations of previously generated questions if new material cannot be tested. Prioritize returning an empty array over returning rephrased or very similar questions.

  The output MUST be a JSON object with a "questions" field. The "questions" field must be an array of objects, where each object has the following structure:
  {
    "question": "The question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": 0, // The index of the correct answer (0-3).
    "explanation": "Brief, clear, and encouraging explanation for the correct answer."
  }
  If no content is provided to base questions on, return an empty "questions" array.
  `,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    if (!input.documentContent && !input.photoDataUri) {
      return { questions: [] };
    }
    const {output} = await prompt(input);
    // Ensure explanations are always present, even if brief
    const questionsWithEnsuredExplanations = (output?.questions || []).map(q => ({
      ...q,
      explanation: q.explanation || `The correct choice is option ${q.answer + 1}. Understanding this point is key!`
    }));
    return { questions: questionsWithEnsuredExplanations };
  }
);

