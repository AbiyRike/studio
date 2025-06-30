import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      knowledge_items: {
        Row: {
          id: string;
          user_id: string;
          document_name: string;
          document_content: string;
          media_data_uri?: string;
          summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_name: string;
          document_content: string;
          media_data_uri?: string;
          summary: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_name?: string;
          document_content?: string;
          media_data_uri?: string;
          summary?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_history: {
        Row: {
          id: string;
          user_id: string;
          document_name: string;
          summary: string;
          questions: JSON;
          document_content?: string;
          media_data_uri?: string;
          user_answers: JSON;
          score: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_name: string;
          summary: string;
          questions: JSON;
          document_content?: string;
          media_data_uri?: string;
          user_answers: JSON;
          score: number;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_name?: string;
          summary?: string;
          questions?: JSON;
          document_content?: string;
          media_data_uri?: string;
          user_answers?: JSON;
          score?: number;
          completed_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          department?: string;
          institution?: string;
          birthday?: string;
          profile_pic_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          department?: string;
          institution?: string;
          birthday?: string;
          profile_pic_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          department?: string;
          institution?: string;
          birthday?: string;
          profile_pic_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};