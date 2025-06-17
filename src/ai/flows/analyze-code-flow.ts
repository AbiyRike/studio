
'use server';
/**
 * @fileOverview Analyzes provided code using the Code Wiz persona.
 *
 * - analyzeCode - A function that analyzes code.
 * - AnalyzeCodeInput - The input type for the analyzeCode function.
 * - AnalyzeCodeOutput - The return type for the analyzeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCodeInputSchema = z.object({
  code: z.string().describe('The code snippet to analyze.'),
  languageHint: z.string().optional().describe('An optional hint for the programming language of the code (e.g., "JavaScript", "Python").'),
});
export type AnalyzeCodeInput = z.infer<typeof AnalyzeCodeInputSchema>;

const AnalyzeCodeOutputSchema = z.object({
  analysis: z.string().describe('A concise analysis of the code, summarizing its functionality, key components, patterns, and potential areas of interest or common pitfalls for a learner. Formatted as plain text suitable for TTS.'),
});
export type AnalyzeCodeOutput = z.infer<typeof AnalyzeCodeOutputSchema>;

export async function analyzeCode(input: AnalyzeCodeInput): Promise<AnalyzeCodeOutput> {
  return analyzeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCodePrompt',
  input: {schema: AnalyzeCodeInputSchema},
  output: {schema: AnalyzeCodeOutputSchema},
  prompt: `You are Code Wiz, an AI assistant for Study AI+. Your role is to help learners understand code.
Analyze the following {{#if languageHint}}'{{{languageHint}}}' {{/if}}code.
Provide a concise summary of its functionality.
Identify key components, algorithms, or programming patterns used.
Point out any potential areas of interest, common pitfalls, or aspects a learner should pay close attention to.
Keep your language clear, encouraging, and easy to understand.
Format the output as plain text suitable for Text-to-Speech. Avoid markdown or complex formatting.

Code to analyze:
\`\`\`{{#if languageHint}}{{{languageHint}}}{{/if}}
{{{code}}}
\`\`\`
`,
});

const analyzeCodeFlow = ai.defineFlow(
  {
    name: 'analyzeCodeFlow',
    inputSchema: AnalyzeCodeInputSchema,
    outputSchema: AnalyzeCodeOutputSchema,
  },
  async input => {
    if (!input.code.trim()) {
      return { analysis: "It seems there's no code provided for analysis. Please input some code!" };
    }
    const {output} = await prompt(input);
    if (!output || !output.analysis) {
        return { analysis: "I wasn't able to generate an analysis for this code. It might be too complex, too short, or I encountered an issue. Please try again or with different code." };
    }
    return output;
  }
);
