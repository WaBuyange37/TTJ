// Location: app/dashboard/director/expense-approvals/page.tsx
// Director expense approval workflow

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Clock, Receipt, AlertCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface SocialWorkerExpense {
  id: string
  amount: number
  date: string
  category: string
  description: string
  receipt?: string
  allocatedFrom?: string
  status: string
  reviewedById?: string
  reviewedAt?: string
  reviewNotes?: string
  createdAt: string
  addedBy: {
    name: string
    email: string
  }
}

interface ExpenseStats {
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  totalPendingAmount: number
  totalApprovedAmount: number
}

export default function DirectorExpenseApprovals() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [expenses, setExpenses] = useState<SocialWorkerExpense[]>([])
  const [stats, setStats] = useState<ExpenseStats>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalPendingAmount: 0,
    totalApprovedAmount: 0
  })
  const [loading, setLoading] = useState(true)
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; expense: SocialWorkerExpense | null }>({
    open: false,
    expense: null
  })
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED',
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'COUNTRY_DIRECTOR') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/director/expense-approvals')
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = (expense: SocialWorkerExpense) => {
    setReviewDialog({ open: true, expense })
    setReviewForm({
      status: 'APPROVED',
      notes: ''
    })
  }

  const submitReview = async () => {
    if (!reviewDialog.expense) return

    try {
      const response = await fetch(`/api/director/expense-approvals/${reviewDialog.expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      })

      if (response.ok) {
        toast.success(`Expense ${reviewForm.status.toLowerCase()} successfully`)
        setReviewDialog({ open: false, expense: null })
        fetchExpenses() // Refresh the list
      } else {
        toast.error('Failed to update expense')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update expense')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Expense Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve social worker expense requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingCount}</p>
                <p className="text-sm text-gray-500">{formatCurrency(stats.totalPendingAmount)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.approvedCount}</p>
                <p className="text-sm text-gray-500">{formatCurrency(stats.totalApprovedAmount)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejectedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Processed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {stats.approvedCount + stats.rejectedCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for pending expenses */}
      {stats.pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  {stats.pendingCount} Expense{stats.pendingCount > 1 ? 's' : ''} Pending Review
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Total amount awaiting approval: {formatCurrency(stats.totalPendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>Review social worker expense submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No expenses submitted</h3>
              <p className="text-gray-600">Social workers haven't submitted any expenses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusBadge(expense.status)}
                        <span className="text-sm font-medium text-gray-900 uppercase">
                          {expense.category.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2">{expense.description}</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="font-semibold text-lg">{formatCurrency(expense.amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Submitted by</p>
                          <p className="font-medium">{expense.addedBy.name}</p>
                        </div>
                        {expense.allocatedFrom && (
                          <div>
                            <p className="text-sm text-gray-600">Allocated from</p>
                            <p className="font-medium">{expense.allocatedFrom}</p>
                          </div>
                        )}
                        {expense.receipt && (
                          <div>
                            <p className="text-sm text-gray-600">Receipt</p>
                            <a 
                              href={expense.receipt} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View Receipt
                            </a>
                          </div>
                        )}
                      </div>

                      {expense.reviewNotes && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium text-gray-700">Review Notes:</p>
                          <p className="text-sm text-gray-600">{expense.reviewNotes}</p>
                        </div>
                      )}
                    </div>

                    {expense.status === 'PENDING' && (
                      <div className="ml-4">
                        <Button 
                          onClick={() => handleReview(expense)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ ...reviewDialog, open })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Expense</DialogTitle>
            <DialogDescription>
              Review the expense submission and approve or reject it.
            </DialogDescription>
          </DialogHeader>
          
          {reviewDialog.expense && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{reviewDialog.expense.description}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(reviewDialog.expense.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium">{reviewDialog.expense.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted by:</span>
                    <span className="ml-2 font-medium">{reviewDialog.expense.addedBy.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(reviewDialog.expense.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Decision</Label>
                <Select value={reviewForm.status} onValueChange={(value) => setReviewForm({ ...reviewForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve</SelectItem>
                    <SelectItem value="REJECTED">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Review Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about your decision..."
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setReviewDialog({ open: false, expense: null })}
                >
                  Cancel
                </Button>
                <Button onClick={submitReview}>
                  {reviewForm.status === 'APPROVED' ? 'Approve Expense' : 'Reject Expense'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
