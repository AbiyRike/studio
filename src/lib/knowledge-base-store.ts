
// Functions in this file operate on localStorage and are intended for client-side use.
// Server Actions can import utilities like generateId from here,
// but the module itself does not define server actions.

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

export const getKnowledgeBaseItems = (): KnowledgeBaseItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
  try {
    return storedData ? JSON.parse(storedData) : [];
  } catch (e) {
    console.error("Error parsing knowledge base items from localStorage", e);
    return [];
  }
};

export const addKnowledgeBaseItem = (item: KnowledgeBaseItem): void => {
  if (typeof window === 'undefined') return;
  const items = getKnowledgeBaseItems();
  // Check for existing item to update, otherwise add new
  const existingIndex = items.findIndex(i => i.id === item.id);
  if (existingIndex > -1) {
    items[existingIndex] = { ...items[existingIndex], ...item, updatedAt: new Date().toISOString() };
  } else {
    items.unshift({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); // Add to the beginning
  }
  localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(items.slice(0, 100))); // Limit to 100 items
};

export const getKnowledgeBaseItemById = (id: string): KnowledgeBaseItem | null => {
  if (typeof window === 'undefined') return null;
  const items = getKnowledgeBaseItems();
  return items.find(item => item.id === id) || null;
};

export const deleteKnowledgeBaseItem = (id: string): void => {
  if (typeof window === 'undefined') return;
  let items = getKnowledgeBaseItems();
  items = items.filter(item => item.id !== id);
  localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(items));
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
