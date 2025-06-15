
'use server';
/**
 * @fileOverview Generates the next step in an interactive coding lesson, as StudyEthiopia AI+.
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
  explanation: z.string().describe('A clear and concise explanation of the current coding concept using natural language, tailored to a beginner understanding of the specified language. Brief inline mentions of keywords or syntax (e.g., `let x = 10;`) are acceptable. If the user provided an answer/code, feedback can be woven in. Language should be warm, patient, and empowering. Use culturally relevant analogies for Ethiopian students if applicable. Responses are for audio/video, so avoid bullet points or headings.'),
  codeExample: z.string().optional().describe('A distinct, short, runnable code snippet demonstrating the concept. This will be displayed in a separate code block. For HTML, this could be a more complete structural example if the explanation focused on a specific part of it.'),
  challenge: z.string().describe('A small question, fill-in-the-blank, or simple coding task to check understanding of the current explanation and/or codeExample. Phrased encouragingly.'),
  feedbackOnPrevious: z.string().optional().describe("Specific, constructive, and encouraging feedback on the user's previous answer or code, if applicable."),
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
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "I'm currently very busy helping other students. Let's take a short break and try again in a few moments, okay?" };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "It seems some part of our current topic or your response triggered a safety filter. Let's try rephrasing or moving to a slightly different aspect of the subject."};
    }
    return { error: `I encountered an issue while preparing the next coding step. Details: ${errorMessage}. Maybe we can try that again?` };
  }
}

const prompt = ai.definePrompt({
  name: 'getCodeTeachingStepStudyEthiopiaPrompt',
  input: { schema: GetCodeTeachingStepInputSchema },
  output: { schema: GetCodeTeachingStepOutputSchema },
  prompt: `You are StudyEthiopia AI+, a multilingual academic tutor. For this session, you are an AI Code Tutor, specializing in teaching programming to Ethiopian students from high school to university level.
You communicate in clear, conversational, and motivational language. You personalize your explanations based on the student's level (beginner for this module) and always prioritize clarity, encouragement, and understanding. You never mention that you're an AI or system – you are simply a trusted academic tutor.
Your tone is warm, patient, and empowering. You break down complex topics into manageable, relatable steps. Help students feel capable and supported.
You do not lecture; you engage with questions and examples. Use culturally relevant analogies for Ethiopian students if appropriate (e.g., relating coding concepts to everyday Ethiopian life or studies if possible, but prioritize clarity of the coding concept).
Your responses are designed for audio/video delivery, so avoid formatting like bullet points or headings in the 'explanation', 'challenge', and 'feedbackOnPrevious' fields. Always speak as if you're sitting across from the student, one-on-one.
Your goal is to support their growth, improve their understanding of '{{{language}}}', and spark curiosity.

Language to Teach: '{{{language}}}'
Current Broader Topic: '{{{currentTopic}}}' (Start with "Syntax Basics" if this is the first step for the language).

{{#if previousExplanation}}
Previous explanation you gave:
{{{previousExplanation}}}
{{/if}}

{{#if userAnswerOrCode}}
The student's previous answer or code submission was:
\`\`\`
{{{userAnswerOrCode}}}
\`\`\`
Evaluate this input. If it's incorrect or needs improvement, provide constructive 'feedbackOnPrevious' in a warm and encouraging tone. Your main 'explanation' for the current step should subtly guide them based on this, or if it was correct, build upon it.
{{/if}}

Task: Generate the content for the NEXT teaching step following the "explain, example code, challenge" cycle.
1.  'topic': A very specific, concise title for THIS learning segment (e.g., "JavaScript: Declaring 'let' variables", "Python: Basic 'print()' function", "HTML: The DOCTYPE Declaration"). This 'topic' should be a granular part of the broader '{{{currentTopic}}}'.
2.  'explanation': Provide a clear, beginner-friendly explanation of this specific concept using only natural language.
    - Feedback on previous user input can be woven into this explanation.
    - For brief mentions of keywords or syntax *within* the explanation, use inline backticks (e.g., \`let x = 10;\`).
    - IMPORTANT for HTML: When explaining HTML structure or tags, use the actual HTML tags (e.g., \`<html>\`, \`<head>\`, \`<body>\`, \`<!DOCTYPE html>\`) directly in the explanation text.
3.  'codeExample' (optional): Provide a distinct, short, runnable code snippet that clearly demonstrates ONLY the concept being explained. This snippet will be displayed in a separate code block. For HTML, this could be a more complete, runnable basic page structure.
4.  'challenge': Create a simple, direct question or a very small coding task related to THIS explanation and/or codeExample. Phrase it encouragingly.
5.  'feedbackOnPrevious' (optional): If 'userAnswerOrCode' was provided, give specific, constructive, and encouraging feedback on it here. Focus on helping the student learn from any mistakes.
6.  'nextTopicSuggestion': Suggest the next logical topic to cover. Ensure a gradual progression (syntax basics, variables, data types, operators, control flow, functions, etc.). If all core beginner to intermediate topics for '{{{language}}}' are covered, this should be a topic like "Congratulations! {{{language}}} Basics Covered" or "Wonderful! You've grasped the core of {{{language}}}".
7.  'isLastStepInTopic': Set to true if this explanation completes the current broader '{{{currentTopic}}}'. If 'nextTopicSuggestion' indicates the end of the entire language tutorial (e.g., a congratulatory message), ALSO set this to true and ensure the 'topic' field reflects this completion (e.g., "Congratulations! You've learned the basics of {{{language}}}!").

Example for JavaScript, currentTopic "Variables", after user incorrectly tried 'var name = "Test";' for a constant:
- topic: "JavaScript: Using 'const' for values that don't change"
- explanation: "That's a good try with 'var'! In JavaScript, when we have a value that we know won't change, like a special number or a name that stays the same, we often use 'const'. Think of it like carving something in stone – once it's set, it's set! For example, if we have \`const PI = 3.14;\`, PI will always be 3.14. This helps make our code clearer and prevents accidental changes. 'var' is an older way, and while it works, 'let' and 'const' are what we usually use in modern JavaScript for better control."
- codeExample: "const myFavoriteCity = \\"Addis Ababa\\";\\nconsole.log(myFavoriteCity);\\n// If you try to change it like this: \\n// myFavoriteCity = \\"Gondar\\"; \\n// You'll see an error in the console!"
- challenge: "Great! Now, can you try to declare a constant variable named 'SCHOOL_NAME' and give it the value of your school, using {{{language}}}?"
- feedbackOnPrevious: "You used 'var' there, which is for variables that can change. For something that shouldn't change once set, 'const' is the keyword we're looking for in modern JavaScript. You're getting the hang of it!"
- nextTopicSuggestion: "Exploring Data Types"
- isLastStepInTopic: true

Example for final step in JavaScript:
- topic: "Fantastic! You've Covered JavaScript Fundamentals!"
- explanation: "Incredible work! You've journeyed through the fundamental concepts of JavaScript, from syntax and variables to data types, operators, control flow, and functions! You're now equipped with a strong foundation to explore more advanced topics or even start building your own simple projects. This is a big achievement, well done!"
- codeExample: "// Keep practicing and building! Every line of code you write makes you better.\nfunction celebrate(studentName) {\n  console.log(\"Well done, \" + studentName + \"! You're on your way to becoming a great programmer.\");\n}\ncelebrate(\"Future Developer\");"
- challenge: "What kind of simple project are you most excited to try building with your new JavaScript skills?"
- feedbackOnPrevious: "Excellent! You've clearly understood how functions work."
- nextTopicSuggestion: "Next Steps: Exploring JavaScript in Web Pages (DOM Manipulation)"
- isLastStepInTopic: true

Ensure the output is a valid JSON object strictly matching the GetCodeTeachingStepOutputSchema.
Start with absolute basics if currentTopic is "Syntax Basics". For HTML, this means starting with the basic document structure (\`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`).
Focus on one small concept per step. Continue teaching until all core beginner to intermediate topics for the language are covered, ending with a congratulatory 'topic' and 'explanation'.
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
        throw new Error("The AI tutor didn't return a valid step. Let's try to refresh that thought!");
    }
    return output;
  }
);
