'use server';
/**
 * @fileOverview Interactive dynamic tutoring AI agent, Study AI+.
 * This flow generates animated, text-based tutoring steps with explanations, visual hints, and optional mini-quizzes.
 * It also handles direct user questions within the tutoring context.
 *
 * - getNextInteractiveTutorStep - A function that determines the next step in a dynamic tutoring session.
 * - InteractiveTutorInput - The input type for the function.
 * - InteractiveTutorOutput - The return type (a single tutoring step or direct answer).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MiniQuizSchema = z.object({
  question: z.string().describe("The question for the mini-quiz, phrased clearly for a student."),
  options: z.array(z.string()).min(2).max(5).describe("Options for MCQ. Should be 2-5 options."),
  answerIndex: z.number().min(0).describe("0-indexed correct answer in the options array."),
  explanation: z.string().optional().describe("Brief, encouraging explanation for the correct answer of the mini-quiz."),
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'ai']).describe("The role of the message sender (user or AI)."),
  text: z.string().describe("The text content of the message."),
});

const InteractiveTutorInputSchema = z.object({
  documentName: z.string().describe('The name of the document being tutored.'),
  documentContent: z.string().describe('The full text content of the document being tutored. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z.string().optional().describe("An optional photo related to the document, as a data URI."),
  currentTopic: z.string().optional().describe("The current broad topic being discussed. For the first step, this can be omitted or be a general introduction topic derived from documentName."),
  previousStepTitle: z.string().optional().describe("The title of the previous teaching segment, if any."),
  previousExplanationSummary: z.string().optional().describe("A very brief summary of the last explanation given by the tutor, if any."),
  userQuery: z.string().optional().describe("The user's latest question or message. If present, the AI should prioritize addressing this query."),
  userQuizAnswer: z.string().optional().describe("The user's answer (text of the selected option) to the previous mini-quiz, if any."),
  chatHistory: z.array(ChatMessageSchema).optional().describe("The history of direct Q&A between user and AI tutor, excluding main teaching content."),
  currentStepNumber: z.number().describe("The current step number in the tutoring session (0-indexed for teaching segments)."),
  userEngagementHint: z.enum(["focused", "confused", "distracted"]).optional().describe("A hint about the user's engagement level (conceptual, not actually implemented via CV yet). AI should adapt teaching style if 'confused' or 'distracted'.")
});
export type InteractiveTutorInput = z.infer<typeof InteractiveTutorInputSchema>;

const InteractiveTutorOutputSchema = z.object({
  title: z.string().describe('A concise, engaging title for THIS teaching segment/slide (e.g., "What are Mitochondria?", "Understanding For Loops"). This is crucial for the animated display.'),
  explanationSegments: z.array(z.string()).min(1).describe('The main teaching content, broken down into short, speakable segments (paragraphs or key points). Each segment will be animated and spoken sequentially. Max 3-4 segments for brevity per step.'),
  visualHint: z.string().optional().describe('A short phrase or keywords suggesting a visual for this step (e.g., "diagram of a plant cell", "flowchart of photosynthesis", "JavaScript code example: variable declaration"). Conceptual for now.'),
  miniQuiz: MiniQuizSchema.optional().describe('An optional mini-quiz question to check understanding of the current explanation. If a quiz is provided, it must include a question, options, and answerIndex.'),
  aiResponseToUserQuery: z.string().optional().describe("If the user asked a direct question, this field contains the AI's response. If present, this response should be prioritized for display/speech over a new teaching segment in this turn."),
  isLastStep: z.boolean().describe('Indicates if this is the last teaching step for the given content. Set to true ONLY when all meaningful and distinct sub-topics from the provided content have been covered and the student is ready to conclude.'),
});
export type InteractiveTutorOutput = z.infer<typeof InteractiveTutorOutputSchema>;


export async function getNextInteractiveTutorStep(input: InteractiveTutorInput): Promise<InteractiveTutorOutput | { error: string }> {
  try {
    if (!input.documentContent && !input.photoDataUri) {
      return {
        title: "Content Needed",
        explanationSegments: ["It looks like there's no content loaded for this tutoring session. Please select a document or image from your knowledge base to get started!"],
        isLastStep: true,
      };
    }
    const result = await interactiveTutorFlow(input);
     if (!result) {
        console.warn("AI returned a null response for interactive tutor step.");
        return { error: "I'm having a little trouble processing that right now. Could we try a different approach or perhaps a different topic?" };
    }
    // Ensure explanationSegments is always an array, even if AI returns a single string by mistake
    if (result.explanationSegments && typeof result.explanationSegments === 'string') {
        // @ts-ignore
        result.explanationSegments = [result.explanationSegments];
    }
    if (!result.explanationSegments || result.explanationSegments.length === 0) {
        if (result.aiResponseToUserQuery) { // If it's just an answer, that's fine
             result.explanationSegments = []; // Ensure it's an empty array
        } else if (!result.isLastStep) {
             console.warn("AI returned a step with no explanation segments and it's not the last step or a direct answer.");
             result.explanationSegments = ["I seem to be out of things to say for this particular step! Let's try moving on or ask me a question."];
        } else {
             result.explanationSegments = result.explanationSegments || ["Great job! We've covered the key points."];
        }
    }

    return result;
  } catch (e) {
    console.error("Error in getNextInteractiveTutorStep flow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the tutor flow.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "It seems my systems are a bit busy at the moment. Let's take a short break and try again in a few moments, okay?" };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "It seems some part of our current topic or your response triggered a safety filter. Let's try rephrasing or moving to a slightly different aspect of the subject."};
    }
    return { error: `I encountered an issue while preparing the next step. Details: ${errorMessage}. Maybe we can try that again?` };
  }
}

const prompt = ai.definePrompt({
  name: 'interactiveDynamicTutorStudyAIPlusPrompt',
  input: { schema: InteractiveTutorInputSchema },
  output: { schema: InteractiveTutorOutputSchema },
  prompt: `You are Study AI+, a dynamic and engaging AI tutor. Your goal is to teach Ethiopian students (high school to university) in a step-by-step, animated, and conversational manner.
Your responses are for a system that will animate text segments and use Text-to-Speech.
Personality: Warm, patient, encouraging, clear, and motivational. Use relatable analogies. Never self-refer as an AI.

Document/Image Context for this session:
- Document Name: {{{documentName}}}
{{#if documentContent}}
- Document Text: {{{documentContent}}}
{{/if}}
{{#if photoDataUri}}
- Associated Image: {{media url=photoDataUri}}
(Base your teaching primarily on this provided context.)
{{else}}
  {{#unless documentContent}}
  (No specific text or image context provided. Respond gracefully if tutoring cannot proceed.)
  {{/unless}}
{{/if}}

Session State:
- Current Teaching Step Number: {{{currentStepNumber}}} (0-indexed)
- Current Broader Topic: "{{{currentTopic}}}" (If step 0, this might be general like "Introduction to {{{documentName}}}")
{{#if previousStepTitle}}- Previous Step Title: "{{{previousStepTitle}}}"{{/if}}
{{#if previousExplanationSummary}}- Summary of Last Explanation: "{{{previousExplanationSummary}}}"{{/if}}
{{#if userQuizAnswer}}- User's Answer to Previous Quiz: "{{{userQuizAnswer}}}" (Acknowledge this if relevant. If incorrect, gently guide or re-explain in the new segments.){{/if}}
{{#if userEngagementHint}}
- User Engagement Hint: {{{userEngagementHint}}}.
  (If "confused", simplify explanations, use more direct language, or break down concepts further. If "distracted", try a more engaging tone or a direct question to re-focus.)
{{/if}}

User's Interaction:
{{#if userQuery}}
- User's Direct Question/Message: "{{{userQuery}}}"
  Task: Prioritize answering this question. Your response should be in 'aiResponseToUserQuery'. The 'title' and 'explanationSegments' can be minimal or confirm you're answering (e.g., title: "Answering Your Question"). If the question is off-topic, gently redirect to "{{{documentName}}}".
{{else}}
- Task: Generate the NEXT teaching step.
  1.  'title': Create a concise, engaging title for THIS new teaching segment/slide (e.g., "The Powerhouse: Mitochondria", "Looping with 'for' in Python").
  2.  'explanationSegments': Break down the explanation for the 'title' into 1-4 short, speakable segments (paragraphs or key points). Each segment will be animated and spoken. Keep them conversational.
  3.  'visualHint' (optional): Provide a short phrase for a hypothetical visual aid (e.g., "diagram of a plant cell", "Python for loop example").
  4.  'miniQuiz' (optional): If appropriate, create a simple MCQ quiz object to check understanding of THIS explanation. Include 'question', 'options' (2-5), 'answerIndex', and a brief 'explanation' for the correct answer.
  5.  'isLastStep': Set to true ONLY if all key concepts from "{{{documentName}}}" are covered. Don't end prematurely.
{{/if}}

{{#if chatHistory.length}}
Recent Q&A Chat History (user and Study AI+):
{{#each chatHistory}}
- {{this.role}}: {{this.text}}
{{/each}}
(Consider this history if responding to a follow-up userQuery.)
{{/if}}

General Rules:
- If no document content is available, 'title' should be "Unable to Proceed", 'explanationSegments' should explain this, and 'isLastStep' true.
- If generating a teaching step (not a direct answer), ensure 'title' and 'explanationSegments' are primary. 'aiResponseToUserQuery' should be null or empty.
- Ensure all output fields adhere to the schema. 'explanationSegments' MUST be an array of strings.
- If {{{currentStepNumber}}} is 0 and no 'userQuery', provide an engaging introduction related to "{{{documentName}}}".
- Progress logically through the material.
`,
});


const interactiveTutorFlow = ai.defineFlow(
  {
    name: 'interactiveDynamicTutorFlow',
    inputSchema: InteractiveTutorInputSchema,
    outputSchema: InteractiveTutorOutputSchema,
  },
  async (input) => {
    if (!input.documentContent && !input.photoDataUri) {
      return {
        title: "Content Needed",
        explanationSegments: ["It seems no content is loaded for our session. Please select an item from your knowledge base first!"],
        isLastStep: true,
      };
    }
    
    const {output} = await prompt(input);
    if (!output) {
        console.warn("AI returned null output for interactive tutor step.");
        throw new Error("AI tutor did not generate a valid step. The AI's response was empty.");
    }
    
    // Fallback for title and explanationSegments if AI fails to provide them but isn't just answering a query
    if (!output.aiResponseToUserQuery) {
        output.title = output.title || (output.isLastStep ? "Session Wrap-up" : `Step ${input.currentStepNumber + 1}`);
        if (!output.explanationSegments || output.explanationSegments.length === 0) {
            output.explanationSegments = output.isLastStep ? ["We've reached the end of this topic. Great work!"] : ["Let's explore this further."];
        }
    } else if (output.aiResponseToUserQuery && (!output.title || output.title.trim() === "")) {
        // If it's a direct answer, ensure title is minimal if not provided
        output.title = output.title || "Response";
        output.explanationSegments = output.explanationSegments || []; // Can be empty if direct answer is sufficient
    }


    // Ensure quiz structure is valid if present
    if (output.miniQuiz) {
        if (!output.miniQuiz.options || output.miniQuiz.options.length < 2 || output.miniQuiz.answerIndex === undefined || output.miniQuiz.answerIndex >= output.miniQuiz.options.length) {
            console.warn("AI generated an invalid or incomplete miniQuiz. Removing quiz.");
            output.miniQuiz = undefined;
        }
    }

    return output;
  }
);

// Remove old non-Tavus InteractiveTutor flow to avoid conflict if it exists in dev.ts
// This new flow replaces the previous text-based interactive tutor and is the foundation for the new dynamic one.
