"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseClient } from "@/lib/supabase"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Calendar, User, Pill, FileText, Trash2, Download, AlertCircle } from "lucide-react"
import Link from "next/link"

interface Prescription {
  id: string
  title: string
  extracted_text: string
  original_filename: string | null
  image_url: string | null
  doctor_name: string | null
  prescription_date: string | null
  status: string
  created_at: string
  updated_at: string
}

interface Medication {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
}

export default function PrescriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user && params.id) {
      fetchPrescriptionDetails()
    }
  }, [user, params.id])

  const fetchPrescriptionDetails = async () => {
    const supabase = getSupabaseClient()

    try {
      // Fetch prescription details
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user?.id)
        .single()

      if (prescriptionError) throw prescriptionError
      setPrescription(prescriptionData)

      // Fetch medications
      const { data: medicationsData, error: medicationsError } = await supabase
        .from("medications")
        .select("*")
        .eq("prescription_id", params.id)

      if (medicationsError) throw medicationsError
      setMedications(medicationsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prescription")
    } finally {
      setLoading(false)
    }
  }

  const deletePrescription = async () => {
    if (!prescription || !confirm("Are you sure you want to delete this prescription?")) return

    const supabase = getSupabaseClient()

    try {
      const { error } = await supabase.from("prescriptions").delete().eq("id", prescription.id)

      if (error) throw error

      router.push("/records")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete prescription")
    }
  }

  const updateStatus = async (newStatus: string) => {
    if (!prescription) return

    const supabase = getSupabaseClient()

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", prescription.id)

      if (error) throw error

      setPrescription({ ...prescription, status: newStatus })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const downloadText = () => {
    if (!prescription) return

    const content = `Prescription: ${prescription.title}
Doctor: ${prescription.doctor_name || "Not specified"}
Date: ${prescription.prescription_date || "Not specified"}
Status: ${prescription.status}

Medications:
${medications
  .map(
    (med) => `
- ${med.name}
  Dosage: ${med.dosage || "Not specified"}
  Frequency: ${med.frequency || "Not specified"}
  Duration: ${med.duration || "Not specified"}
  Instructions: ${med.instructions || "Not specified"}
`,
  )
  .join("")}

Extracted Text:
${prescription.extracted_text}

Generated on: ${new Date().toLocaleString()}
`

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${prescription.title.replace(/[^a-z0-9]/gi, "_")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (error || !prescription) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Prescription not found"}</AlertDescription>
          </Alert>
          <div className="mt-6">
            <Link href="/records">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Records
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/records">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Records
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{prescription.title}</h1>
              <p className="text-gray-600">Prescription Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(prescription.status)}>{prescription.status}</Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Prescription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Prescription Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium">Doctor:</span>
                  <span className="ml-2">{prescription.doctor_name || "Not specified"}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium">Prescription Date:</span>
                  <span className="ml-2">
                    {prescription.prescription_date
                      ? new Date(prescription.prescription_date).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <FileText className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium">Original File:</span>
                  <span className="ml-2">{prescription.original_filename || "Not available"}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium">Uploaded:</span>
                  <span className="ml-2">{formatDate(prescription.created_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medications */}
        {medications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="mr-2 h-5 w-5" />
                Medications ({medications.length})
              </CardTitle>
              <CardDescription>Extracted medication information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {medications.map((medication, index) => (
                  <div key={medication.id}>
                    {index > 0 && <Separator />}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">{medication.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Dosage:</span>
                          <span className="ml-2">{medication.dosage || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Frequency:</span>
                          <span className="ml-2">{medication.frequency || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Duration:</span>
                          <span className="ml-2">{medication.duration || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Instructions:</span>
                          <span className="ml-2">{medication.instructions || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extracted Text */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Text</CardTitle>
            <CardDescription>Complete text extracted from the prescription image</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">{prescription.extracted_text}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Image Preview */}
        {prescription.image_url && (
          <Card>
            <CardHeader>
              <CardTitle>Original Image</CardTitle>
              <CardDescription>The uploaded prescription image</CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src={prescription.image_url || "/placeholder.svg"}
                alt="Prescription"
                className="max-w-full h-auto rounded-lg border"
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage this prescription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Status Updates */}
              <div className="flex space-x-2">
                <Button
                  variant={prescription.status === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateStatus("active")}
                >
                  Mark Active
                </Button>
                <Button
                  variant={prescription.status === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateStatus("completed")}
                >
                  Mark Completed
                </Button>
                <Button
                  variant={prescription.status === "expired" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateStatus("expired")}
                >
                  Mark Expired
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* Other Actions */}
              <Button variant="outline" size="sm" onClick={downloadText}>
                <Download className="mr-2 h-4 w-4" />
                Download Text
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={deletePrescription}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
