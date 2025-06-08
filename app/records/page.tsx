"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseClient } from "@/lib/supabase"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Filter, Eye, Trash2, Calendar } from "lucide-react"

interface Prescription {
  id: string
  title: string
  extracted_text: string
  doctor_name: string | null
  prescription_date: string | null
  status: string
  created_at: string
  medications: any[]
}

interface GroupedPrescriptions {
  [key: string]: Prescription[]
}

export default function RecordsPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([])
  const [groupedPrescriptions, setGroupedPrescriptions] = useState<GroupedPrescriptions>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (user) {
      fetchPrescriptions()
    }
  }, [user])

  useEffect(() => {
    filterPrescriptions()
  }, [prescriptions, searchTerm, statusFilter])

  useEffect(() => {
    groupPrescriptionsByDate()
  }, [filteredPrescriptions])

  const fetchPrescriptions = async () => {
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setPrescriptions(data || [])
    } catch (error) {
      console.error("Error fetching prescriptions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterPrescriptions = () => {
    let filtered = prescriptions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (prescription) =>
          prescription.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prescription.extracted_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (prescription.doctor_name && prescription.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((prescription) => prescription.status === statusFilter)
    }

    setFilteredPrescriptions(filtered)
  }

  const groupPrescriptionsByDate = () => {
    const grouped: GroupedPrescriptions = {}

    filteredPrescriptions.forEach((prescription) => {
      const date = new Date(prescription.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const thisWeek = new Date(today)
      thisWeek.setDate(thisWeek.getDate() - 7)
      const thisMonth = new Date(today)
      thisMonth.setMonth(thisMonth.getMonth() - 1)

      let groupKey: string

      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday"
      } else if (date >= thisWeek) {
        groupKey = "This Week"
      } else if (date >= thisMonth) {
        groupKey = "This Month"
      } else {
        const monthYear = date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
        groupKey = monthYear
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = []
      }
      grouped[groupKey].push(prescription)
    })

    // Sort groups by most recent first
    const sortedGrouped: GroupedPrescriptions = {}
    const groupOrder = ["Today", "Yesterday", "This Week", "This Month"]

    // Add predefined groups first
    groupOrder.forEach((group) => {
      if (grouped[group]) {
        sortedGrouped[group] = grouped[group]
      }
    })

    // Add month/year groups sorted by date
    Object.keys(grouped)
      .filter((key) => !groupOrder.includes(key))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((key) => {
        sortedGrouped[key] = grouped[key]
      })

    setGroupedPrescriptions(sortedGrouped)
  }

  const deletePrescription = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prescription?")) return

    const supabase = getSupabaseClient()

    try {
      const { error } = await supabase.from("prescriptions").delete().eq("id", id)

      if (error) throw error

      setPrescriptions(prescriptions.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Error deleting prescription:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prescription Records</h1>
            <p className="text-gray-600">Manage and view all your prescription records organized by date</p>
          </div>
          <Link href="/upload">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Add New Prescription
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search prescriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions List - Grouped by Date */}
        {Object.keys(groupedPrescriptions).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {prescriptions.length === 0 ? "No prescriptions found" : "No prescriptions match your filters"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {prescriptions.length === 0
                  ? "Get started by uploading your first prescription."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {prescriptions.length === 0 && (
                <div className="mt-6">
                  <Link href="/upload">
                    <Button>
                      <FileText className="mr-2 h-4 w-4" />
                      Upload Prescription
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedPrescriptions).map(([dateGroup, groupPrescriptions]) => (
              <div key={dateGroup} className="space-y-4">
                {/* Date Group Header */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">{dateGroup}</h2>
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="text-sm text-gray-500">{groupPrescriptions.length} prescriptions</span>
                </div>

                {/* Prescriptions in this group */}
                <div className="grid gap-4">
                  {groupPrescriptions.map((prescription) => (
                    <Card key={prescription.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{prescription.title}</CardTitle>
                            <CardDescription className="mt-1">
                              <div className="flex items-center space-x-4 text-sm">
                                {prescription.doctor_name && <span>Dr. {prescription.doctor_name}</span>}
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {formatDate(prescription.created_at)} at {formatTime(prescription.created_at)}
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(prescription.status)}>{prescription.status}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Medications */}
                          {prescription.medications && prescription.medications.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Medications:</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {prescription.medications.slice(0, 4).map((med: any, index: number) => (
                                  <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                                    <span className="font-medium">{med.name}</span>
                                    {med.dosage && <span className="text-gray-600"> - {med.dosage}</span>}
                                  </div>
                                ))}
                                {prescription.medications.length > 4 && (
                                  <div className="text-sm text-gray-500 p-2">
                                    +{prescription.medications.length - 4} more medications
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Extracted text preview */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Extracted Text:</h4>
                            <p className="text-sm text-gray-600 line-clamp-3">{prescription.extracted_text}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-xs text-gray-500">Uploaded {formatDate(prescription.created_at)}</div>
                            <div className="flex space-x-2">
                              <Link href={`/records/${prescription.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="mr-1 h-3 w-3" />
                                  View Details
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deletePrescription(prescription.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
