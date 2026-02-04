'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, FileText, MessageSquare, Plus, Clock, CheckCircle, XCircle, Receipt } from 'lucide-react'
import Link from 'next/link'

interface EmergencyRequest {
  id: string
  amount: number
  reason: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: string
  requestedAt: string
  location: string
}

export default function SocialWorkerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'SOCIAL_WORKER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/emergency')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])

        // Calculate stats
        const stats = {
          pending: data.requests.filter((r: EmergencyRequest) =>
            r.status === 'PENDING_DIRECTOR' || r.status === 'PENDING_FOUNDERS'
          ).length,
          approved: data.requests.filter((r: EmergencyRequest) =>
            r.status === 'APPROVED_BY_FOUNDERS'
          ).length,
          rejected: data.requests.filter((r: EmergencyRequest) =>
            r.status.includes('REJECTED')
          ).length,
          completed: data.requests.filter((r: EmergencyRequest) =>
            r.status === 'COMPLETED'
          ).length,
        }
        setStats(stats)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    if (status.includes('REJECTED')) return 'bg-red-100 text-red-800'
    if (status === 'COMPLETED') return 'bg-green-100 text-green-800'
    if (status === 'APPROVED_BY_FOUNDERS') return 'bg-blue-100 text-blue-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500 text-white'
      case 'HIGH': return 'bg-orange-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-white'
      default: return 'bg-green-500 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    if (status.includes('REJECTED')) return <XCircle className="h-4 w-4" />
    if (status === 'COMPLETED') return <CheckCircle className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {session?.user.name}!</h1>
          <p className="text-gray-600">Manage your emergency requests and share updates</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.approved}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.rejected}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Link href="/dashboard/social-worker/requests/new">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="default">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">New Emergency Request</span>
                <span className="text-xs opacity-90">Submit a new funding request</span>
              </Button>
            </Link>

            <Link href="/dashboard/social-worker/updates">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <FileText className="h-8 w-8" />
                <span className="font-semibold">Post Update</span>
                <span className="text-xs opacity-90">Share news and photos</span>
              </Button>
            </Link>

            <Link href="/dashboard/social-worker/expenses">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <Receipt className="h-8 w-8" />
                <span className="font-semibold">Track Expenses</span>
                <span className="text-xs opacity-90">Record allocated fund expenses</span>
              </Button>
            </Link>

            <Link href="/dashboard/social-worker/messages">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <MessageSquare className="h-8 w-8" />
                <span className="font-semibold">Messages</span>
                <span className="text-xs opacity-90">Chat with team</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Emergency Requests</CardTitle>
            <CardDescription>Your latest funding requests and their status</CardDescription>
          </div>
          <Link href="/dashboard/social-worker/requests">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No emergency requests yet</p>
              <p className="text-sm text-gray-500 mt-1">Submit your first request to get started</p>
              <Link href="/dashboard/social-worker/requests/new">
                <Button className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 5).map((request) => (
                <Link key={request.id} href={`/dashboard/social-worker/requests/${request.id}`}>
                  <div className="border rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getUrgencyColor(request.urgency)}>
                            {request.urgency}
                          </Badge>
                          <Badge variant="outline" className={`${getStatusColor(request.status)} border-0`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status.replace(/_/g, ' ')}</span>
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900 mb-1">{request.reason.substring(0, 80)}...</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="font-semibold text-blue-600">
                            {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(request.amount)}
                          </span>
                          <span>•</span>
                          <span>{request.location}</span>
                          <span>•</span>
                          <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
