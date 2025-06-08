"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ExtractedData {
  text: string
  medications?: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
  }>
  doctorName?: string
  prescriptionDate?: string
}

export function PrescriptionUploader() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError("")
    setSuccess(false)
    setExtractedData(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)

    // Set default title
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const extractTextWithGemini = async (imageBase64: string): Promise<ExtractedData> => {
    const response = await fetch("/api/extract-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageBase64 }),
    })

    if (!response.ok) {
      throw new Error("Failed to extract text")
    }

    return response.json()
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(",")[1]) // Remove data:image/jpeg;base64, prefix
      }
      reader.onerror = reject
    })
  }

  const handleExtract = async () => {
    if (!file || !user) return

    setLoading(true)
    setProgress(0)
    setError("")

    try {
      // Convert image to base64
      setProgress(20)
      const imageBase64 = await convertToBase64(file)

      // Extract text with Gemini
      setProgress(60)
      const extracted = await extractTextWithGemini(imageBase64)
      setExtractedData(extracted)

      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text")
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const handleSave = async () => {
    if (!extractedData || !user || !title.trim()) return

    setLoading(true)
    setError("")

    try {
      const supabase = getSupabaseClient()

      // First, let's try to save without image upload to isolate the issue
      let imageUrl = null

      // Only try to upload image if we have one
      if (file) {
        try {
          const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

          // Check if bucket exists, if not we'll skip image upload for now
          const { data: buckets } = await supabase.storage.listBuckets()
          const bucketExists = buckets?.some((bucket) => bucket.name === "prescription-images")

          if (bucketExists) {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("prescription-images")
              .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false,
              })

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage.from("prescription-images").getPublicUrl(fileName)
              imageUrl = urlData.publicUrl
            } else {
              console.warn("Image upload failed:", uploadError)
            }
          } else {
            console.warn("Storage bucket 'prescription-images' not found, skipping image upload")
          }
        } catch (uploadErr) {
          console.warn("Image upload error:", uploadErr)
          // Continue without image - don't fail the entire save
        }
      }

      // Save prescription to database
      const prescriptionData = {
        user_id: user.id,
        title: title.trim(),
        extracted_text: extractedData.text,
        original_filename: file?.name || null,
        image_url: imageUrl,
        medications: extractedData.medications || [],
        doctor_name: extractedData.doctorName || null,
        prescription_date: extractedData.prescriptionDate || null,
        status: "active",
      }

      console.log("Saving prescription data:", prescriptionData)

      const { data: prescription, error: prescriptionError } = await supabase
        .from("prescriptions")
        .insert(prescriptionData)
        .select()
        .single()

      if (prescriptionError) {
        console.error("Prescription save error:", prescriptionError)
        throw new Error(`Database error: ${prescriptionError.message}`)
      }

      console.log("Prescription saved successfully:", prescription)

      // Save individual medications if we have any
      if (extractedData.medications && extractedData.medications.length > 0) {
        const medicationsToInsert = extractedData.medications
          .filter((med) => med.name && med.name.trim()) // Only insert medications with names
          .map((med) => ({
            prescription_id: prescription.id,
            name: med.name.trim(),
            dosage: med.dosage || null,
            frequency: med.frequency || null,
            duration: med.duration || null,
            instructions: med.instructions || null,
          }))

        if (medicationsToInsert.length > 0) {
          const { error: medicationsError } = await supabase.from("medications").insert(medicationsToInsert)

          if (medicationsError) {
            console.error("Error saving medications:", medicationsError)
            // Don't fail the entire operation for medication save errors
          }
        }
      }

      setSuccess(true)
      // Reset form after a delay
      setTimeout(() => {
        setFile(null)
        setPreview(null)
        setExtractedData(null)
        setTitle("")
        setSuccess(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }, 2000)
    } catch (err) {
      console.error("Save error:", err)
      setError(err instanceof Error ? err.message : "Failed to save prescription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Prescription Image</CardTitle>
          <CardDescription>
            Upload an image of your prescription to extract text and medication information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) handleFileSelect(selectedFile)
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setExtractedData(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                >
                  Remove
                </Button>
              </div>

              {preview && (
                <div className="mt-4">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Prescription preview"
                    className="max-w-full h-auto max-h-64 rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extract Text */}
      {file && !extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Extract Text</CardTitle>
            <CardDescription>Use AI to extract text and medication information from your prescription</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">Extracting text with AI...</p>
              </div>
            )}

            {!loading && (
              <Button onClick={handleExtract} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Extract Text with AI
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Data */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Information</CardTitle>
            <CardDescription>Review and edit the extracted information before saving</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Prescription Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this prescription"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extractedText">Extracted Text</Label>
              <Textarea
                id="extractedText"
                value={extractedData.text}
                onChange={(e) =>
                  setExtractedData({
                    ...extractedData,
                    text: e.target.value,
                  })
                }
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {extractedData.medications && extractedData.medications.length > 0 && (
              <div className="space-y-2">
                <Label>Detected Medications</Label>
                <div className="space-y-2">
                  {extractedData.medications.map((med, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gray-50">
                      <p className="font-medium">{med.name}</p>
                      {med.dosage && <p className="text-sm text-gray-600">Dosage: {med.dosage}</p>}
                      {med.frequency && <p className="text-sm text-gray-600">Frequency: {med.frequency}</p>}
                      {med.duration && <p className="text-sm text-gray-600">Duration: {med.duration}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <Button onClick={handleSave} disabled={loading || !title.trim()} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Prescription
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Prescription saved successfully! You can view it in your records.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
