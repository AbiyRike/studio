
'use server';
/**
 * @fileOverview Conversational AI agent "Mr. Know" that answers questions based on provided context.
 *
 * - chatWithMrKnowMMLFlow - A function that handles a turn in the conversation.
 * - AskMrKnowInput - The input type for the function.
 * - AskMrKnowOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schemas based on AskMrKnowMessage and its nested types
const MessagePartSchema = z.object({
  text: z.string().optional(),
  // inlineData could be added here if supporting images from user/AI in chat
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']).describe("The role of the message sender (user or model)."),
  parts: z.array(MessagePartSchema).describe("An array of message parts, typically one text part."),
});

export const AskMrKnowInputSchema = z.object({
  documentContent: z.string().describe('The text content of the document providing context for the chat. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI. Used as additional context."
    ),
  chatHistory: z.array(ChatMessageSchema).describe("The history of the conversation so far."),
  userQuery: z.string().describe("The user's latest question or message."),
});
export type AskMrKnowInput = z.infer<typeof AskMrKnowInputSchema>;

export const AskMrKnowOutputSchema = z.object({
  response: z.string().describe("Mr. Know's response to the user's query."),
});
export type AskMrKnowOutput = z.infer<typeof AskMrKnowOutputSchema>;


export async function chatWithMrKnowMMLFlow(input: AskMrKnowInput): Promise<AskMrKnowOutput | { error: string }> {
  try {
    // Initial basic validation
    if (!input.documentContent && !input.photoDataUri) {
      return { error: "Mr. Know needs some context (document text or image) to chat about." };
    }
    if (!input.userQuery.trim()) {
        return { error: "User query cannot be empty." };
    }

    const result = await mrKnowFlow(input);
    return result;
  } catch (e) {
    console.error("Error in chatWithMrKnowMMLFlow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the Mr. Know flow.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "Mr. Know is currently busy. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the context could not be processed due to safety filters."};
    }
    return { error: `Mr. Know processing failed. Details: ${errorMessage}.` };
  }
}

// Constructing the prompt for the AI model.
// We'll use a system message to set the persona and task, then append the chat history and the new user query.
const buildPromptFromHistory = (input: AskMrKnowInput) => {
  let promptString = `You are "Mr. Know", a helpful AI assistant. Your knowledge is primarily based on the following document content and/or image.
Answer the user's questions based on this information. If the question is outside the scope of the provided context, politely state that you can only answer questions related to the document.
Do not make up information. Be concise and helpful.

Document Context:
`;
  if (input.documentContent) {
    promptString += `Text:
${input.documentContent}
`;
  }
  if (input.photoDataUri) {
    promptString += `\nImage: {{media url=${input.photoDataUri}}}\n`; // Using media helper
  }

  promptString += "\nChat History:\n";
  input.chatHistory.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Mr. Know';
    const text = msg.parts.map(p => p.text).join(' ');
    promptString += `${role}: ${text}\n`;
  });
  promptString += `User: ${input.userQuery}\nMr. Know:`; // AI will complete from here

  return promptString;
};


const mrKnowPrompt = ai.definePrompt({
  name: 'mrKnowPrompt',
  input: { schema: AskMrKnowInputSchema },
  output: { schema: AskMrKnowOutputSchema },
  prompt: buildPromptFromHistory, // Use the dynamic prompt builder
});


const mrKnowFlow = ai.defineFlow(
  {
    name: 'mrKnowFlow',
    inputSchema: AskMrKnowInputSchema,
    outputSchema: AskMrKnowOutputSchema,
  },
  async (input) => {
    // Generate the full prompt string dynamically using the helper
    // This is because definePrompt's 'prompt' field itself is a template string,
    // and we need to pass the dynamically generated string into that template.
    // However, if definePrompt's prompt function can handle complex objects, this might be simpler.
    // For now, we assume the 'prompt' field in definePrompt expects a handlebars string.
    // The `buildPromptFromHistory` already generates the full string.
    // So, we effectively pass this generated string to the model via the prompt object.

    const { output } = await mrKnowPrompt(input); // Pass the structured input
    
    if (!output || !output.response) {
        // This case should ideally be handled by Zod schema validation in the prompt definition or a more specific error.
        throw new Error("AI did not return a valid response for Mr. Know. The output was null or undefined.");
    }
    return output;
  }
);
