
'use server';
/**
 * @fileOverview Generates the next textual response for the Tavus-based Interactive Video Tutor.
 * This flow acts as the "brain" for what StudyEthiopia AI+ (Tavus Avatar) should say next.
 *
 * - getNextTavusTutorText - A function that determines the tutor's next lines.
 * - GetNextTavusTutorTextInput - The input type for the function.
 * - GetNextTavusTutorTextOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schemas
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']).describe("The role of the message sender (user or model/AI)."),
  text: z.string().describe("The text content of the message."),
});

const ProcessedChatMessageSchema = ChatMessageSchema.extend({
    displayRole: z.string().describe("Role to display, e.g., 'Student' or 'StudyEthiopia AI+'")
});


const GetNextTavusTutorTextInputSchema = z.object({
  documentName: z.string().describe('The name of the document being tutored.'),
  documentContent: z.string().describe('The full text content of the document. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI."
    ),
  chatHistory: z.array(ChatMessageSchema).describe("The history of the conversation so far, user and model turns."),
  userQuery: z.string().describe("The user's latest question or message to the tutor."),
  // Conversational context/system prompt is assumed to be part of the Tavus persona config,
  // but we reinforce it here via the prompt instructions.
});
export type GetNextTavusTutorTextInput = z.infer<typeof GetNextTavusTutorTextInputSchema>;

const GetNextTavusTutorTextOutputSchema = z.object({
  tutorTextResponse: z.string().describe("The textual response StudyEthiopia AI+ (the Tavus tutor) should say. This text will be used for Text-to-Speech by Tavus."),
});
export type GetNextTavusTutorTextOutput = z.infer<typeof GetNextTavusTutorTextOutputSchema>;

export async function getNextTavusTutorText(input: GetNextTavusTutorTextInput): Promise<GetNextTavusTutorTextOutput | { error: string }> {
  try {
    if ((!input.documentContent && !input.photoDataUri)) {
        return { error: "Tutor needs context (document text or image) to continue the session." };
    }
    if (!input.userQuery.trim() && input.chatHistory.length > 1) { // Allow empty query for initial AI turn if history is just the greeting
        return { error: "Your message cannot be empty. What would you like to ask or discuss?" };
    }
    const result = await getNextTavusTutorTextFlow(input);
    if (!result || !result.tutorTextResponse) {
        return { error: "The tutor couldn't formulate a response right now. Try rephrasing or asking something else."};
    }
    return result;
  } catch (e) {
    console.error("Error in getNextTavusTutorText flow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the Tavus tutor text generation flow.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "The tutor is currently very busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the context could not be processed due to safety filters. Let's try a different phrasing or topic."};
    }
    return { error: `The tutor encountered an issue: ${errorMessage}. Let's try that again?` };
  }
}

const prompt = ai.definePrompt({
  name: 'getNextTavusTutorTextPrompt',
  input: { schema: GetNextTavusTutorTextInputSchema.extend({ processedChatHistory: z.array(ProcessedChatMessageSchema) }) }, // Add processed history to input
  output: { schema: GetNextTavusTutorTextOutputSchema },
  prompt: `You are StudyEthiopia AI+, continuing a tutoring session with a student.
  Your persona and general instructions are defined in the initial 'conversational_context' (system prompt) you are operating under for this Tavus session.
  The current tutoring session is about: "{{{documentName}}}".
  Your knowledge for this session is primarily based on the Document Content and/or Image provided below.

  Document Name: {{{documentName}}}
  {{#if documentContent}}
  Document Content:
  {{{documentContent}}}
  {{/if}}
  {{#if photoDataUri}}
  Associated Image: {{media url=photoDataUri}}
  {{/if}}

  Chat History (Student and you, StudyEthiopia AI+):
  {{#each processedChatHistory}}
  {{{this.displayRole}}}: {{{this.text}}}
  {{/each}}

  Student's latest query/response: "{{{userQuery}}}"

  Your task is to generate the next 'tutorTextResponse'.
  - It should be a natural continuation of the conversation.
  - Adhere strictly to your StudyEthiopia AI+ persona and the system prompt/context you were given for this session.
  - Focus on explaining concepts from "{{{documentName}}}", asking questions, and guiding the student based on their "userQuery" and the "chatHistory".
  - Be conversational, encouraging, and clear. Remember responses are for audio/video delivery via Tavus, so avoid lists, markdown, or complex formatting.
  - If the "userQuery" is off-topic, gently redirect back to "{{{documentName}}}".
  - If the "userQuery" is a question, answer it based on the provided document/image context.
  - If the "userQuery" is an answer to your previous question, acknowledge it and proceed.
  - Generate only the text the tutor should speak. No other JSON structure.
  `,
});

const getNextTavusTutorTextFlow = ai.defineFlow(
  {
    name: 'getNextTavusTutorTextFlow',
    inputSchema: GetNextTavusTutorTextInputSchema,
    outputSchema: GetNextTavusTutorTextOutputSchema,
  },
  async (input) => {
    const processedChatHistory = input.chatHistory.map(msg => ({
        text: msg.text,
        role: msg.role,
        displayRole: msg.role === 'user' ? 'Student' : 'StudyEthiopia AI+'
    }));

    const promptInput = { ...input, processedChatHistory };
    const {output} = await prompt(promptInput);
    
    if (!output || !output.tutorTextResponse) {
        return { tutorTextResponse: "I'm sorry, I couldn't generate a response for that. Could you try rephrasing your question or asking about a different part of the material?" };
    }
    return output;
  }
);

