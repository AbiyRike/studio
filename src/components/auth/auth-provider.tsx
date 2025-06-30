"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (provider: 'google') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const setData = async () => {
      try {
        // Try to get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Check localStorage for backward compatibility
          checkLocalStorage();
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // For backward compatibility, set localStorage isLoggedIn flag
        if (session?.user) {
          localStorage.setItem('isLoggedIn', 'true');
          
          // Set user data in localStorage for backward compatibility
          if (session.user.user_metadata?.name) {
            localStorage.setItem('userName', session.user.user_metadata.name);
          }
          if (session.user.email) {
            localStorage.setItem('userEmail', session.user.email);
          }
        } else {
          // Check localStorage for backward compatibility
          checkLocalStorage();
        }
      } catch (error) {
        console.error('Error in auth setup:', error);
        // Check localStorage for backward compatibility
        checkLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };

    const checkLocalStorage = () => {
      // For backward compatibility, check if user is logged in via localStorage
      if (typeof window !== 'undefined' && localStorage.getItem('isLoggedIn')) {
        // Create a mock user from localStorage data
        const mockUser = {
          id: 'local-user',
          email: localStorage.getItem('userEmail') || 'user@example.com',
          user_metadata: {
            name: localStorage.getItem('userName') || 'Local User',
            avatar_url: localStorage.getItem('userProfilePic') || null,
          }
        } as User;
        
        setUser(mockUser);
      } else {
        setUser(null);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // For backward compatibility, set localStorage isLoggedIn flag
      if (session?.user) {
        localStorage.setItem('isLoggedIn', 'true');
        
        // Set user data in localStorage for backward compatibility
        if (session.user.user_metadata?.name) {
          localStorage.setItem('userName', session.user.user_metadata.name);
        }
        if (session.user.email) {
          localStorage.setItem('userEmail', session.user.email);
        }
      } else {
        // Only remove if we're sure there's no session
        // localStorage.removeItem('isLoggedIn');
      }
    });

    setData();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (provider: 'google') => {
    setIsLoading(true);
    try {
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Fallback to localStorage for development/testing
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', 'Test User');
        localStorage.setItem('userEmail', 'test@example.com');
        
        // Create a mock user
        const mockUser = {
          id: 'local-user',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
          }
        } as User;
        
        setUser(mockUser);
        setIsLoading(false);
        router.push('/dashboard');
        return;
      }
      
      // Use Supabase OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Try to sign out from Supabase
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        await supabase.auth.signOut();
      }
      
      // Clear localStorage for backward compatibility
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userDepartment');
      localStorage.removeItem('userInstitution');
      localStorage.removeItem('userBirthday');
      localStorage.removeItem('userProfilePic');
      
      // Clear session data
      localStorage.removeItem('activeTutorSession');
      localStorage.removeItem('activeFlashcardSession');
      localStorage.removeItem('activeDynamicTutorSession');
      localStorage.removeItem('activeAskMrKnowSession');
      localStorage.removeItem('activeCodeTeachingSession');
      localStorage.removeItem('activeCodeWizSession');
      
      // Reset state
      setUser(null);
      setSession(null);
      
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}