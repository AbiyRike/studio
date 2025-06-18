'use server';
/**
 * @fileOverview Interactive dynamic tutoring AI agent, Study AI+.
 * This flow generates animated, text-based tutoring scenes and handles quiz generation/evaluation.
 *
 * - getNextInteractiveTutorStep - Main function.
 * - InteractiveTutorInput - Input type.
 * - InteractiveTutorOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const iconHints = ["Brain", "Lightbulb", "Zap", "BookOpen", "Palette", "FileText", "DatabaseZap", "Edit3", "Layers", "GraduationCap", "MessageCircleQuestion", "Code2", "Sparkles", "HelpCircle", "CheckCircle", "XCircle", "DivideCircle", "AlertCircle"] as const;
const colorThemeHints = ["science", "technology", "history", "arts", "general", "mathematics", "language"] as const;


const InteractiveTutorInputSchema = z.object({
  documentName: z.string().describe('The name of the document being tutored.'),
  documentContent: z.string().describe('The full text content of the document. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z.string().optional().describe("An optional photo related to the document, as a data URI."),
  
  currentLearningContext: z.string().optional().describe("A summary of what has been taught so far, or the specific topic/sub-topic the AI should focus on for the next teaching step or quiz. For the first step, this can be 'Start of session'."),
  
  interactionMode: z.enum(["teach", "generate_quiz", "evaluate_answer"]).describe("The desired mode of interaction: 'teach' for a new learning scene, 'generate_quiz' to create a quiz based on current context, 'evaluate_answer' to check a user's quiz response."),
  
  userQuizAnswer: z.string().optional().describe("The user's selected answer text for a quiz question (if interactionMode is 'evaluate_answer')."),
  quizQuestionContext: z.string().optional().describe("The text of the quiz question the user just answered (if interactionMode is 'evaluate_answer')."),
});
export type InteractiveTutorInput = z.infer<typeof InteractiveTutorInputSchema>;

const TeachingSceneSchema = z.object({
  title: z.string().describe('A concise, engaging title for this teaching scene (e.g., "Understanding Photosynthesis", "Key Characters in Hamlet").'),
  description: z.string().describe('The main teaching content for this scene, broken into a few natural paragraphs or key points. This text will be spoken and displayed. Aim for 2-4 sentences per paragraph for good pacing.'),
  iconName: z.enum(iconHints).describe('A hint for a relevant Lucide icon to display (e.g., "Brain", "Lightbulb"). Choose from the provided list.'),
  colorThemeHint: z.enum(colorThemeHints).describe('A hint for a color theme for the scene (e.g., "science", "arts"). Choose from the provided list.'),
  isLastTeachingStep: z.boolean().optional().default(false).describe('Indicates if this is the last meaningful teaching step for the given document content. Set to true ONLY when all key concepts are covered. If true, the title/description should reflect completion.'),
});

const QuizSchema = z.object({
  question: z.string().describe("The quiz question, phrased clearly for a student, based on the currentLearningContext."),
  options: z.array(z.string()).min(3).max(4).describe("An array of 3 or 4 multiple-choice options."),
  answerIndex: z.number().min(0).describe("0-indexed correct answer in the options array."),
  explanation: z.string().describe("A brief, encouraging explanation for why the correct answer is right. This is shown after the user attempts the quiz."),
});

const FeedbackSchema = z.object({
  text: z.string().describe("Encouraging and constructive feedback on the user's quiz answer. If correct, positive reinforcement. If incorrect, a gentle correction and brief re-explanation related to the quiz question."),
  isCorrect: z.boolean().describe("Whether the user's answer was correct or not."),
});

const InteractiveTutorOutputSchema = z.object({
  mode: z.enum(["teach", "quiz", "feedback"]).describe("The mode this output corresponds to."),
  teachingScene: TeachingSceneSchema.optional().describe("The content for a teaching scene, if mode is 'teach'."),
  quiz: QuizSchema.optional().describe("The quiz question and options, if mode is 'quiz'."),
  feedback: FeedbackSchema.optional().describe("Feedback on the user's quiz answer, if mode is 'feedback'."),
});
export type InteractiveTutorOutput = z.infer<typeof InteractiveTutorOutputSchema>;


export async function getNextInteractiveTutorStep(input: InteractiveTutorInput): Promise<InteractiveTutorOutput | { error: string }> {
  try {
    if (!input.documentContent && !input.photoDataUri) {
       return { error: "It looks like there's no content loaded for this tutoring session. Please select a document or image." };
    }
    if (input.interactionMode === "evaluate_answer" && (!input.userQuizAnswer || !input.quizQuestionContext)) {
        return { error: "Missing user answer or question context for evaluation."}
    }
    
    const result = await interactiveTutorFlow(input);
     if (!result) {
        console.warn("AI returned a null response for interactive tutor step.");
        return { error: "I'm having a little trouble processing that right now. Could we try that again or perhaps a different topic?" };
    }
    
    // Validate required fields based on mode
    if (result.mode === "teach" && !result.teachingScene) {
        return { error: "AI failed to generate teaching content. Please try again." };
    }
    if (result.mode === "quiz" && !result.quiz) {
        return { error: "AI failed to generate a quiz. Please try again." };
    }
    if (result.mode === "feedback" && !result.feedback) {
        return { error: "AI failed to generate feedback. Please try again." };
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

const PromptInputSchema = InteractiveTutorInputSchema.extend({
    interactionMode_is_teach: z.boolean().optional(),
    interactionMode_is_generate_quiz: z.boolean().optional(),
    interactionMode_is_evaluate_answer: z.boolean().optional(),
});

const prompt = ai.definePrompt({
  name: 'interactiveDynamicTutorStudyAIPlusPromptFinal',
  input: { schema: PromptInputSchema },
  output: { schema: InteractiveTutorOutputSchema },
  prompt: `You are Study AI+, a dynamic and engaging AI tutor. Your goal is to teach Ethiopian students (high school to university) using visually appealing "teaching scenes" and interactive quizzes.
Personality: Warm, patient, encouraging, clear, and motivational. Use relatable analogies. Never self-refer as an AI.

Document Context for this session:
- Document Name: {{{documentName}}}
{{#if documentContent}}
- Document Text: {{{documentContent}}}
{{/if}}
{{#if photoDataUri}}
- Associated Image: {{media url=photoDataUri}}
(Base your teaching primarily on this provided context.)
{{else}}
  {{#unless documentContent}}
  (No specific text or image context provided.)
  {{/unless}}
{{/if}}

Current Interaction Mode: {{{interactionMode}}}
Current Learning Context: "{{{currentLearningContext}}}" (This is a summary of what was last taught, or "Start of session" if new.)

Your Task:
{{#if interactionMode_is_teach}}
  Respond with 'mode: "teach"'.
  Generate a 'teachingScene' object:
  - 'title': A concise, engaging title for THIS new teaching segment (e.g., "The Powerhouse: Mitochondria", "Understanding For Loops").
  - 'description': The main teaching content, 2-4 sentences. Make it conversational and clear for audio delivery.
  - 'iconName': Choose ONE relevant icon name from this list: ${iconHints.join(", ")}. Pick 'AlertCircle' if no other icon seems fitting or for error states.
  - 'colorThemeHint': Choose ONE theme hint from this list: ${colorThemeHints.join(", ")}.
  - 'isLastTeachingStep': Set to true ONLY if all key concepts from "{{{documentName}}}" are covered and this is the absolute final teaching scene. If so, title/description should be a wrap-up.
  Focus on the next logical piece of information based on 'currentLearningContext'. If 'currentLearningContext' is "Start of session", provide an engaging introduction to "{{{documentName}}}".
{{/if}}

{{#if interactionMode_is_generate_quiz}}
  Respond with 'mode: "quiz"'.
  Based on the 'currentLearningContext' (which should be the content of the last teaching scene), generate a 'quiz' object:
  - 'question': A single, clear multiple-choice question that tests understanding of the 'currentLearningContext'.
  - 'options': An array of 3 or 4 plausible string options.
  - 'answerIndex': The 0-based index of the correct option.
  - 'explanation': A brief, encouraging explanation of why the correct answer is right.
{{/if}}

{{#if interactionMode_is_evaluate_answer}}
  Respond with 'mode: "feedback"'.
  The user answered: "{{{userQuizAnswer}}}" for the question: "{{{quizQuestionContext}}}".
  Generate a 'feedback' object:
  - 'text': Provide encouraging feedback. If correct, affirm it. If incorrect, gently correct and briefly re-iterate the core concept from the 'quizQuestionContext' or why the chosen answer was not best.
  - 'isCorrect': Boolean, true if 'userQuizAnswer' corresponds to the correct concept in 'quizQuestionContext'. You'll need to infer this based on the question and typical right/wrong answers.
{{/if}}

General Rules:
- If no document content is available and mode is 'teach', title should be "Unable to Proceed", description explain this, iconName "AlertCircle", colorThemeHint "general", isLastTeachingStep true.
- Ensure all output fields strictly adhere to the schema for the specified mode.
- Be creative with 'iconName' and 'colorThemeHint' to make scenes visually distinct and relevant.
- Descriptions should be speakable and engaging.
`,
});


const interactiveTutorFlow = ai.defineFlow(
  {
    name: 'interactiveDynamicTutorFlowFinal',
    inputSchema: InteractiveTutorInputSchema, // Original input schema for the flow
    outputSchema: InteractiveTutorOutputSchema,
  },
  async (input) => {
    if (!input.documentContent && !input.photoDataUri && input.interactionMode === "teach") {
      return {
        mode: "teach",
        teachingScene: {
            title: "Content Needed",
            description: "It seems no content is loaded for our session. Please select an item from your knowledge base first!",
            iconName: "AlertCircle" as const,
            colorThemeHint: "general" as const,
            isLastTeachingStep: true,
        }
      };
    }
    
    // Augment input for the prompt
    const promptInput = {
        ...input,
        interactionMode_is_teach: input.interactionMode === "teach",
        interactionMode_is_generate_quiz: input.interactionMode === "generate_quiz",
        interactionMode_is_evaluate_answer: input.interactionMode === "evaluate_answer",
    };

    const {output} = await prompt(promptInput);

    if (!output) {
        console.warn("AI returned null output for interactive tutor step.");
        throw new Error("AI tutor did not generate a valid step. The AI's response was empty.");
    }
    
    // Basic validation/fallback for teachingScene if mode is teach but content is missing
    if (output.mode === "teach" && !output.teachingScene) {
        console.warn("AI responded with 'teach' mode but missing teachingScene. Providing fallback.");
        output.teachingScene = {
            title: "Oops!",
            description: "I had a little trouble preparing that specific learning segment. Let's try moving to the next idea, or you can ask me to quiz you on what we've covered!",
            iconName: "HelpCircle" as const,
            colorThemeHint: "general" as const,
            isLastTeachingStep: false,
        };
    }
     // Basic validation for quiz
    if (output.mode === "quiz" && output.quiz) {
        if (!output.quiz.options || output.quiz.options.length < 3 || output.quiz.answerIndex === undefined || output.quiz.answerIndex >= output.quiz.options.length) {
            console.warn("AI generated an invalid or incomplete quiz. Providing fallback quiz.");
            output.quiz = {
                question: "Which of these is a primary color?",
                options: ["Green", "Orange", "Blue", "Purple"],
                answerIndex: 2,
                explanation: "Blue is a primary color. Primary colors are sets of colors that can be combined to make a useful range of colors."
            };
        }
    }
    // Basic validation for feedback
     if (output.mode === "feedback" && !output.feedback) {
        console.warn("AI responded with 'feedback' mode but missing feedback object. Providing fallback.");
        output.feedback = {
            text: "Thanks for your answer! Let's continue our learning journey.",
            isCorrect: true, 
        };
    }
    return output;
  }
);
