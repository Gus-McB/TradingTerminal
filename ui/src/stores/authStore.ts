import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type UserRole = 'free' | 'subscribed' | 'admin';

interface AuthStore {
    user: User | null;
    session: Session | null;
    role: UserRole;
    isAuthenticated: boolean;
    isLoading: boolean;
    
    initialize: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithGithub: () => Promise<void>;
    signOut: () => Promise<void>;
    devLogin: () => void;
    hasAccess: (requiredRole: UserRole) => boolean;
}

const ROLE_HIERARCHY: UserRole[] = ['free', 'subscribed', 'admin'];

export const useAuthStore = create<AuthStore>()((set, get) => ({
    user: null,
    session: null,
    role: 'free',
    isAuthenticated: false,
    isLoading: true,

    initialize: async () => {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
            // Fetch user role from your profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
            
            set({
                user: session.user,
                session,
                role: profile?.role || 'free',
                isAuthenticated: true,
                isLoading: false,
            });
        } else {
            set({ isLoading: false });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                
                set({
                    user: session.user,
                    session,
                    role: profile?.role || 'free',
                    isAuthenticated: true,
                });
            } else {
                set({
                    user: null,
                    session: null,
                    role: 'free',
                    isAuthenticated: false,
                });
            }
        });
    },

    signInWithGoogle: async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
    },

    signInWithGithub: async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin }
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
    },

    devLogin: () => {
        set({
            user: { id: 'dev-user', email: 'dev@local' } as User,
            session: null,
            role: 'admin',
            isAuthenticated: true,
            isLoading: false,
        });
    },

    hasAccess: (requiredRole) => {
        const { role } = get();
        const userLevel = ROLE_HIERARCHY.indexOf(role);
        const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
        return userLevel >= requiredLevel;
    },
}));