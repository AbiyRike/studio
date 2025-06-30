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
export const getKnowledgeBaseItems = (): KnowledgeBaseItem[] => {
  if (typeof window === 'undefined') return [];
  
  // Use localStorage for now, async version will be implemented later
  return getLocalKnowledgeBaseItems();
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
export const addKnowledgeBaseItem = (item: KnowledgeBaseItem): void => {
  if (typeof window === 'undefined') return;
  
  // Use localStorage for now, async version will be implemented later
  addLocalKnowledgeBaseItem(item);
  
  // Try to save to Supabase if user is logged in
  const saveToSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
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
      }
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      // Already saved to localStorage, so no fallback needed
    }
  };
  
  saveToSupabase();
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
export const getKnowledgeBaseItemById = (id: string): KnowledgeBaseItem | null => {
  if (typeof window === 'undefined') return null;
  
  // Use localStorage for now, async version will be implemented later
  return getLocalKnowledgeBaseItemById(id);
};

// Get an item by ID from localStorage only
const getLocalKnowledgeBaseItemById = (id: string): KnowledgeBaseItem | null => {
  if (typeof window === 'undefined') return null;
  const items = getLocalKnowledgeBaseItems();
  return items.find(item => item.id === id) || null;
};

// Delete an item
export const deleteKnowledgeBaseItem = (id: string): void => {
  if (typeof window === 'undefined') return;
  
  // Use localStorage for now, async version will be implemented later
  deleteLocalKnowledgeBaseItem(id);
  
  // Try to delete from Supabase if user is logged in
  const deleteFromSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('knowledge_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error("Error deleting from Supabase:", error);
      // Already deleted from localStorage, so no fallback needed
    }
  };
  
  deleteFromSupabase();
};

// Delete an item from localStorage only
const deleteLocalKnowledgeBaseItem = (id: string): void => {
  if (typeof window === 'undefined') return;
  let items = getLocalKnowledgeBaseItems();
  items = items.filter(item => item.id !== id);
  localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(items));
};