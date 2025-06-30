/*
  # Initial Schema Setup for Study AI+

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `department` (text, nullable)
      - `institution` (text, nullable)
      - `birthday` (date, nullable)
      - `profile_pic_url` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `knowledge_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_name` (text)
      - `document_content` (text)
      - `media_data_uri` (text, nullable)
      - `summary` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `learning_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_name` (text)
      - `summary` (text)
      - `questions` (jsonb)
      - `document_content` (text, nullable)
      - `media_data_uri` (text, nullable)
      - `user_answers` (jsonb)
      - `score` (integer)
      - `completed_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  institution TEXT,
  birthday DATE,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create knowledge_items table
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_content TEXT NOT NULL,
  media_data_uri TEXT,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create learning_history table
CREATE TABLE IF NOT EXISTS learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  questions JSONB NOT NULL,
  document_content TEXT,
  media_data_uri TEXT,
  user_answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for knowledge_items
CREATE POLICY "Users can view their own knowledge items"
  ON knowledge_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge items"
  ON knowledge_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge items"
  ON knowledge_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge items"
  ON knowledge_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for learning_history
CREATE POLICY "Users can view their own learning history"
  ON learning_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning history"
  ON learning_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning history"
  ON learning_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();