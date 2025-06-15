
'use server';
/**
 * @fileOverview Generates conversational context for a Tavus-based AI tutor.
 *
 * - generateTavusTutorPersonaContext - Creates system prompt, conversation name, and greeting.
 * - GenerateTavusTutorPersonaContextInputSchema - The input schema type for the flow.
 * - GenerateTavusTutorPersonaContextOutputSchema - The output schema type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateTavusTutorPersonaContextInputSchema = z.object({
  documentName: z.string().describe('The name or title of the document/content the tutor will focus on.'),
  documentContent: z.string().describe('The main text content of the document. Can be empty if photoDataUri is primary context.'),
  mediaDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the document, as a data URI."
    ),
});
export type GenerateTavusTutorPersonaContextInput = z.infer<typeof GenerateTavusTutorPersonaContextInputSchema>;

export const GenerateTavusTutorPersonaContextOutputSchema = z.object({
  conversation_name: z.string().describe("A suitable name for the Tavus conversation, e.g., 'Tutoring Session: [Document Name]'."),
  conversational_context: z.string().describe("The detailed system prompt for the Tavus persona. This should guide the AI to act as StudyEthiopia AI+ for the specific document."),
  custom_greeting: z.string().describe("A warm, engaging opening line for the tutor, specific to the document."),
});
export type GenerateTavusTutorPersonaContextOutput = z.infer<typeof GenerateTavusTutorPersonaContextOutputSchema>;


export async function generateTavusTutorPersonaContext(input: GenerateTavusTutorPersonaContextInput): Promise<GenerateTavusTutorPersonaContextOutput | {error: string}> {
    try {
        const result = await generateTavusTutorPersonaContextFlowInternal(input);
        if (!result || !result.conversation_name || !result.conversational_context || !result.custom_greeting) {
            console.warn("AI failed to generate all parts of Tavus persona context.");
            const defaultGreeting = `Hello! I'm StudyEthiopia AI+, and I'm ready to explore ${input.documentName || 'this topic'} with you! What's on your mind?`;
            const defaultContext = `You are StudyEthiopia AI+, a friendly and knowledgeable tutor. You are helping a student learn about "${input.documentName || 'the selected topic'}". Be encouraging and explain concepts clearly. Use the provided content as your primary reference: ${input.documentContent || ''} ${input.mediaDataUri ? `Associated Image: {{media url=${input.mediaDataUri}}}` : '' }`;
            return {
                conversation_name: `Tutoring: ${input.documentName || 'Selected Topic'}`,
                conversational_context: defaultContext,
                custom_greeting: defaultGreeting,
            };
        }
        return result;
    } catch (e) {
        console.error("Error in generateTavusTutorPersonaContext flow execution:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred generating persona context.";
        return { error: `Failed to prepare the tutor session: ${errorMessage}` };
    }
}

const prompt = ai.definePrompt({
  name: 'generateTavusTutorPersonaContextPrompt',
  input: { schema: GenerateTavusTutorPersonaContextInputSchema },
  output: { schema: GenerateTavusTutorPersonaContextOutputSchema },
  prompt: `You are an AI assistant tasked with creating the setup for a conversational video tutor persona named "StudyEthiopia AI+".
The tutor's goal is to help Ethiopian students (high school to university) learn specific content.
The tutor should be:
- Multilingual (Amharic and English, assume current interaction is in the student's preferred language).
- Clear, conversational, motivational, patient, and empowering.
- Able to personalize explanations and break down complex topics.
- Interactive, using questions and examples, not lectures.
- Culturally aware and respectful of Ethiopian contexts.
- Focused on academic subjects (Math, Physics, English, Biology, Chemistry, History, Civics, ICT, Study Skills).
- Never self-referential as an AI or system.
- Able to gently redirect off-topic discussions back to the learning material.

Given the following document details, generate:
1. 'conversation_name': A suitable name for a Tavus conversation, e.g., "Interactive Session on [Document Name]".
2. 'conversational_context': A comprehensive system prompt for the Tavus AI. This is the core instruction set for the persona. It should incorporate all the StudyEthiopia AI+ traits mentioned above, and specifically state that the tutor is focusing on the provided document/image.
   Example: "You are StudyEthiopia AI+, a warm and knowledgeable tutor. You are currently helping a student understand a document titled '{{{documentName}}}'. Your expertise for this session is based on the following content: {{#if documentContent}}Document Text: {{{documentContent}}}{{/if}} {{#if mediaDataUri}}Associated Image: {{media url=mediaDataUri}}{{/if}}. Engage the student with questions, explain concepts clearly, and encourage them. Remember to be patient and motivational..."
3. 'custom_greeting': A friendly and engaging opening line for the tutor to start the video conversation, specific to the document.
   Example: "Welcome! I'm StudyEthiopia AI+, and I'm really looking forward to exploring '{{{documentName}}}' with you today. Where shall we begin our learning journey?"

Document Name: {{{documentName}}}
{{#if documentContent}}
Document Content:
{{{documentContent}}}
{{/if}}
{{#if mediaDataUri}}
Image to consider: {{media url=mediaDataUri}}
{{/if}}
{{#unless documentContent}}{{#unless mediaDataUri}}
No specific document content or image provided. Generate generic context for StudyEthiopia AI+.
{{/unless}}{{/unless}}

Ensure the output is a valid JSON object strictly matching the GenerateTavusTutorPersonaContextOutputSchema.
The 'conversational_context' must be detailed and provide strong guidance for the AI.
The 'custom_greeting' should be welcoming and reference the document name.
If no document content or image is provided, create a generic greeting and context for StudyEthiopia AI+ related to general study help.
`,
});

const generateTavusTutorPersonaContextFlowInternal = ai.defineFlow(
  {
    name: 'generateTavusTutorPersonaContextFlowInternal',
    inputSchema: GenerateTavusTutorPersonaContextInputSchema,
    outputSchema: GenerateTavusTutorPersonaContextOutputSchema,
  },
  async (input) => {
    if (!input.documentContent && !input.mediaDataUri) {
        return {
            conversation_name: `General Tutoring Session with StudyEthiopia AI+`,
            conversational_context: `You are StudyEthiopia AI+, a friendly and knowledgeable tutor. You are ready to help a student with various academic topics. Be encouraging and explain concepts clearly. Your persona is warm, patient, and empowering. Ask questions to understand the student's needs.`,
            custom_greeting: `Hello! I'm StudyEthiopia AI+. What can I help you learn about today?`
        };
    }
    const {output} = await prompt(input);
    if (!output || !output.conversation_name || !output.conversational_context || !output.custom_greeting) {
        console.warn("AI failed to generate all parts of Tavus persona context, using fallback.");
        const defaultGreeting = `Hello! I'm StudyEthiopia AI+, and I'm ready to explore ${input.documentName || 'this topic'} with you! What's on your mind?`;
        const defaultContext = `You are StudyEthiopia AI+, a friendly and knowledgeable tutor. You are helping a student learn about "${input.documentName || 'the selected topic'}". Be encouraging and explain concepts clearly. Use the provided content as your primary reference: ${input.documentContent || ''} ${input.mediaDataUri ? `Associated Image: {{media url=${input.mediaDataUri}}}`: ''}`;

        return { 
            conversation_name: `Tutoring: ${input.documentName || 'Selected Topic'}`,
            conversational_context: defaultContext,
            custom_greeting: defaultGreeting
        };
    }
    return output;
  }
);
