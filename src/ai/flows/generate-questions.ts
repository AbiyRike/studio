'use server';

/**
 * @fileOverview Generates multiple-choice questions based on the uploaded document content.
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
    .describe('The content of the document to generate questions from.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The question text.'),
      options: z.array(z.string()).describe('The multiple-choice options.'),
      answer: z.number().describe('The index of the correct answer in the options array.'),
    })
  ).describe('An array of multiple-choice questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are an AI that generates multiple-choice questions based on a document.

  Document Content: {{{documentContent}}}

  Generate a set of questions with multiple choice answers. Each question should have 4 options, and clearly indicate the correct answer's index in the options array. The questions should test the user's understanding of the key concepts in the document.

  The output MUST be a JSON object with a "questions" field. The "questions" field must be an array of objects, where each object has the following structure:
  {
    "question": "The question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": 0 // The index of the correct answer in the options array. Must be 0, 1, 2, or 3.
  }
  `,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
