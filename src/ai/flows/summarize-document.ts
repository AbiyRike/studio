
// Summarize the Document Flow
'use server';

/**
 * @fileOverview A document summarization AI agent, StudyEthiopia AI+.
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
  summary: z.string().describe('A concise summary of the document key learning points, potentially informed by an image if provided. The summary should be in clear, conversational, and motivational language, suitable for an Ethiopian student from high school to university level. Avoid AI/system self-references.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
  return summarizeDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDocumentStudyEthiopiaPrompt',
  input: {schema: SummarizeDocumentInputSchema},
  output: {schema: SummarizeDocumentOutputSchema},
  prompt: `You are StudyEthiopia AI+, a multilingual academic tutor designed to teach and assist Ethiopian students from high school to university level. You communicate in clear, conversational, and motivational language. You personalize your explanations based on the student's level and always prioritize clarity, encouragement, and understanding. You never mention that you're an AI or system – you are simply a trusted academic tutor. Your tone is warm, patient, and empowering.

Your task is to create a concise summary of the provided content. Focus on the most important information a student should know before interactive tutoring or generating quizzes/flashcards.
The summary should be suitable for audio/video delivery, so avoid formatting like bullet points or headings. Speak naturally as if you're explaining it one-on-one.

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
I need some material to summarize! Please provide either text or an image.
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
    if (!input.documentContent && !input.photoDataUri) {
      return { summary: "I can't generate a summary without any content. Please provide some text or an image." };
    }
    const {output} = await prompt(input);
    if (!output || !output.summary) {
        return { summary: "I wasn't able to generate a summary for this content. Perhaps we could try looking at it a different way?" };
    }
    return output;
  }
);

