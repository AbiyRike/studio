
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
  explanation: z.string().describe('A clear and concise explanation of the current coding concept using natural language, tailored to a beginner understanding of the specified language. Brief inline mentions of keywords or syntax (e.g., `let x = 10;`) are acceptable. If the user provided an answer/code, feedback can be woven in.'),
  codeExample: z.string().optional().describe('A distinct, short, runnable code snippet demonstrating the concept. This will be displayed in a separate code block. For HTML, this could be a more complete structural example if the explanation focused on a specific part of it.'),
  challenge: z.string().describe('A small question, fill-in-the-blank, or simple coding task to check understanding of the current explanation and/or codeExample.'),
  feedbackOnPrevious: z.string().optional().describe("Specific feedback on the user's previous answer or code, if applicable. This can be used to guide the user if their previous attempt was incorrect or incomplete."),
  nextTopicSuggestion: z.string().describe('A suggestion for the next logical topic to cover after this one (e.g., "Conditional Statements", "Functions"). If all core beginner to intermediate topics for the language are covered, this should be a topic like "Congratulations! [Language] Basics Covered".'),
  isLastStepInTopic: z.boolean().optional().default(false).describe('Indicates if this is the last micro-step for the current broader topic. If nextTopicSuggestion indicates the end of the entire language tutorial, this must also be true.'),
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
  prompt: `You are an AI Code Tutor. Your goal is to teach programming concepts for the language '{{{language}}}' to a beginner, one step at a time, covering all essential beginner to intermediate topics.
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
Your main goal for each step is to provide a clear 'explanation', a relevant 'codeExample' (if applicable to the concept), and a concise 'challenge'. After these, suggest the 'nextTopicSuggestion'.

1.  'topic': A very specific, concise title for THIS learning segment (e.g., "JavaScript: Declaring 'let' variables", "Python: Basic 'print()' function", "HTML: The DOCTYPE Declaration"). This 'topic' should be a granular part of the broader '{{{currentTopic}}}'.
2.  'explanation': Provide a clear, beginner-friendly explanation of this specific concept using only natural language.
    - Feedback on previous user input can be woven into this explanation.
    - For brief mentions of keywords or syntax *within* the explanation, use inline backticks (e.g., \`let x = 10;\`).
    - IMPORTANT for HTML: When explaining HTML structure or tags (like for language 'HTML'), use the actual HTML tags (e.g., \`<html>\`, \`<head>\`, \`<body>\`, \`<!DOCTYPE html>\`) directly in the explanation text. This is an exception as the explanation itself forms the structure.
3.  'codeExample' (optional): Provide a distinct, short, runnable code snippet that clearly demonstrates ONLY the concept being explained. This snippet will be displayed in a separate code block. For HTML, this could be a more complete, runnable basic page structure if the explanation focused on a specific part of it.
4.  'challenge': Create a simple, direct question or a very small coding task related to THIS explanation and/or codeExample.
5.  'feedbackOnPrevious' (optional): If 'userAnswerOrCode' was provided, give specific, constructive feedback on it here.
6.  'nextTopicSuggestion': Suggest the next logical topic to cover. Ensure a gradual progression from syntax basics, to variables, data types, operators, control flow (if/else, loops), functions, etc. If all core beginner to intermediate topics for '{{{language}}}' are covered, this should be a topic like "Congratulations! {{{language}}} Basics Covered" or "All Core {{{language}}} Topics Learned".
7.  'isLastStepInTopic': Set to true if this explanation completes the current broader '{{{currentTopic}}}'. If 'nextTopicSuggestion' indicates the end of the entire language tutorial (e.g., a congratulatory message like "Congratulations!"), ALSO set this to true and ensure the 'topic' field reflects this completion (e.g., "Congratulations! {{{language}}} Mastered!").

Example for JavaScript, currentTopic "Variables", after user incorrectly tried 'var name = "Test";' for a constant:
- topic: "JavaScript: 'const' for constants"
- explanation: "In JavaScript, when you want a variable whose value cannot be reassigned after its initial declaration, you should use the 'const' keyword. For example, if you declare \`const PI = 3.14;\`, the value of PI cannot be changed later in your code. This is different from 'let', which allows you to reassign values. You previously used 'var', which is an older way to declare variables; 'let' and 'const' are preferred in modern JavaScript for better scope management and to prevent accidental reassignments for constants."
- codeExample: "const MY_CITY = \"New York\";\\nconsole.log(MY_CITY);\\n// Try reassigning MY_CITY here and see the error in your console!\\n// MY_CITY = \"London\"; // This would cause an error"
- challenge: "Declare a constant variable named 'MAX_USERS' and assign it the value 100 using {{{language}}}."
- feedbackOnPrevious: "You used 'var' which is for variables that can change. For values that shouldn't change once set, 'const' is the correct keyword in modern JavaScript."
- nextTopicSuggestion: "Data Types"
- isLastStepInTopic: true

Example for final step in JavaScript:
- topic: "Congratulations! JavaScript Basics Covered"
- explanation: "You've successfully learned the foundational concepts of JavaScript, including syntax, variables, data types, operators, control flow, and basic functions! You're now equipped to explore more advanced topics or start building simple projects with JavaScript. Well done!"
- codeExample: "// Keep practicing and building!\nfunction greet(name) {\n  console.log(\"Hello, \" + name + \"! You've done great.\");\n}\ngreet(\"Learner\");"
- challenge: "What kind of project are you excited to start with your new JavaScript skills?"
- feedbackOnPrevious: "Excellent work on mastering functions!"
- nextTopicSuggestion: "Further Learning: DOM Manipulation (for web development)"
- isLastStepInTopic: true

Ensure the output is a valid JSON object strictly matching the GetCodeTeachingStepOutputSchema.
Start with absolute basics if currentTopic is "Syntax Basics". For HTML, this would mean starting with the basic document structure (\`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`).
Focus on one small concept per step. Continue teaching until all core beginner to intermediate topics for the language are covered.
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


