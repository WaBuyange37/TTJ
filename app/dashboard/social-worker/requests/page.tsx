'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, Edit, Trash2, Plus, Eye } from 'lucide-react'
import Link from 'next/link'

interface EmergencyRequest {
  id: string
  amount: number
  reason: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  location: string
  status: string
  supportingDocument?: string
  requestedAt: string
  directorNotes?: string
  founderNotes?: string
}

export default function SocialWorkerRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRequest, setEditingRequest] = useState<EmergencyRequest | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    amount: 0,
    reason: '',
    urgency: 'MEDIUM',
    location: '',
    supportingDocument: ''
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
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast({
        title: 'Error',
        description: 'Failed to load requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (request: EmergencyRequest) => {
    setEditingRequest(request)
    setEditForm({
      amount: request.amount,
      reason: request.reason,
      urgency: request.urgency,
      location: request.location,
      supportingDocument: request.supportingDocument || ''
    })
    setEditDialogOpen(true)
  }

  const handleEdit = async () => {
    if (!editingRequest) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/emergency/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: editForm.amount,
          reason: editForm.reason,
          urgency: editForm.urgency,
          location: editForm.location,
          supportingDocument: editForm.supportingDocument || null
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Request updated successfully',
        })
        setEditDialogOpen(false)
        fetchRequests()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to update request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!requestToDelete) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/emergency/${requestToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Request deleted successfully',
        })
        setDeleteDialogOpen(false)
        fetchRequests()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setRequestToDelete(null)
    }
  }

  const canEdit = (status: string) => status === 'PENDING_DIRECTOR'
  const canDelete = (status: string) => status === 'PENDING_DIRECTOR'

  const getStatusColor = (status: string) => {
    if (status.includes('REJECTED')) return 'bg-red-100 text-red-800 border-red-200'
    if (status === 'COMPLETED') return 'bg-green-100 text-green-800 border-green-200'
    if (status === 'APPROVED_BY_FOUNDERS') return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500 text-white'
      case 'HIGH': return 'bg-orange-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-white'
      default: return 'bg-green-500 text-white'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Requests</h1>
          <p className="text-gray-600 mt-1">Manage and track your funding requests</p>
        </div>
        <Link href="/dashboard/social-worker/requests/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>View, edit, and manage your emergency requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No emergency requests yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first request to get started</p>
              <Link href="/dashboard/social-worker/requests/new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <Badge className={getUrgencyColor(request.urgency)}>
                          {request.urgency}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(request.status)}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <p className="font-medium text-gray-900 mb-2">{request.reason}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Amount:</span>{' '}
                          <span className="text-blue-600 font-semibold">
                            {new Intl.NumberFormat('en-RW', {
                              style: 'currency',
                              currency: 'RWF',
                            }).format(request.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {request.location}
                        </div>
                        <div>
                          <span className="font-medium">Requested:</span>{' '}
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {request.directorNotes && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                          <p className="font-medium text-blue-900 mb-1">Director's Notes:</p>
                          <p className="text-blue-800">{request.directorNotes}</p>
                        </div>
                      )}

                      {request.founderNotes && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm mt-2">
                          <p className="font-medium text-purple-900 mb-1">Founder's Notes:</p>
                          <p className="text-purple-800">{request.founderNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <Link href={`/dashboard/social-worker/requests/${request.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>

                      {canEdit(request.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(request)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}

                      {canDelete(request.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRequestToDelete(request.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Emergency Request</DialogTitle>
            <DialogDescription>
              Make changes to your request. You can only edit requests that haven't been reviewed yet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RWF)</Label>
              <Input
                id="amount"
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                rows={4}
                placeholder="Explain why you need this funding..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select
                value={editForm.urgency}
                onValueChange={(value) => setEditForm({ ...editForm, urgency: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g., Muhanga District"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">Supporting Document URL (Optional)</Label>
              <Input
                id="document"
                type="url"
                value={editForm.supportingDocument}
                onChange={(e) => setEditForm({ ...editForm, supportingDocument: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your emergency request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
