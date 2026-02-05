import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
 import { checkRateLimit, sanitizeEmail } from "@/lib/security";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
   isRateLimited: boolean;
   rateLimitRemainingTime: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
   const [isRateLimited, setIsRateLimited] = useState(false);
   const [rateLimitRemainingTime, setRateLimitRemainingTime] = useState(0);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
     // Rate limit: 5 signup attempts per 5 minutes
     const rateLimitResult = checkRateLimit("auth_signup", 5, 5 * 60 * 1000);
     if (!rateLimitResult.allowed) {
       setIsRateLimited(true);
       setRateLimitRemainingTime(rateLimitResult.remainingTime);
       return { error: new Error(`Too many signup attempts. Please wait ${rateLimitResult.remainingTime} seconds.`) };
     }
 
     // Validate and sanitize email
     const sanitizedEmail = sanitizeEmail(email);
     if (!sanitizedEmail) {
       return { error: new Error("Please enter a valid email address.") };
     }
 
     // Validate password strength
     if (password.length < 8) {
       return { error: new Error("Password must be at least 8 characters long.") };
     }
 
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
       email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
     // Rate limit: 5 login attempts per minute
     const rateLimitResult = checkRateLimit("auth_signin", 5, 60 * 1000);
     if (!rateLimitResult.allowed) {
       setIsRateLimited(true);
       setRateLimitRemainingTime(rateLimitResult.remainingTime);
       return { error: new Error(`Too many login attempts. Please wait ${rateLimitResult.remainingTime} seconds.`) };
     }
 
     // Validate and sanitize email
     const sanitizedEmail = sanitizeEmail(email);
     if (!sanitizedEmail) {
       return { error: new Error("Please enter a valid email address.") };
     }
 
    const { error } = await supabase.auth.signInWithPassword({
       email: sanitizedEmail,
      password,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
     <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, isRateLimited, rateLimitRemainingTime }}>
      {children}
    </AuthContext.Provider>
  );
};