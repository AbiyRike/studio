// Functions in this file operate on both Supabase and localStorage for backward compatibility
// Server Actions can import utilities like generateId from here

import { supabase } from '@/lib/supabase';

export interface KnowledgeBaseItem {
  id: string;
  documentName: string;
  documentContent: string; // Can be empty if mediaDataUri is the primary content
  mediaDataUri?: string; // For images/audio representations
  summary: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

const KNOWLEDGE_BASE_STORAGE_KEY = 'geminiAIKnowledgeBase';

// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Get items from localStorage (for backward compatibility)
export const getKnowledgeBaseItems = async (): Promise<KnowledgeBaseItem[]> => {
  if (typeof window === 'undefined') return [];
  
  // Try to get user from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, get items from Supabase
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching knowledge base items from Supabase", error);
      // Fall back to localStorage
      return getLocalKnowledgeBaseItems();
    }
    
    // Transform Supabase data to match KnowledgeBaseItem interface
    return data.map(item => ({
      id: item.id,
      documentName: item.document_name,
      documentContent: item.document_content,
      mediaDataUri: item.media_data_uri,
      summary: item.summary,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } else {
    // User is not authenticated, use localStorage
    return getLocalKnowledgeBaseItems();
  }
};

// Get items from localStorage only
const getLocalKnowledgeBaseItems = (): KnowledgeBaseItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
  try {
    return storedData ? JSON.parse(storedData) : [];
  } catch (e) {
    console.error("Error parsing knowledge base items from localStorage", e);
    return [];
  }
};

// Add or update an item
export const addKnowledgeBaseItem = async (item: KnowledgeBaseItem): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Try to get user from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, save to Supabase
    const { error } = await supabase
      .from('knowledge_items')
      .upsert({
        id: item.id,
        user_id: user.id,
        document_name: item.documentName,
        document_content: item.documentContent,
        media_data_uri: item.mediaDataUri,
        summary: item.summary,
        created_at: item.createdAt,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error("Error saving knowledge base item to Supabase", error);
      // Fall back to localStorage
      addLocalKnowledgeBaseItem(item);
    }
  } else {
    // User is not authenticated, use localStorage
    addLocalKnowledgeBaseItem(item);
  }
};

// Add or update an item in localStorage only
const addLocalKnowledgeBaseItem = (item: KnowledgeBaseItem): void => {
  if (typeof window === 'undefined') return;
  const items = getLocalKnowledgeBaseItems();
  // Check for existing item to update, otherwise add new
  const existingIndex = items.findIndex(i => i.id === item.id);
  if (existingIndex > -1) {
    items[existingIndex] = { ...items[existingIndex], ...item, updatedAt: new Date().toISOString() };
  } else {
    items.unshift({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); // Add to the beginning
  }
  localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(items.slice(0, 100))); // Limit to 100 items
};

// Get an item by ID
export const getKnowledgeBaseItemById = async (id: string): Promise<KnowledgeBaseItem | null> => {
  if (typeof window === 'undefined') return null;
  
  // Try to get user from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, get item from Supabase
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
      
    if (error) {
      console.error("Error fetching knowledge base item from Supabase", error);
      // Fall back to localStorage
      return getLocalKnowledgeBaseItemById(id);
    }
    
    // Transform Supabase data to match KnowledgeBaseItem interface
    return {
      id: data.id,
      documentName: data.document_name,
      documentContent: data.document_content,
      mediaDataUri: data.media_data_uri,
      summary: data.summary,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } else {
    // User is not authenticated, use localStorage
    return getLocalKnowledgeBaseItemById(id);
  }
};

// Get an item by ID from localStorage only
const getLocalKnowledgeBaseItemById = (id: string): KnowledgeBaseItem | null => {
  if (typeof window === 'undefined') return null;
  const items = getLocalKnowledgeBaseItems();
  return items.find(item => item.id === id) || null;
};

// Delete an item
export const deleteKnowledgeBaseItem = async (id: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Try to get user from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, delete from Supabase
    const { error } = await supabase
      .from('knowledge_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error("Error deleting knowledge base item from Supabase", error);
      // Fall back to localStorage
      deleteLocalKnowledgeBaseItem(id);
    }
  } else {
    // User is not authenticated, use localStorage
    deleteLocalKnowledgeBaseItem(id);
  }
};

// Delete an item from localStorage only
const deleteLocalKnowledgeBaseItem = (id: string): void => {
  if (typeof window === 'undefined') return;
  let items = getLocalKnowledgeBaseItems();
  items = items.filter(item => item.id !== id);
  localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(items));
};