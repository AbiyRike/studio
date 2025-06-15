
'use server';
/**
 * @fileOverview Conversational AI agent "StudyEthiopia AI+" that answers questions based on provided context.
 *
 * - chatWithStudyEthiopiaAI - A function that handles a turn in the conversation.
 * - AskStudyEthiopiaAIInput - The input type for the function.
 * - AskStudyEthiopiaAIOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schemas based on AskStudyEthiopiaAIMessage and its nested types
const MessagePartSchema = z.object({
  text: z.string().optional(),
  // inlineData could be added here if supporting images from user/AI in chat
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']).describe("The role of the message sender (user or model)."),
  parts: z.array(MessagePartSchema).describe("An array of message parts, typically one text part."),
});

const AskStudyEthiopiaAIInputSchema = z.object({
  documentContent: z.string().describe('The text content of the document providing context for the chat. Can be empty if photoDataUri is primary context.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Used as additional context."
    ),
  chatHistory: z.array(ChatMessageSchema).describe("The history of the conversation so far."),
  userQuery: z.string().describe("The user's latest question or message."),
  documentName: z.string().optional().describe("The name of the document being discussed, for contextual responses."),
});
export type AskStudyEthiopiaAIInput = z.infer<typeof AskStudyEthiopiaAIInputSchema>;

const AskStudyEthiopiaAIOutputSchema = z.object({
  response: z.string().describe("StudyEthiopia AI+'s response to the user's query. If the AI cannot provide a meaningful answer based on the context, it should state so politely and offer to discuss topics within the document."),
});
export type AskStudyEthiopiaAIOutput = z.infer<typeof AskStudyEthiopiaAIOutputSchema>;


export async function chatWithStudyEthiopiaAI(input: AskStudyEthiopiaAIInput): Promise<AskStudyEthiopiaAIOutput | { error: string }> {
  try {
    if (!input.documentContent && !input.photoDataUri) {
      return { error: "I need some context (document text or image) to chat about. Please select content from the knowledge base." };
    }
    if (!input.userQuery.trim()) {
        return { error: "Your message cannot be empty. What would you like to ask?" };
    }

    const result = await studyEthiopiaAIChatFlow(input);
    if (!result || !result.response) {
        console.warn("AI returned a null or empty response for StudyEthiopia AI+ chat.");
        return { error: "I didn't quite catch that or couldn't formulate a response. This might be due to the context or a temporary issue. Please try rephrasing or asking again." };
    }
    return result;
  } catch (e) {
    console.error("Error in chatWithStudyEthiopiaAI flow execution:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred in the chat flow.";
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
        return { error: "I'm currently very busy helping other students. Please try again in a few moments." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
        return { error: "Your message or the provided context could not be processed due to safety filters. Perhaps we can try a different phrasing or focus on another aspect of the material?"};
    }
    return { error: `I encountered an issue. Details: ${errorMessage}. Let's try that again, shall we?` };
  }
}

// Constructing the prompt for the AI model.
const buildPromptFromHistory = (input: AskStudyEthiopiaAIInput) => {
  let promptString = `You are StudyEthiopia AI+, a multilingual academic tutor designed to teach and assist Ethiopian students from high school to university level. You communicate in clear, conversational, and motivational language. You personalize your explanations based on the student's level and always prioritize clarity, encouragement, and understanding. You never mention that you're an AI or system – you are simply a trusted academic tutor.
Your tone is warm, patient, and empowering. You break down complex topics into manageable, relatable steps. You help students feel capable and supported, even when they’re struggling. You do not lecture; you engage with questions and examples. You use culturally relevant analogies and respect Ethiopian contexts (e.g., local curriculum, real-world examples from Ethiopian life where appropriate).
You provide responses designed for audio and video delivery, so avoid formatting like bullet points or headings. Always speak as if you're sitting across from the student, one-on-one. Your goal is to support their growth, improve their understanding, and spark curiosity in the subject.
You're the assigned subject tutor for StudyEthiopia AI+, specializing in helping students learn through voice, PDF, quiz, and flashcard formats. You offer guidance in core subjects such as Mathematics, Physics, English, Biology, Chemistry, History, Civics, ICT, and Study Skills.
You're available in both Amharic and English (assume current interaction is in the student's preferred language). You are respectful, non-judgmental, and always encouraging.
You maintain academic focus: you never discuss entertainment, politics, or off-topic themes. If a student veers off-course, kindly guide them back with prompts like: “Let’s focus on your learning for now. Shall we go back to today’s topic of '${input.documentName || 'this material'}'?” or “We’ll get the most out of our time if we keep working on your studies related to '${input.documentName || 'this material'}’.”
Your knowledge for this conversation is primarily based on the following document content and/or image. Answer the user's questions based on this information. If the question is clearly outside the scope of the provided context, politely state that you can only answer questions related to the document/image and offer to discuss something from it. Do not make up information. Be concise and helpful. If you are unsure or cannot answer from the context, say so politely.

Context (Document: ${input.documentName || 'current material'}):
`;
  if (input.documentContent) {
    promptString += `Document Text:
${input.documentContent}
`;
  }
  if (input.photoDataUri) {
    promptString += `\nAssociated Image: {{media url="${input.photoDataUri}"}}\n`;
  }
  if (!input.documentContent && !input.photoDataUri) {
    promptString += "No specific text or image context provided. Please ask general questions I can help with or select a document.\n";
  }

  promptString += "\nChat History (Student and StudyEthiopia AI+):\n";
  input.chatHistory.forEach(msg => {
    const role = msg.role === 'user' ? 'Student' : 'StudyEthiopia AI+';
    const text = msg.parts.map(p => p.text).join(' ');
    promptString += `${role}: ${text}\n`;
  });
  promptString += `Student: ${input.userQuery}\nStudyEthiopia AI+:`; // AI will complete from here

  return promptString;
};


const studyEthiopiaAIChatPrompt = ai.definePrompt({
  name: 'studyEthiopiaAIChatPrompt',
  input: { schema: AskStudyEthiopiaAIInputSchema },
  output: { schema: AskStudyEthiopiaAIOutputSchema },
  prompt: buildPromptFromHistory, 
});


const studyEthiopiaAIChatFlow = ai.defineFlow(
  {
    name: 'studyEthiopiaAIChatFlow',
    inputSchema: AskStudyEthiopiaAIInputSchema,
    outputSchema: AskStudyEthiopiaAIOutputSchema,
  },
  async (input) => {
    const { output } = await studyEthiopiaAIChatPrompt(input); 
    
    if (!output || !output.response) {
        return { response: "I'm sorry, I couldn't generate a response for that. Could you try rephrasing your question or asking about a different part of the material?" };
    }
    return output;
  }
);

