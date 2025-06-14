
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-questions.ts';
import '@/ai/flows/summarize-document.ts';
import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/interactive-tutor-flow.ts';
