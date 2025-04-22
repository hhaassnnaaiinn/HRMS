import { create } from 'zustand';
import { supabase } from '@/lib/config/supabase';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  setUser: (user: any) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ user: data.user, isAuthenticated: true });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }

      // Set up auth state change listener
      supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user || null;
        set({ user, isAuthenticated: !!user });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));