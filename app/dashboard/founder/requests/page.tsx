// Location: app/dashboard/founder/requests/page.tsx
// Founder approves or rejects requests (final authority)

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react'

interface EmergencyRequest {
  id: string
  amount: number
  reason: string
  urgency: string
  location: string
  status: string
  supportingDocument?: string
  requestedAt: string
  requestedBy: { name: string }
  directorNotes?: string
  founderNotes?: string
}

export default function FounderRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [notes, setNotes] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'FOUNDER') {
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
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const openReviewDialog = (request: EmergencyRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setReviewAction(action)
    setNotes('')
    setSignature(session?.user.name || '')
    setReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!selectedRequest || !notes.trim()) {
      toast({ title: 'Error', description: 'Please provide notes', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/emergency/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          notes,
          signature: signature || session?.user.name
        }),
      })

      if (response.ok) {
        toast({ title: 'Success!', description: `Request ${reviewAction}d` })
        setReviewDialogOpen(false)
        fetchRequests()
      } else {
        const error = await response.json()
        toast({ title: 'Error', description: error.error || 'Failed', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    if (status.includes('REJECTED')) return 'bg-red-100 text-red-800'
    if (status === 'COMPLETED') return 'bg-green-100 text-green-800'
    if (status === 'APPROVED_BY_FOUNDERS') return 'bg-blue-100 text-blue-800'
    if (status === 'PENDING_FOUNDERS') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500 text-white'
      case 'HIGH': return 'bg-orange-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-white'
      default: return 'bg-green-500 text-white'
    }
  }

  const canApprove = (status: string) => status === 'PENDING_FOUNDERS'

  const filteredRequests = requests.filter(r => {
    if (filter === 'pending') return r.status === 'PENDING_FOUNDERS'
    if (filter === 'approved') return r.status === 'APPROVED_BY_FOUNDERS' || r.status === 'COMPLETED'
    if (filter === 'rejected') return r.status.includes('REJECTED_BY_FOUNDER')
    return true
  })

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Emergency Requests</h1>
        <p className="text-gray-600 mt-1">Final approval authority for funding requests</p>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 border-b">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 font-medium border-b-2 ${
              filter === f ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filter === 'pending' ? 'Pending Your Approval' : `${filter} Requests`}</CardTitle>
          <CardDescription>
            {filter === 'pending' && 'These requests have been approved by the director and need your final approval'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getUrgencyColor(request.urgency)}>{request.urgency}</Badge>
                        <Badge className={getStatusColor(request.status)}>{request.status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="font-medium mb-2">{request.reason}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                        <div><span className="font-medium">Amount:</span> <span className="text-blue-600 font-semibold">{formatCurrency(request.amount)}</span></div>
                        <div><span className="font-medium">Location:</span> {request.location}</div>
                        <div><span className="font-medium">By:</span> {request.requestedBy.name}</div>
                        <div><span className="font-medium">Date:</span> {new Date(request.requestedAt).toLocaleDateString()}</div>
                      </div>
                      {request.supportingDocument && (
                        <a href={request.supportingDocument} target="_blank" className="text-sm text-blue-600 flex items-center space-x-1 mb-2">
                          <FileText className="h-4 w-4" />
                          <span>View Document</span>
                        </a>
                      )}
                      {request.directorNotes && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mb-2">
                          <p className="font-medium text-blue-900 mb-1">Director's Notes:</p>
                          <p className="text-blue-800">{request.directorNotes}</p>
                        </div>
                      )}
                      {request.founderNotes && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                          <p className="font-medium text-purple-900 mb-1">Your Notes:</p>
                          <p className="text-purple-800">{request.founderNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {canApprove(request.status) && (
                        <>
                          <Button size="sm" onClick={() => openReviewDialog(request, 'approve')}>
                            <CheckCircle className="h-4 w-4 mr-2" />Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openReviewDialog(request, 'reject')} className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === 'approve' ? 'Approve' : 'Reject'} Request</DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'This will authorize the director to make the payment' 
                : 'This will permanently reject this funding request'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                <div><span className="font-medium">Amount:</span> {formatCurrency(selectedRequest.amount)}</div>
                <div><span className="font-medium">Requested by:</span> {selectedRequest.requestedBy.name}</div>
                <div><span className="font-medium">Location:</span> {selectedRequest.location}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Your Notes *</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Enter your decision notes..." />
            </div>
            {reviewAction === 'approve' && (
              <div className="space-y-2">
                <Label>Digital Signature</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReview} disabled={submitting || !notes.trim()} className={reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {submitting ? 'Processing...' : `Confirm ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}