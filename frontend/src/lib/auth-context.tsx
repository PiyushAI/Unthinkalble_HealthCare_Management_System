"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import { useRouter } from "next/navigation";

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string; role?: UserRole }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUpPatient: (data: { email: string; password: string; name: string; phone?: string; dob?: string; gender?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  async function fetchUserProfile(userId: string, userEmail?: string, fallbackRole?: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, role, phone")
        .eq("id", userId)
        .single();

      if (!error && data) {
        const validatedRole = (data.role as UserRole) || "PATIENT";
        setProfile(data as UserProfile);
        setRole(validatedRole);
        return data as UserProfile;
      }

      // If user profile is not in DB yet, query backend /auth/sync
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const syncRes = await fetch(`${apiUrl}/auth/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          email: userEmail || "",
          name: userEmail?.split("@")[0] || "User",
          role: fallbackRole || "PATIENT",
        }),
      });

      if (syncRes.ok) {
        const synced = await syncRes.json();
        const syncedRole = (synced.role as UserRole) || "PATIENT";
        setProfile(synced as UserProfile);
        setRole(syncedRole);
        return synced as UserProfile;
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
    return null;
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email, session.user.app_metadata?.role);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id, currentSession.user.email, currentSession.user.app_metadata?.role);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithPassword(email: string, password: string) {
    try {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      let user = res.data.user;
      let session = res.data.session;
      let error = res.error;

      // If initial seeded account or first-time credential, auto-register on Supabase Auth
      if (error && (error.message.includes("Invalid login credentials") || error.message.includes("User not found") || error.message.includes("Email not confirmed"))) {
        const signUpRes = await supabase.auth.signUp({
          email: email.trim(),
          password: password || "Password123!",
          options: {
            data: {
              name: email.split("@")[0],
            },
          },
        });

        if (!signUpRes.error && signUpRes.data.user) {
          user = signUpRes.data.user;
          session = signUpRes.data.session;
          error = null;
        }
      }

      if (error) return { error: error.message };
      if (!user) return { error: "No user returned" };

      setUser(user);
      setSession(session);

      const userProf = await fetchUserProfile(user.id, user.email, user.app_metadata?.role);
      const activeRole = userProf?.role || (user.app_metadata?.role as UserRole) || "PATIENT";
      return { role: activeRole };
    } catch (err: any) {
      return { error: err.message || "Failed to sign in" };
    }
  }

  async function signInWithGoogle() {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to start Google login" };
    }
  }

  async function signUpPatient(params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    dob?: string;
    gender?: string;
  }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            name: params.name,
            role: "PATIENT",
            phone: params.phone,
          },
        },
      });

      if (error) return { error: error.message };
      if (data.user) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        await fetch(`${apiUrl}/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.user.id,
            email: params.email.trim(),
            name: params.name,
            role: "PATIENT",
            phone: params.phone,
            dob: params.dob,
            gender: params.gender,
          }),
        });
      }

      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to create account" };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/login");
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchUserProfile(user.id, user.email, user.app_metadata?.role);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signInWithPassword,
        signInWithGoogle,
        signUpPatient,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
