
'use server';
/**
 * @fileOverview Retrieves a list of programming languages based on a category (frontend/backend).
 *
 * - getProgrammingLanguagesFlow - A function that fetches programming languages.
 * - GetProgrammingLanguagesInput - The input type for the function.
 * - GetProgrammingLanguagesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetProgrammingLanguagesInputSchema = z.object({
  category: z.enum(['frontend', 'backend']).describe('The category of programming languages to fetch (frontend or backend).'),
});
export type GetProgrammingLanguagesInput = z.infer<typeof GetProgrammingLanguagesInputSchema>;

const GetProgrammingLanguagesOutputSchema = z.object({
  languages: z.array(z.string()).describe('A list of relevant programming languages for the specified category.'),
});
export type GetProgrammingLanguagesOutput = z.infer<typeof GetProgrammingLanguagesOutputSchema>;

export async function getProgrammingLanguages(input: GetProgrammingLanguagesInput): Promise<GetProgrammingLanguagesOutput> {
  return getProgrammingLanguagesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getProgrammingLanguagesPrompt',
  input: {schema: GetProgrammingLanguagesInputSchema},
  output: {schema: GetProgrammingLanguagesOutputSchema},
  prompt: `You are an AI assistant that provides lists of programming languages.
Based on the category "{{{category}}}", list 5-7 common and relevant programming languages or technologies.
For "frontend", include languages like HTML, CSS, JavaScript, and popular frameworks/libraries like React or Angular.
For "backend", include languages like Python, Java, Node.js, Ruby, Go, etc.
Return only the list of languages.
`,
});

const getProgrammingLanguagesFlow = ai.defineFlow(
  {
    name: 'getProgrammingLanguagesFlow',
    inputSchema: GetProgrammingLanguagesInputSchema,
    outputSchema: GetProgrammingLanguagesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.languages || output.languages.length === 0) {
      // Fallback in case AI fails to return languages
      if (input.category === 'frontend') {
        return { languages: ["JavaScript", "HTML", "CSS", "TypeScript", "React"] };
      } else {
        return { languages: ["Python", "Java", "Node.js", "C#", "Go"] };
      }
    }
    return output;
  }
);
