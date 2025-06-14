
'use server';

/**
 * @fileOverview Generates flashcards (term/definition pairs) based on document content and/or an image.
 *
 * - generateFlashcards - A function that generates flashcards.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFlashcardsInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The content of the document to generate flashcards from. Can be empty if photoDataUri is provided.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  numberOfFlashcards: z
    .number()
    .optional()
    .default(10)
    .describe('The desired number of flashcards to generate, defaults to 10.'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
  term: z.string().describe('The term, question, or concept for the front of the flashcard.'),
  definition: z.string().describe('The definition, answer, or explanation for the back of the flashcard.'),
});

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of flashcards.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an AI assistant that creates concise and informative flashcards from provided text content and/or an image.
  Each flashcard should have a "term" (a key concept, question, or vocabulary word) and a "definition" (the explanation, answer, or description).
  Focus on the most important information suitable for learning with flashcards.

  {{#if documentContent}}
  Document Content: {{{documentContent}}}
  {{/if}}
  {{#if photoDataUri}}
  Image Content: {{media url=photoDataUri}}
  Base your flashcards on the information from the text (if any) AND the image (if any).
  {{else}}
  {{#unless documentContent}}
  No text or image content was provided. State that you cannot generate flashcards without input.
  {{/unless}}
  {{/if}}

  Generate exactly {{{numberOfFlashcards}}} flashcards.

  The output MUST be a JSON object with a "flashcards" field. The "flashcards" field must be an array of objects, where each object has the following structure:
  {
    "term": "The flashcard term/question",
    "definition": "The flashcard definition/answer"
  }
  If no content is provided to base flashcards on, return an empty "flashcards" array.
  If you cannot generate {{{numberOfFlashcards}}} distinct flashcards based on the content, generate as many distinct flashcards as you can, up to {{{numberOfFlashcards}}}.
  If no flashcards can be generated, return an empty "flashcards" array.
  `,
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async input => {
    if (!input.documentContent && !input.photoDataUri) {
      return { flashcards: [] };
    }
    const {output} = await prompt(input);
    return { flashcards: output?.flashcards || [] };
  }
);
