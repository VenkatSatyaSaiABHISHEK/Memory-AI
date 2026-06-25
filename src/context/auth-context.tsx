"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isDemoMode: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPhoto: (photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !isFirebaseConfigured;

  useEffect(() => {
    if (!isDemoMode && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Mock mode auth state recovery
      const savedUser = localStorage.getItem("memory_ai_demo_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Failed to parse demo user", e);
        }
      }
      setLoading(false);
    }
  }, [isDemoMode]);

  const loginWithGoogle = async () => {
    setLoading(true);
    if (!isDemoMode && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          setUser({
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          });
        }
      } catch (error) {
        console.error("Firebase Login Error: ", error);
        throw error;
      } finally {
        setLoading(false);
      }
    } else {
      // Mock Login Flow with simulated delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockUser: AuthUser = {
        uid: "mock-user-123",
        email: "demo.user@memoryai.com",
        displayName: "Abhishek (Demo User)",
        photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      };
      setUser(mockUser);
      localStorage.setItem("memory_ai_demo_user", JSON.stringify(mockUser));
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    if (!isDemoMode && auth) {
      try {
        await signOut(auth);
        setUser(null);
      } catch (error) {
        console.error("Firebase Logout Error: ", error);
      } finally {
        setLoading(false);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setUser(null);
      localStorage.removeItem("memory_ai_demo_user");
      setLoading(false);
    }
  };

  const updateUserPhoto = async (photoURL: string) => {
    if (!user) return;
    if (!isDemoMode && auth?.currentUser) {
      try {
        const { updateProfile } = await import("firebase/auth");
        await updateProfile(auth.currentUser, { photoURL });
        setUser((prev) => prev ? { ...prev, photoURL } : null);
      } catch (error) {
        console.error("Firebase update user photo failure", error);
        throw error;
      }
    } else {
      const updated = { ...user, photoURL };
      setUser(updated);
      localStorage.setItem("memory_ai_demo_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        loginWithGoogle,
        logout,
        updateUserPhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
