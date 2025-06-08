"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { PrescriptionUploader } from "@/components/ocr/prescription-uploader"

export default function UploadPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Prescription</h1>
          <p className="text-gray-600 mt-2">
            Upload an image of your prescription to extract and store medication information
          </p>
        </div>

        <PrescriptionUploader />
      </div>
    </MainLayout>
  )
}
