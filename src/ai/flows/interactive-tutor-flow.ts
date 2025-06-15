
'use server';
/**
 * @fileOverview Interactive tutoring AI agent, StudyEthiopia AI+.
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
  question: z.string().describe("The question for the mini-quiz, phrased clearly for a student."),
  type: z.enum(['mcq', 'short_answer']).describe("The type of mini-quiz question."),
  options: z.array(z.string()).optional().describe("Options for MCQ. Should be 3-4 options if type is mcq."),
  answer: z.union([z.number(), z.string()]).optional().describe("Index of correct option for MCQ (0-indexed), or correct string for short_answer. This is for internal AI use or validation."),
  explanation: z.string().optional().describe("Brief, encouraging explanation for the correct answer of the mini-quiz. This is for internal AI use or validation."),
});

const InteractiveTutorInputSchema = z.object({
  documentName: z.string().describe('The name of the document being tutored.'),
  documentContent: z.string().describe('The full text content of the document being tutored. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI."
    ),
  currentTopic: z.string().optional().describe("The current topic being discussed, if any. For the first step, this can be omitted."),
  previousExplanation: z.string().optional().describe("The previous explanation given by the tutor, if any."),
  userQuizAnswer: z.string().optional().describe("The user's answer to the previous mini-quiz, if any. The AI should evaluate this if present and can provide feedback implicitly in the next explanation or as part of a new quiz if relevant."),
  currentStep: z.number().describe("The current step number in the tutoring session (0-indexed). This is the step number THE AI IS GENERATING."),
});
export type InteractiveTutorInput = z.infer<typeof InteractiveTutorInputSchema>;

const InteractiveTutorOutputSchema = z.object({
  topic: z.string().describe('The specific topic or sub-topic for this tutoring step. Should be a concise title for the explanation to follow.'),
  explanation: z.string().describe('A clear and concise explanation of the current topic/concept, derived from the document content. If the user answered a quiz, feedback can be woven in or a new point made. Language should be warm, patient, and empowering. Use culturally relevant analogies for Ethiopian students if possible.'),
  explanationAudioUri: z.string().optional().describe('Placeholder for a URI to a TTS audio of the explanation. The AI should not generate this URI; it is for system use.'),
  miniQuiz: MiniQuizSchema.optional().describe('An optional mini-quiz question to check understanding of the current explanation. If a quiz is provided, it must include a question and type. For MCQs, provide 3-4 options. Questions should be encouraging.'),
  isLastStep: z.boolean().describe('Indicates if this is the last step in the tutoring session for the given content. Set to true ONLY when all meaningful and distinct sub-topics from the provided content have been covered and the student is ready to conclude.'),
});
export type InteractiveTutorOutput = z.infer<typeof InteractiveTutorOutputSchema>;


export async function getNextInteractiveTutorStep(input: InteractiveTutorInput): Promise<InteractiveTutorOutput | { error: string }> {
  try {
    if (!input.documentContent && !input.photoDataUri) {
      return { 
        topic: "Content Needed",
        explanation: "It looks like there's no content loaded for this tutoring session. Please select a document or image from your knowledge base to get started!",
        isLastStep: true,
      };
    }
    const result = await interactiveTutorFlow(input);
     if (!result) {
        console.warn("AI returned a null response for interactive tutor step.");
        return { error: "I'm having a little trouble processing that right now. Could we try a different approach or perhaps a different topic?" };
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
  name: 'interactiveTutorStudyEthiopiaPrompt',
  input: { schema: InteractiveTutorInputSchema },
  output: { schema: InteractiveTutorOutputSchema },
  prompt: `You are StudyEthiopia AI+, a multilingual academic tutor designed to teach and assist Ethiopian students from high school to university level. You communicate in clear, conversational, and motivational language. You personalize your explanations based on the student's level and always prioritize clarity, encouragement, and understanding. You never mention that you're an AI or system – you are simply a trusted academic tutor.
Your tone is warm, patient, and empowering. You break down complex topics into manageable, relatable steps. You help students feel capable and supported, even when they’re struggling. You do not lecture; you engage with questions and examples. You use culturally relevant analogies and respect Ethiopian contexts (e.g., local curriculum, real-world examples from Ethiopian life where appropriate).
You provide responses designed for audio and video delivery, so avoid formatting like bullet points or headings. Always speak as if you're sitting across from the student, one-on-one. Your goal is to support their growth, improve their understanding, and spark curiosity in the subject.
You're the assigned subject tutor for StudyEthiopia AI+, specializing in helping students learn through voice, PDF, quiz, and flashcard formats. You offer guidance in core subjects such as Mathematics, Physics, English, Biology, Chemistry, History, Civics, ICT, and Study Skills.
You're available in both Amharic and English, switching based on the student's preferred language (assume the current interaction language is appropriate unless specified by user input). You are respectful, non-judgmental, and always encouraging. Your teaching style is Socratic and interactive – asking questions, offering real-world analogies, and checking understanding frequently.
You maintain academic focus: you never discuss entertainment, politics, or off-topic themes. If a student veers off-course, kindly guide them back with prompts like: “That's an interesting thought! For now, let’s focus on our learning. Shall we go back to today’s topic on '{{{documentName}}}'?” or “I see your point. To make the most of our time, let's keep working on your studies related to '{{{documentName}}}'. What were you thinking about that?”
You are built to be highly aware of student mood, tone, and engagement. If they seem bored or distracted (which you cannot directly observe here, but assume they might be if they make very short or off-topic replies), ask gently: “Would you prefer we try this topic in a different way?” or “Is there something in this subject you find difficult that I can help with right now?”
You are their mentor, motivator, and guide — always reinforcing the idea that learning is a journey, and every step forward is worth celebrating.

Document/Image Content to Tutor:
{{#if documentContent}}
Document Text: {{{documentContent}}}
{{/if}}
{{#if photoDataUri}}
Image Associated with Content: {{media url=photoDataUri}}
Base your tutoring on this information.
{{else}}
{{#unless documentContent}}
No content provided.
{{/unless}}
{{/if}}

Tutoring Session Context:
- Document Name: {{{documentName}}}
- Step Number You Are Generating: {{{currentStep}}} (0-indexed).
{{#if currentTopic}}- Previous Topic Focus: {{{currentTopic}}}{{/if}}
{{#if previousExplanation}}- Previous Explanation You Gave: {{{previousExplanation}}}{{/if}}
{{#if userQuizAnswer}}- User's Answer to Last Mini-Quiz: {{{userQuizAnswer}}} (Evaluate this. If it's incorrect or shows misunderstanding, your new 'explanation' should gently clarify or re-approach the concept. If correct, acknowledge and build upon it.) {{else if currentStep > 0}} (No quiz answer submitted for the previous step, or there was no quiz.) {{/if}}

Task for generating step {{{currentStep}}}:
1.  'topic': Determine the next logical topic or sub-topic from the document content. If step 0, provide an introductory topic. If {{{currentTopic}}} was "Congratulations..." then this is truly the end.
2.  'explanation': Provide a clear, conversational, and encouraging explanation for this topic. Use relatable examples or analogies if possible. If the user gave a quiz answer, weave in feedback naturally. Keep it concise and focused.
3.  'miniQuiz' (optional): If appropriate for this step, create a mini-quiz object.
    - 'question': A clear question.
    - 'type': 'mcq' or 'short_answer'.
    - 'options' (if 'mcq'): 3-4 options.
    - The internal 'answer' and 'explanation' for the quiz should be for validation but not directly shown to the student unless it's part of a review summary you might construct.
4.  'isLastStep': Set to true ONLY if all meaningful and distinct sub-topics from the provided content have been thoroughly covered. If you are giving a concluding message, set this to true. Do not end prematurely. The goal is a comprehensive understanding.

If no document content AND no image is provided, 'topic' should be "Unable to Proceed", 'explanation' to "I'm ready to help you learn, but it seems we don't have any material loaded for our session. Could you please select a document or image from your knowledge base?", and 'isLastStep' to true.
Remember, your output must be valid JSON. Avoid markdown like bullet points in the direct 'explanation' or 'quiz question'.
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
        topic: "Content Needed",
        explanation: "It looks like there's no content loaded for this tutoring session. Please select a document or image from your knowledge base to get started!",
        isLastStep: true,
      };
    }
    
    const {output} = await prompt(input);
    if (!output) {
        console.warn("AI returned null output for interactive tutor step.");
        return {
            topic: "Let's Try That Again",
            explanation: "I had a little trouble generating the next step. Could we try proceeding again, or perhaps you'd like to rephrase your last response if you provided one?",
            isLastStep: false, // Assume not last step on error, to allow retry
        };
    }
    // Ensure quiz structure is valid if present
    if (output.miniQuiz) {
        if (output.miniQuiz.type === 'mcq' && (!output.miniQuiz.options || output.miniQuiz.options.length < 2)) {
            console.warn("AI generated MCQ quiz without sufficient options. Removing quiz.");
            output.miniQuiz = undefined;
        }
    }

    return output;
  }
);

    
