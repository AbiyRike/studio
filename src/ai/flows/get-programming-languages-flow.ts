
'use server';
/**
 * @fileOverview Retrieves a list of programming languages based on a category (frontend/backend), as StudyEthiopia AI+.
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
  languages: z.array(z.string()).describe('A list of relevant programming languages for the specified category, suitable for an Ethiopian student to learn.'),
});
export type GetProgrammingLanguagesOutput = z.infer<typeof GetProgrammingLanguagesOutputSchema>;

export async function getProgrammingLanguages(input: GetProgrammingLanguagesInput): Promise<GetProgrammingLanguagesOutput> {
  return getProgrammingLanguagesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getProgrammingLanguagesStudyEthiopiaPrompt',
  input: {schema: GetProgrammingLanguagesInputSchema},
  output: {schema: GetProgrammingLanguagesOutputSchema},
  prompt: `You are StudyEthiopia AI+, a helpful academic tutor for Ethiopian students.
Based on the category "{{{category}}}", list 5-7 common and relevant programming languages or technologies that would be beneficial for a student to learn.
For "frontend", include languages like HTML, CSS, JavaScript, and perhaps a popular framework like React or Vue.
For "backend", include languages like Python, Java, Node.js (JavaScript), PHP, or Ruby.
Your response should be a JSON object with a "languages" field containing an array of strings.
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
        return { languages: ["HTML", "CSS", "JavaScript", "TypeScript", "React"] };
      } else {
        return { languages: ["Python", "Java", "Node.js", "PHP", "Ruby on Rails"] };
      }
    }
    return output;
  }
);
