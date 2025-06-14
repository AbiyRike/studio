
'use server';
/**
 * @fileOverview Generates the next step in an interactive coding lesson.
 *
 * - getCodeTeachingStep - A function that determines the next coding lesson step.
 * - GetCodeTeachingStepInput - The input type for the function.
 * - GetCodeTeachingStepOutput - The return type (a single teaching step).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetCodeTeachingStepInputSchema = z.object({
  language: z.string().describe('The programming language being taught.'),
  currentTopic: z.string().describe('The current topic being taught (e.g., "Syntax Basics", "Variables", "Loops"). For the first step, this will be "Syntax Basics".'),
  previousExplanation: z.string().optional().describe('The previous explanation given by the tutor, if any.'),
  userAnswerOrCode: z.string().optional().describe("The user's answer to the previous challenge or their submitted code, if any. Evaluate this if present and provide feedback implicitly in the new explanation or as part of a new challenge."),
});
export type GetCodeTeachingStepInput = z.infer<typeof GetCodeTeachingStepInputSchema>;

const GetCodeTeachingStepOutputSchema = z.object({
  topic: z.string().describe('The specific topic for this teaching step (e.g., "Declaring Variables in JavaScript", "For Loops in Python").'),
  explanation: z.string().describe('A clear and concise explanation of the current coding concept, tailored to a beginner understanding of the specified language. Include syntax examples directly in the explanation where appropriate. If the user provided an answer/code, feedback can be woven in.'),
  codeExample: z.string().optional().describe('A short, relevant code snippet demonstrating the concept. This should be ready to display in a code block.'),
  challenge: z.string().describe('A small question, fill-in-the-blank, or simple coding task to check understanding of the current explanation. (e.g., "How do you declare a variable named \'age\' in [language]?", "Write a line of code to print \'Hello World\' in [language].").'),
  feedbackOnPrevious: z.string().optional().describe("Specific feedback on the user's previous answer or code, if applicable. This can be used to guide the user if their previous attempt was incorrect or incomplete."),
  nextTopicSuggestion: z.string().describe('A suggestion for the next logical topic to cover after this one (e.g., "Conditional Statements", "Functions"). The AI should manage the progression from basic syntax onwards.'),
  isLastStepInTopic: z.boolean().optional().default(false).describe('Indicates if this is the last micro-step for the current broader topic. This helps in structuring lessons.'),
});
export type GetCodeTeachingStepOutput = z.infer<typeof GetCodeTeachingStepOutputSchema>;

export async function getCodeTeachingStep(input: GetCodeTeachingStepInput): Promise<GetCodeTeachingStepOutput | { error: string }> {
  try {
    const result = await getCodeTeachingStepFlow(input);
    return result;
  } catch (e) {
    console.error("Error in getCodeTeachingStep flow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the code teaching flow.";
    // Add specific error checks if needed (rate limit, safety, etc.)
    return { error: `AI Code Tutor processing failed. Details: ${errorMessage}.` };
  }
}

const prompt = ai.definePrompt({
  name: 'getCodeTeachingStepPrompt',
  input: { schema: GetCodeTeachingStepInputSchema },
  output: { schema: GetCodeTeachingStepOutputSchema },
  prompt: `You are an AI Code Tutor. Your goal is to teach programming concepts for the language '{{{language}}}' to a beginner, one step at a time.
You are currently teaching about: '{{{currentTopic}}}'.

{{#if previousExplanation}}
Previous explanation you gave:
{{{previousExplanation}}}
{{/if}}

{{#if userAnswerOrCode}}
The user's previous answer or code submission was:
\`\`\`
{{{userAnswerOrCode}}}
\`\`\`
Evaluate this input. If it's incorrect or needs improvement, provide constructive 'feedbackOnPrevious'. Your main 'explanation' for the current step should subtly guide them based on this, or if it was correct, build upon it.
{{/if}}

Task: Generate the content for the NEXT teaching step.
1.  'topic': A very specific, concise title for THIS learning segment (e.g., "JavaScript: Declaring 'let' variables", "Python: Basic 'print()' function", "HTML: The DOCTYPE Declaration").
2.  'explanation': Provide a clear, beginner-friendly explanation of this specific concept.
    - Include simple syntax examples directly within this explanation.
    - IMPORTANT: When explaining HTML structure or tags (like for language 'HTML'), use the actual HTML tags (e.g., \`<html>\`, \`<head>\`, \`<body>\`, \`<!DOCTYPE html>\`) directly in the explanation text, NOT as backticked placeholders like \`\`html\`\`.
    - For other programming language syntax (like JavaScript, Python), you can use backticks for inline code, for example \`let x = 10;\`.
    - Assume the user is new to programming.
3.  'codeExample' (optional): Provide a distinct, short, runnable code snippet that clearly demonstrates ONLY the concept being explained. This snippet will be displayed in a code block.
4.  'challenge': Create a simple, direct question or a very small coding task related to THIS explanation. Examples: "What keyword is used to declare a constant variable in {{{language}}}?", "Write a single line of {{{language}}} code to store your name in a variable called 'myName'.", "What tag is used to define the main content of an HTML page?"
5.  'feedbackOnPrevious' (optional): If 'userAnswerOrCode' was provided, give specific feedback on it here.
6.  'nextTopicSuggestion': Suggest the next logical topic to cover. Ensure a gradual progression from syntax basics, to variables, data types, operators, control flow (if/else, loops), functions, etc. For HTML, this could be progressing through common tags and attributes.
7.  'isLastStepInTopic': Set to true if this explanation completes the current broader '{{{currentTopic}}}' and the 'nextTopicSuggestion' is a new, different broader topic.

Example for JavaScript, currentTopic "Variables", after user incorrectly tried 'var name = "Test";' for a constant:
- topic: "JavaScript: 'const' for constants"
- explanation: "In JavaScript, when you want a variable whose value cannot be reassigned, you use the 'const' keyword. For example: \`const PI = 3.14;\`. Once PI is set, you can't change it later. This is different from 'let', which allows reassignment. You previously used 'var', which is an older way to declare variables; 'let' and 'const' are preferred in modern JavaScript."
- codeExample: "const MY_CITY = \\"New York\\";\\nconsole.log(MY_CITY);"
- challenge: "Declare a constant variable named 'MAX_USERS' and assign it the value 100."
- feedbackOnPrevious: "You used 'var' which is for variables that can change. For values that shouldn't change, 'const' is the correct keyword."
- nextTopicSuggestion: "Data Types"
- isLastStepInTopic: true (assuming 'Variables' topic covers let, const)

Ensure the output is a valid JSON object strictly matching the GetCodeTeachingStepOutputSchema.
Start with absolute basics if currentTopic is "Syntax Basics". For HTML, this would mean starting with the basic document structure (\`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`).
Focus on one small concept per step.
`,
});

const getCodeTeachingStepFlow = ai.defineFlow(
  {
    name: 'getCodeTeachingStepFlow',
    inputSchema: GetCodeTeachingStepInputSchema,
    outputSchema: GetCodeTeachingStepOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI did not return valid output for code teaching step.");
    }
    return output;
  }
);
