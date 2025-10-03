import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  loading: boolean;
  profileStatus: string;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileStatus, setProfileStatus] = React.useState<string>('active');

  React.useEffect(() => {
    let mounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Fetch profile status after auth state changes
          if (session?.user) {
            setTimeout(() => {
              supabase
                .from('profiles')
                .select('status')
                .eq('user_id', session.user.id)
                .single()
                .then(({ data }) => {
                  if (data && mounted) {
                    setProfileStatus(data.status || 'active');
                  }
                });
            }, 0);
          } else {
            setProfileStatus('active');
          }
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch profile status for existing session
        if (session?.user) {
          setTimeout(() => {
            supabase
              .from('profiles')
              .select('status')
              .eq('user_id', session.user.id)
              .single()
              .then(({ data }) => {
                if (data && mounted) {
                  setProfileStatus(data.status || 'active');
                }
              });
          }, 0);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = React.useCallback(async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name || email.split('@')[0],
          display_name: name || email.split('@')[0]
        }
      }
    });
    return { error };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Auto-reactivate if account is inactive
    if (!error && data.user) {
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('user_id', data.user.id)
          .single();
        
        if (profile?.status === 'inactive') {
          await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('user_id', data.user.id);
        }
      }, 0);
    }
    
    return { error };
  }, []);

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const value = React.useMemo(() => ({
    user,
    session,
    signUp,
    signIn,
    signOut,
    loading,
    profileStatus
  }), [user, session, signUp, signIn, signOut, loading, profileStatus]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}