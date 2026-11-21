'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

// Standard university test accounts for development preview
const DEMO_USERS: Record<string, { profile: Profile; role: UserRole }> = {
  'faculty@university.edu': {
    role: 'faculty',
    profile: {
      id: 'demo-faculty-001',
      employee_id: 'FAC-2026-042',
      name: 'Dr. Rajesh Sharma',
      email: 'faculty@university.edu',
      department_id: 'dept-cse',
      designation: 'Associate Professor',
      role: 'faculty',
      created_at: new Date().toISOString(),
    },
  },
  'hod@university.edu': {
    role: 'hod',
    profile: {
      id: 'demo-hod-001',
      employee_id: 'HOD-CSE-001',
      name: 'Prof. Ananya Sen',
      email: 'hod@university.edu',
      department_id: 'dept-cse',
      designation: 'Head of Department (CSE)',
      role: 'hod',
      created_at: new Date().toISOString(),
    },
  },
  'admin@university.edu': {
    role: 'admin',
    profile: {
      id: 'demo-admin-001',
      employee_id: 'ADM-2026-001',
      name: 'Dr. Vikramaditya Rao',
      email: 'admin@university.edu',
      department_id: null,
      designation: 'Dean of Academic Affairs',
      role: 'admin',
      created_at: new Date().toISOString(),
    },
  },
};

