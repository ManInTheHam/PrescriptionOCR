"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Pill, FileText, Upload, Shield, Zap, Users, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading, isConfigured } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && isConfigured) {
      router.push("/dashboard")
    }
  }, [user, loading, router, isConfigured])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user && isConfigured) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Configuration Warning */}
      {!isConfigured && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Configuration Required:</strong> Please set up your Supabase environment variables to enable
                authentication and data storage.
                <br />
                <span className="text-sm">
                  Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY
                </span>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Pill className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">PrescriptionOCR</span>
            </Link>
            <div className="flex space-x-4">
              {isConfigured ? (
                <>
                  <Link href="/auth/signin">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>Get Started</Button>
                  </Link>
                </>
              ) : (
                <Button disabled>Setup Required</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">AI-Powered Prescription Management</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload prescription images and let our AI extract medication information, dosages, and instructions
            automatically. Keep all your prescriptions organized in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isConfigured ? (
              <>
                <Link href="/auth/signup">
                  <Button size="lg" className="px-8 py-3">
                    <Upload className="mr-2 h-5 w-5" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button variant="outline" size="lg" className="px-8 py-3">
                    Sign In
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center">
                <Button disabled size="lg" className="px-8 py-3 mb-2">
                  Setup Required
                </Button>
                <p className="text-sm text-gray-500">Configure environment variables to get started</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to manage prescriptions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform makes it easy to digitize, organize, and track your prescription medications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>AI Text Extraction</CardTitle>
                <CardDescription>
                  Advanced AI technology extracts medication names, dosages, and instructions from prescription images
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Organized Records</CardTitle>
                <CardDescription>
                  Keep all your prescriptions organized with searchable records and medication tracking
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Your medical information is encrypted and stored securely with enterprise-grade security
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Setup Instructions */}
      {!isConfigured && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Quick Setup Guide</CardTitle>
                <CardDescription className="text-center">
                  Follow these steps to configure your environment
                </CardDescription>
              </CardHeader>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Create Supabase Project</h4>
                      <p className="text-sm text-gray-600">
                        Go to{" "}
                        <a href="https://supabase.com" className="text-blue-600 hover:underline">
                          supabase.com
                        </a>{" "}
                        and create a new project
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Get Gemini API Key</h4>
                      <p className="text-sm text-gray-600">
                        Visit{" "}
                        <a href="https://makersuite.google.com/app/apikey" className="text-blue-600 hover:underline">
                          Google AI Studio
                        </a>{" "}
                        to get your Gemini API key
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Set Environment Variables</h4>
                      <p className="text-sm text-gray-600">
                        Add your keys to the environment variables in your deployment platform
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust PrescriptionOCR to manage their medication records.
          </p>
          {isConfigured ? (
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="px-8 py-3">
                <Users className="mr-2 h-5 w-5" />
                Create Free Account
              </Button>
            </Link>
          ) : (
            <Button disabled size="lg" variant="secondary" className="px-8 py-3">
              Complete Setup First
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Pill className="h-6 w-6 text-blue-400" />
            <span className="ml-2 text-lg font-semibold">PrescriptionOCR</span>
          </div>
          <p className="text-center text-gray-400 mt-4">© 2024 PrescriptionOCR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
