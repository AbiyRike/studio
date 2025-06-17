
'use server';
/**
 * @fileOverview Explains provided code using the Code Wiz persona.
 *
 * - explainCode - A function that explains code.
 * - ExplainCodeInput - The input type for the explainCode function.
 * - ExplainCodeOutput - The return type for the explainCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainCodeInputSchema = z.object({
  code: z.string().describe('The code snippet to explain.'),
  languageHint: z.string().optional().describe('An optional hint for the programming language of the code (e.g., "JavaScript", "Python").'),
});
export type ExplainCodeInput = z.infer<typeof ExplainCodeInputSchema>;

const ExplainCodeOutputSchema = z.object({
  explanation: z.string().describe("A clear, simple, and encouraging explanation of the code, suitable for a learner. It might be line-by-line or section-by-section. Focuses on the purpose of each part and how they work together. Formatted as plain text suitable for TTS."),
});
export type ExplainCodeOutput = z.infer<typeof ExplainCodeOutputSchema>;

export async function explainCode(input: ExplainCodeInput): Promise<ExplainCodeOutput> {
  return explainCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainCodePrompt',
  input: {schema: ExplainCodeInputSchema},
  output: {schema: ExplainCodeOutputSchema},
  prompt: `You are Code Wiz, an AI assistant for Study AI+. Your goal is to make code understandable for learners.
Explain the following {{#if languageHint}}'{{{languageHint}}}' {{/if}}code.
Break it down line-by-line or section-by-section.
Explain the purpose of each significant part and how these parts collaborate.
Use clear, simple, and encouraging language.
Imagine you're explaining this to someone who is learning programming.
Format the output as plain text suitable for Text-to-Speech. Avoid markdown or complex formatting.

Code to explain:
\`\`\`{{#if languageHint}}{{{languageHint}}}{{/if}}
{{{code}}}
\`\`\`
`,
});

const explainCodeFlow = ai.defineFlow(
  {
    name: 'explainCodeFlow',
    inputSchema: ExplainCodeInputSchema,
    outputSchema: ExplainCodeOutputSchema,
  },
  async input => {
    if (!input.code.trim()) {
      return { explanation: "There's no code here to explain. Please provide some code first!" };
    }
    const {output} = await prompt(input);
    if (!output || !output.explanation) {
        return { explanation: "I had some trouble generating an explanation for this code. It might be very complex, incomplete, or an internal issue occurred. Please try again." };
    }
    return output;
  }
);
