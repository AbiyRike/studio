
'use server';
/**
 * @fileOverview Optimizes provided code and explains changes using the Code Wiz persona.
 *
 * - optimizeCode - A function that optimizes code.
 * - OptimizeCodeInput - The input type for the optimizeCode function.
 * - OptimizeCodeOutput - The return type for the optimizeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeCodeInputSchema = z.object({
  code: z.string().describe('The code snippet to optimize.'),
  languageHint: z.string().optional().describe('An optional hint for the programming language of the code (e.g., "JavaScript", "Python").'),
});
export type OptimizeCodeInput = z.infer<typeof OptimizeCodeInputSchema>;

const OptimizeCodeOutputSchema = z.object({
  optimizedCode: z.string().describe('The optimized version of the code. If no optimization is made, this should be the original code. This should be a raw code string.'),
  optimizationSummary: z.string().describe('A concise summary explaining the changes made and why they are beneficial for a learner (e.g., readability, efficiency, best practices). If no significant optimizations are found, it should state that and explain why. Formatted as plain text suitable for TTS.'),
});
export type OptimizeCodeOutput = z.infer<typeof OptimizeCodeOutputSchema>;

export async function optimizeCode(input: OptimizeCodeInput): Promise<OptimizeCodeOutput> {
  return optimizeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeCodePrompt',
  input: {schema: OptimizeCodeInputSchema},
  output: {schema: OptimizeCodeOutputSchema},
  prompt: `You are Code Wiz, an AI assistant for Study AI+, focused on helping learners improve their code.
Analyze the following {{#if languageHint}}'{{{languageHint}}}' {{/if}}code for potential optimizations.
Consider aspects like readability, efficiency (within reason for a learner's context), and adherence to common best practices suitable for someone learning the language.

1.  **Optimized Code**: Provide an optimized version of the code.
    *   If significant improvements can be made, provide the modified code.
    *   If the code is already quite good for a learner's level or if optimizations would make it too complex, you can return the original code or make very minor readability improvements.
    *   The 'optimizedCode' field MUST contain only the code itself, as a raw string. Do NOT add any surrounding text like "Here is the optimized code:".

2.  **Optimization Summary**: Provide a concise summary explaining:
    *   What changes were made (if any).
    *   Why these changes are beneficial (e.g., "This makes the loop easier to read," "This might be slightly more efficient for larger datasets," "This uses a more modern syntax.").
    *   If no significant optimizations were made, explain why (e.g., "The original code is already clear and efficient for this task," or "Optimizations might add unnecessary complexity at this stage of learning.").
    *   The 'optimizationSummary' should be plain text suitable for Text-to-Speech. Avoid markdown.

Code to optimize:
\`\`\`{{#if languageHint}}{{{languageHint}}}{{/if}}
{{{code}}}
\`\`\`

Ensure your output is a valid JSON object matching the specified schema.
Specifically, 'optimizedCode' must be a string containing only code, and 'optimizationSummary' must be a string containing only the textual explanation.
`,
});

const optimizeCodeFlow = ai.defineFlow(
  {
    name: 'optimizeCodeFlow',
    inputSchema: OptimizeCodeInputSchema,
    outputSchema: OptimizeCodeOutputSchema,
  },
  async input => {
     if (!input.code.trim()) {
      return { optimizedCode: "", optimizationSummary: "No code was provided to optimize. Please input some code." };
    }
    const {output} = await prompt(input);
    if (!output || typeof output.optimizedCode === 'undefined' || typeof output.optimizationSummary === 'undefined') {
        return { 
            optimizedCode: input.code, // Return original code on failure
            optimizationSummary: "I encountered an issue while trying to optimize this code. Please ensure the code is valid and try again. For now, the original code is shown." 
        };
    }
    return output;
  }
);
