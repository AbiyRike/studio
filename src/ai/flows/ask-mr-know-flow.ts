
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

const AskMrKnowInputSchema = z.object({
  documentContent: z.string().describe('The text content of the document providing context for the chat. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Used as additional context."
    ),
  chatHistory: z.array(ChatMessageSchema).describe("The history of the conversation so far."),
  userQuery: z.string().describe("The user's latest question or message."),
});
export type AskMrKnowInput = z.infer<typeof AskMrKnowInputSchema>;

const AskMrKnowOutputSchema = z.object({
  response: z.string().describe("Mr. Know's response to the user's query. If the AI cannot provide a meaningful answer based on the context, it should state so politely."),
});
export type AskMrKnowOutput = z.infer<typeof AskMrKnowOutputSchema>;


export async function chatWithMrKnowMMLFlow(input: AskMrKnowInput): Promise<AskMrKnowOutput | { error: string }> {
  try {
    if (!input.documentContent && !input.photoDataUri) {
      return { error: "Mr. Know needs some context (document text or image) to chat about. Please select content from the knowledge base." };
    }
    if (!input.userQuery.trim()) {
        return { error: "Your message to Mr. Know cannot be empty." };
    }

    const result = await mrKnowFlow(input);
    if (!result || !result.response) {
        console.warn("AI returned a null or empty response for Mr. Know.");
        return { error: "Mr. Know didn't provide a response. This might be due to the context or a temporary issue. Please try rephrasing or asking again." };
    }
    return result;
  } catch (e) {
    console.error("Error in chatWithMrKnowMMLFlow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the Mr. Know flow.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "Mr. Know is currently busy or rate limits have been exceeded. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the provided context could not be processed due to safety filters. Please try different phrasing or content."};
    }
    return { error: `Mr. Know encountered an issue. Details: ${errorMessage}.` };
  }
}

// Constructing the prompt for the AI model.
const buildPromptFromHistory = (input: AskMrKnowInput) => {
  let promptString = `You are "Mr. Know", a helpful and friendly AI assistant. Your knowledge is primarily based on the following document content and/or image.
Answer the user's questions based on this information. If the question is clearly outside the scope of the provided context, politely state that you can only answer questions related to the document/image.
Do not make up information. Be concise and helpful. If you are unsure or cannot answer, say so politely.

Context:
`;
  if (input.documentContent) {
    promptString += `Document Text:
${input.documentContent}
`;
  }
  if (input.photoDataUri) {
    // Ensure photoDataUri is correctly formatted for {{media}} helper
    // It expects just the Data URI string.
    promptString += `\nAssociated Image: {{media url="${input.photoDataUri}"}}\n`;
  }
  if (!input.documentContent && !input.photoDataUri) {
    promptString += "No specific text or image context provided.\n";
  }

  promptString += "\nChat History (User and Mr. Know):\n";
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
  prompt: buildPromptFromHistory, 
});


const mrKnowFlow = ai.defineFlow(
  {
    name: 'mrKnowFlow',
    inputSchema: AskMrKnowInputSchema,
    outputSchema: AskMrKnowOutputSchema,
  },
  async (input) => {
    const { output } = await mrKnowPrompt(input); 
    
    if (!output || !output.response) {
        // This case is also handled in the wrapper, but good to have a specific check here.
        // Returning a structured output as per schema, even if the response is a polite "I cannot answer"
        return { response: "I'm sorry, I couldn't generate a response for that. Please try rephrasing your question or asking something else related to the context." };
    }
    return output;
  }
);

