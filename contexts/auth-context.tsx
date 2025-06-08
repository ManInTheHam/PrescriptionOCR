"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(isSupabaseConfigured())
  const router = useRouter()

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()

      // Get initial session
      const getSession = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          setUser(session?.user ?? null)
        } catch (error) {
          console.error("Error getting session:", error)
          setUser(null)
        } finally {
          setLoading(false)
        }
      }

      getSession()

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle profile creation after successful signup
        if (event === "SIGNED_UP" && session?.user) {
          await createUserProfile(session.user)
        }
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      console.error("Error initializing auth:", error)
      setLoading(false)
    }
  }, [isConfigured])

  const createUserProfile = async (user: User) => {
    try {
      const supabase = getSupabaseClient()

      // Check if profile already exists
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).single()

      if (!existingProfile) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Error creating profile:", profileError)
        }
      }
    } catch (error) {
      console.error("Profile creation error:", error)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: "Supabase is not configured" }
    }

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: "Failed to sign in" }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isConfigured) {
      return { error: "Supabase is not configured" }
    }

    try {
      const supabase = getSupabaseClient()

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { error: error.message }
      }

      // The profile creation will be handled by the auth state change listener
      // or we can create it immediately if the user is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        // If email confirmation is required, let the user know
        return {
          error: "Please check your email and click the confirmation link to complete signup.",
        }
      }

      return {}
    } catch (error) {
      console.error("Signup error:", error)
      return { error: "Failed to sign up" }
    }
  }

  const signOut = async () => {
    if (!isConfigured) return

    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setUser(null) // Explicitly clear user state
      router.push("/") // Redirect to home page
    } catch (error) {
      console.error("Error signing out:", error)
      // Even if there's an error, clear the user state
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
