
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-questions.ts';
import '@/ai/flows/summarize-document.ts';
import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/interactive-tutor-flow.ts';
import '@/ai/flows/ask-mr-know-flow.ts';
import '@/ai/flows/get-programming-languages-flow.ts';
import '@/ai/flows/get-code-teaching-step-flow.ts';

