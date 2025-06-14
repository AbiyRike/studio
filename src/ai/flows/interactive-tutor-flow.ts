
'use server';
/**
 * @fileOverview Interactive tutoring AI agent.
 *
 * - getNextInteractiveTutorStep - A function that determines the next step in a tutoring session.
 * - InteractiveTutorInput - The input type for the function.
 * - InteractiveTutorOutput - The return type (a single tutoring step).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { InteractiveTutorStepData } from '@/lib/session-store'; // Assuming type is there

// Define Zod schemas based on InteractiveTutorStepData and its nested types
const MiniQuizSchema = z.object({
  question: z.string().describe("The question for the mini-quiz."),
  type: z.enum(['mcq', 'short_answer']).describe("The type of mini-quiz question."),
  options: z.array(z.string()).optional().describe("Options for MCQ. Should be 3-4 options if type is mcq."),
  answer: z.union([z.number(), z.string()]).optional().describe("Index of correct option for MCQ (0-indexed), or correct string for short_answer. This is for internal AI use or validation, not typically shown to user unless it's a review phase."),
  explanation: z.string().optional().describe("Brief explanation for the correct answer of the mini-quiz. This is for internal AI use or validation."),
});

const InteractiveTutorInputSchema = z.object({
  documentContent: z.string().describe('The full text content of the document being tutored.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI."
    ),
  currentTopic: z.string().optional().describe("The current topic being discussed, if any. For the first step, this can be omitted."),
  previousExplanation: z.string().optional().describe("The previous explanation given by the tutor, if any."),
  userQuery: z.string().optional().describe("A question or input from the user regarding the current topic or a previous explanation."),
  userQuizAnswer: z.string().optional().describe("The user's answer to the previous mini-quiz, if any. The AI should evaluate this if present and can provide feedback implicitly in the next explanation or as part of a new quiz if relevant."),
  currentStep: z.number().describe("The current step number in the tutoring session (0-indexed)."),
  totalSteps: z.number().optional().default(5).describe("The desired total number of steps for this topic, helps in pacing. The AI should aim to complete the tutoring within this many steps if possible."),
});
export type InteractiveTutorInput = z.infer<typeof InteractiveTutorInputSchema>;

const InteractiveTutorOutputSchema = z.object({
  topic: z.string().describe('The specific topic or sub-topic for this tutoring step. Should be a concise title for the explanation to follow.'),
  explanation: z.string().describe('A clear and concise explanation of the current topic/concept, derived from the document content. If the user asked a question, it should be addressed here. If the user answered a quiz, feedback can be woven in or a new point made.'),
  explanationAudioUri: z.string().optional().describe('Placeholder for a URI to a TTS audio of the explanation. The AI should not generate this URI; it is for system use.'),
  miniQuiz: MiniQuizSchema.optional().describe('An optional mini-quiz question to check understanding of the current explanation. If a quiz is provided, it must include a question and type. For MCQs, provide 3-4 options.'),
  isLastStep: z.boolean().describe('Indicates if this is the last step in the tutoring session for the given content, or if the AI has reached the desired totalSteps.'),
});
export type InteractiveTutorOutput = z.infer<typeof InteractiveTutorOutputSchema>;


export async function getNextInteractiveTutorStep(input: InteractiveTutorInput): Promise<InteractiveTutorOutput | { error: string }> {
  try {
    const result = await interactiveTutorFlow(input);
    return result;
  } catch (e) {
    console.error("Error in getNextInteractiveTutorStep flow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the tutor flow.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The AI tutor service is currently busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "The content could not be processed by the AI tutor due to safety filters. Please try with different content or ask a different question."};
    }
    return { error: `AI Tutor processing failed. Details: ${errorMessage}.` };
  }
}

const prompt = ai.definePrompt({
  name: 'interactiveTutorPrompt',
  input: { schema: InteractiveTutorInputSchema },
  output: { schema: InteractiveTutorOutputSchema },
  prompt: `You are an AI Tutor. Your goal is to break down the provided document content into understandable, sequential steps for a user.
You will create a series of explanations, each followed by an optional mini-quiz.

Document Content to Tutor:
{{#if documentContent}}
{{{documentContent}}}
{{else}}
No primary document text provided. Focus on the image if available.
{{/if}}

{{#if photoDataUri}}
Image Associated with Content (use this to inform your explanations and quizzes):
{{media url=photoDataUri}}
{{/if}}

Current Tutoring State:
- Step Number: {{{currentStep}}} (out of a planned {{{totalSteps}}}). This is the step you are generating.
{{#if currentTopic}}- Previous Topic Focus: {{{currentTopic}}}{{/if}}
{{#if previousExplanation}}- Previous Explanation Given: {{{previousExplanation}}}{{/if}}
{{#if userQuery}}- User's Question/Input: {{{userQuery}}} (Address this in your new 'explanation'. If it's a question, answer it. If it's a statement, acknowledge it.) {{/if}}
{{#if userQuizAnswer}}- User's Answer to Last Mini-Quiz: {{{userQuizAnswer}}} (If the user provided an answer, assess it. You don't need to explicitly say "correct" or "incorrect" but your 'explanation' for the current step can subtly guide them or build upon their understanding. For instance, if they were wrong, the new explanation could clarify the concept they misunderstood.) {{/if}}

Task for generating step {{{currentStep}}}:
1.  Determine the next logical 'topic' from the document content. This should be a concise title for your explanation. If this is the first step (currentStep is 0), start with an introductory topic. If a 'userQuery' is present, make the 'topic' and 'explanation' relevant to addressing it.
2.  Provide a clear and concise 'explanation' for this 'topic'. This explanation MUST be based on the "Document Content to Tutor" and/or "Image Associated with Content" provided above.
3.  Optionally, create a 'miniQuiz' object to test understanding of THIS 'explanation'.
    -   'question': The quiz question text.
    -   'type': 'mcq' or 'short_answer'.
    -   'options' (if 'mcq'): An array of 3-4 strings for multiple-choice options. Ensure one is clearly the best answer based on your explanation.
    -   'answer' and 'explanation' fields in the miniQuiz are for your internal reference or for a system to validate; do not expect the user to see them directly during the quiz.
4.  Set 'isLastStep' to true if this is the final planned step (i.e., if currentStep is totalSteps - 1), or if you assess that the provided content has been thoroughly covered and no more meaningful steps can be generated. If the document content is very short, you might reach the last step sooner than 'totalSteps'.

Important Instructions:
-   Your primary source of information is the "Document Content to Tutor" and the "Image Associated with Content". Do not invent information outside of this.
-   If no document content AND no image is provided, you MUST state that you cannot proceed and set 'isLastStep' to true with an appropriate topic and explanation.
-   Pacing: Try to cover distinct concepts in each step. Aim to complete tutoring within the 'totalSteps' if the content allows.
-   User Interaction: If 'userQuery' is present, your 'explanation' should directly address it. If 'userQuizAnswer' is present, your 'explanation' can implicitly guide or correct.
-   Quiz Relevance: Any 'miniQuiz' must be directly related to the 'explanation' you just provided for the current step.
-   Conciseness: Keep explanations and quiz questions focused and to the point.

Ensure the output is a valid JSON object strictly matching the InteractiveTutorOutputSchema.
If you cannot generate content (e.g., no input document/image), 'topic' should be "Unable to Proceed", 'explanation' should state why, and 'isLastStep' should be true.
`,
});


const interactiveTutorFlow = ai.defineFlow(
  {
    name: 'interactiveTutorFlow',
    inputSchema: InteractiveTutorInputSchema,
    outputSchema: InteractiveTutorOutputSchema,
  },
  async (input) => {
    if (!input.documentContent && !input.photoDataUri) {
      return {
        topic: "Cannot Start Tutoring",
        explanation: "No document content or image was provided to base the tutoring session on. Please select content with information to learn.",
        isLastStep: true,
      };
    }
    
    const {output} = await prompt(input);
    if (!output) {
        // This case should ideally be handled by Zod schema validation in the prompt definition or a more specific error.
        throw new Error("AI did not return valid output for interactive tutor step. The output was null or undefined.");
    }
    return output;
  }
);