const DEMO_SESSION_KEY = 'university_portal_demo_user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isLiveSupabase: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; role: UserRole | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null; success: boolean }>;
  updateUserPassword: (newPassword: string) => Promise<{ error: Error | null; success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLiveSupabase = isSupabaseConfigured();

  // Helper to fetch user profile from Supabase database
  const fetchUserProfile = useCallback(async (userId: string, userEmail?: string): Promise<Profile | null> => {
    if (!isLiveSupabase) return null;

    try {
      // 1. Try querying by User ID (standard UUID link to auth.users)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as Profile;
      }

      // 2. Fallback: Query by email if ID lookup returned empty
      if (userEmail) {
        const { data: dataByEmail, error: errByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .single();

        if (!errByEmail && dataByEmail) {
          return dataByEmail as Profile;
        }
      }

      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }, [isLiveSupabase]);

  // Initialize session and auth state listener
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (isLiveSupabase) {
          // Live Supabase Auth
          const { data: { session: initialSession } } = await supabase.auth.getSession();

          if (!isMounted) return;

          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            const userProfile = await fetchUserProfile(initialSession.user.id, initialSession.user.email);
            if (isMounted) {
              if (userProfile) {
                setProfile(userProfile);
              } else if (initialSession.user.user_metadata?.role) {
                // Fallback to user_metadata if profile row hasn't synced yet
                const metaRole = initialSession.user.user_metadata.role as UserRole;
                setProfile({
                  id: initialSession.user.id,
                  employee_id: (initialSession.user.user_metadata.employee_id as string) || `EMP-${initialSession.user.id.substring(0, 6)}`,
                  name: (initialSession.user.user_metadata.name as string) || initialSession.user.email?.split('@')[0] || 'Academic Staff',
                  email: initialSession.user.email || '',
                  department_id: null,
                  designation: initialSession.user.user_metadata.designation || (metaRole === 'hod' ? 'Head of Department' : metaRole === 'admin' ? 'System Administrator' : 'Assistant Professor'),
                  role: metaRole,
                  created_at: new Date().toISOString(),
                });
              }
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        } else {
          // Demo / Offline Mode: Check localStorage for existing demo session
          if (typeof window !== 'undefined') {
            const savedEmail = localStorage.getItem(DEMO_SESSION_KEY);
            if (savedEmail && DEMO_USERS[savedEmail]) {
              const demo = DEMO_USERS[savedEmail];
              setUser({
                id: demo.profile.id,
                email: demo.profile.email,
                app_metadata: {},
                user_metadata: { role: demo.role, name: demo.profile.name },
                aud: 'authenticated',
                created_at: demo.profile.created_at,
              } as User);
              setProfile(demo.profile);
            }
          }
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // Attach listener if using live Supabase
    if (isLiveSupabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (!isMounted) return;

          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            const userProfile = await fetchUserProfile(currentSession.user.id, currentSession.user.email);
            if (isMounted) {
              if (userProfile) {
                setProfile(userProfile);
              } else if (currentSession.user.user_metadata?.role) {
                const metaRole = currentSession.user.user_metadata.role as UserRole;
                setProfile({
                  id: currentSession.user.id,
                  employee_id: (currentSession.user.user_metadata.employee_id as string) || `EMP-${currentSession.user.id.substring(0, 6)}`,
                  name: (currentSession.user.user_metadata.name as string) || currentSession.user.email?.split('@')[0] || 'Academic Staff',
                  email: currentSession.user.email || '',
                  department_id: null,
                  designation: currentSession.user.user_metadata.designation || (metaRole === 'hod' ? 'Head of Department' : metaRole === 'admin' ? 'System Administrator' : 'Assistant Professor'),
                  role: metaRole,
                  created_at: new Date().toISOString(),
                });
              }
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      return () => {
        isMounted = false;
      };
    }
  }, [isLiveSupabase, fetchUserProfile]);

  // Sign in with Email and Password
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | Error | null; role: UserRole | null }> => {
    const trimmedEmail = email.trim().toLowerCase();

    // Live Supabase Authentication Flow
    if (isLiveSupabase) {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setLoading(false);
          return { error, role: null };
        }

        if (data.user) {
          setUser(data.user);
          setSession(data.session);

          // Find corresponding profile
          const userProfile = await fetchUserProfile(data.user.id, data.user.email);

          if (userProfile) {
            setProfile(userProfile);
            setLoading(false);
            return { error: null, role: userProfile.role };
          }

          // Fallback: Check user_metadata if trigger hasn't finished
          if (data.user.user_metadata?.role) {
            const metaRole = data.user.user_metadata.role as UserRole;
            const fallbackProfile: Profile = {
              id: data.user.id,
              employee_id: (data.user.user_metadata.employee_id as string) || `EMP-${data.user.id.substring(0, 6)}`,
              name: (data.user.user_metadata.name as string) || data.user.email?.split('@')[0] || 'Academic Staff',
              email: data.user.email || '',
              department_id: null,
              designation: data.user.user_metadata.designation || (metaRole === 'hod' ? 'Head of Department' : metaRole === 'admin' ? 'System Administrator' : 'Assistant Professor'),
              role: metaRole,
              created_at: new Date().toISOString(),
            };
            setProfile(fallbackProfile);
            setLoading(false);
            return { error: null, role: metaRole };
          }

          setLoading(false);
          return {
            error: new Error('User profile record not found in university database (public.profiles). Please ensure the trigger or profile row exists in Supabase.'),
            role: null,
          };
        }

        setLoading(false);
        return { error: new Error('Authentication failed: No user returned.'), role: null };
      } catch (err) {
        setLoading(false);
        const message = err instanceof Error ? err.message : 'Authentication network error';
        return {
          error: new Error(`Supabase Auth error: ${message}. If your Supabase credentials are placeholder values, please update .env.local.`),
          role: null,
        };
      }
    }

    // Offline / Demo Mode Flow (When placeholder credentials exist in .env.local)
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate brief authentication roundtrip

    const demoUser = DEMO_USERS[trimmedEmail];

    if (!demoUser) {
      setLoading(false);
      return {
        error: new Error('Invalid institutional email or password. Use test accounts: faculty@university.edu, hod@university.edu, or admin@university.edu (password: any).'),
        role: null,
      };
    }

    if (!password || password.trim().length === 0) {
      setLoading(false);
      return {
        error: new Error('Please enter a password to sign in.'),
        role: null,
      };
    }

    // Set demo session
    const mockUser = {
      id: demoUser.profile.id,
      email: demoUser.profile.email,
      app_metadata: {},
      user_metadata: { role: demoUser.role, name: demoUser.profile.name },
      aud: 'authenticated',
      created_at: demoUser.profile.created_at,
    } as User;

    setUser(mockUser);
    setProfile(demoUser.profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_SESSION_KEY, trimmedEmail);
    }

    setLoading(false);
    return { error: null, role: demoUser.role };
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      if (isLiveSupabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  };

  // Refresh profile manually
  const refreshProfile = async () => {
    if (user && isLiveSupabase) {
      const userProfile = await fetchUserProfile(user.id, user.email);
      if (userProfile) setProfile(userProfile);
    }
  };

  // Send password recovery email via Supabase
  const resetPasswordForEmail = async (emailToReset: string): Promise<{ error: Error | null; success: boolean }> => {
    const trimmed = emailToReset.trim().toLowerCase();
    if (!trimmed) {
      return { error: new Error('Please enter your registered institutional email address.'), success: false };
    }

    if (isLiveSupabase) {
      try {
        const redirectTo = typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
          redirectTo,
        });

        if (error) {
          return { error: new Error(error.message), success: false };
        }
        return { error: null, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send password reset request';
        return { error: new Error(msg), success: false };
      }
    }

    // Demo mode simulation
    await new Promise((r) => setTimeout(r, 500));
    return { error: null, success: true };
  };

  // Update authenticated user password
  const updateUserPassword = async (newPassword: string): Promise<{ error: Error | null; success: boolean }> => {
    if (!newPassword || newPassword.length < 6) {
      return { error: new Error('Password must be at least 6 characters long.'), success: false };
    }

    if (isLiveSupabase) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          return { error: new Error(error.message), success: false };
        }
        return { error: null, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update password';
        return { error: new Error(msg), success: false };
      }
    }

    // Demo mode simulation
    await new Promise((r) => setTimeout(r, 400));
    return { error: null, success: true };
  };

  const role = profile?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isLiveSupabase,
        signIn,
        signOut,
        refreshProfile,
        resetPasswordForEmail,
        updateUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
