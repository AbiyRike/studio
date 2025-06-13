// Summarize the Document Flow
'use server';

/**
 * @fileOverview A document summarization AI agent.
 *
 * - summarizeDocument - A function that handles the document summarization process.
 * - SummarizeDocumentInput - The input type for the summarizeDocument function.
 * - SummarizeDocumentOutput - The return type for the summarizeDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDocumentInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The text content of the document to be summarized. Can be empty if photoDataUri is provided.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the document key learning points, potentially informed by an image if provided.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
  return summarizeDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDocumentPrompt',
  input: {schema: SummarizeDocumentInputSchema},
  output: {schema: SummarizeDocumentOutputSchema},
  prompt: `You are an expert summarizer, skilled at extracting the key learning points from text and, if provided, an accompanying image.

  Please provide a concise summary focusing on the most important information a user should know before interactive tutoring.
  {{#if documentContent}}
  Document Text:
  {{{documentContent}}}
  {{/if}}
  {{#if photoDataUri}}
  Accompanying Image:
  {{media url=photoDataUri}}

  Consider the content of both the text (if any) and the image when generating your summary.
  {{else}}
  {{#unless documentContent}}
  No text or image content was provided. State that you cannot generate a summary without input.
  {{/unless}}
  {{/if}}
  `,
});

const summarizeDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentFlow',
    inputSchema: SummarizeDocumentInputSchema,
    outputSchema: SummarizeDocumentOutputSchema,
  },
  async input => {
    // Ensure at least one input is present for the AI
    if (!input.documentContent && !input.photoDataUri) {
      return { summary: "Cannot generate summary: No document content or image was provided." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
