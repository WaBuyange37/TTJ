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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Receipt, TrendingUp, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ExpenseItem {
  id: string
  description: string
  amount: number
  category: string
  createdAt: string
}

interface SocialWorkerExpense {
  id: string
  amount: number
  date: string
  description: string
  receipt?: string | null
  supportingDocument?: string | null
  allocatedFrom?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedById?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
  addedById: string
  createdAt: string
  expenseItems?: ExpenseItem[]
}

interface ExpenseStats {
  totalCount: number
  totalAmount: number
}

export default function SocialWorkerExpenses() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [expenses, setExpenses] = useState<SocialWorkerExpense[]>([])
  const [stats, setStats] = useState<ExpenseStats>({ totalCount: 0, totalAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [formData, setFormData] = useState({
    description: '',
    receipt: '',
    supportingDocument: null as File | null,
    items: [
      { id: '1', description: '', amount: 0, category: '' }
    ] as ExpenseItem[],
  })

  // Calculate total amount from all items
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0)
  }

  // Add new expense item
  const addExpenseItem = () => {
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      description: '',
      amount: 0,
      category: ''
    }
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    })
  }

  // Remove expense item
  const removeExpenseItem = (id: string) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter(item => item.id !== id)
      })
    }
  }

  // Update expense item
  const updateExpenseItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setFormData({
      ...formData,
      items: formData.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    })
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'SOCIAL_WORKER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/social-worker/expenses')
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setStats(data.stats || { totalCount: 0, totalAmount: 0 })
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate at least one item is filled with all required fields
    const validItems = formData.items.filter(item =>
      item.description.trim() &&
      item.amount > 0 &&
      item.category
    )

    if (validItems.length === 0) {
      toast.error('Please add at least one complete expense item with description, amount, and category')
      return
    }

    // Check if any items are incomplete
    const incompleteItems = formData.items.filter(item =>
      (item.description.trim() && !item.category) ||
      (item.description.trim() && item.amount <= 0) ||
      (!item.description.trim() && (item.amount > 0 || item.category))
    )

    if (incompleteItems.length > 0) {
      toast.error('Please complete all fields for each expense item (description, amount, and category)')
      return
    }

    try {
      const totalAmount = calculateTotal()
      const submitData = {
        amount: totalAmount,
        description: formData.description || `Expense with ${validItems.length} item(s)`,
        receipt: formData.receipt || null,
        items: validItems, // Send individual items for detailed tracking
      }

      // If there's a supporting document, upload it first
      if (formData.supportingDocument) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', formData.supportingDocument)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
            ; (submitData as any).supportingDocument = uploadData.url
        } else {
          toast.error('Failed to upload supporting document')
          return
        }
      }

      const response = await fetch('/api/social-worker/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Expense recorded successfully - Total: ${new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(totalAmount)}`)
        setShowAddDialog(false)
        setFormData({
          description: '',
          receipt: '',
          supportingDocument: null,
          items: [{ id: '1', description: '', amount: 0, category: '' }]
        })
        fetchExpenses() // Refresh the list
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to record expense')
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      toast.error('Failed to record expense')
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      RENT: 'bg-blue-100 text-blue-800',
      FOOD: 'bg-green-100 text-green-800',
      SCHOOL: 'bg-purple-100 text-purple-800',
      HEALTH: 'bg-red-100 text-red-800',
      TRANSPORT: 'bg-yellow-100 text-yellow-800',
      UTILITIES: 'bg-indigo-100 text-indigo-800',
      EMERGENCY: 'bg-orange-100 text-orange-800',
      OTHER: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Expenses</h1>
          <p className="text-gray-600 mt-1">Track your expenses and allocated funds</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record an expense for your allocated funds
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Overall Description */}
              <div>
                <Label htmlFor="description">Overall Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what these expenses were for (optional)..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Expense Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Expense Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExpenseItem}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>

                      <Input
                        placeholder="Item name/description *"
                        value={item.description}
                        onChange={(e) => updateExpenseItem(item.id, 'description', e.target.value)}
                        className="flex-1"
                      />

                      <Input
                        type="number"
                        placeholder="Amount *"
                        value={item.amount || ''}
                        onChange={(e) => updateExpenseItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />

                      <Select
                        value={item.category}
                        onValueChange={(value) => updateExpenseItem(item.id, 'category', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Category *" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FOOD">Food</SelectItem>
                          <SelectItem value="RENT">Rent</SelectItem>
                          <SelectItem value="SCHOOL">School</SelectItem>
                          <SelectItem value="HEALTH">Health</SelectItem>
                          <SelectItem value="TRANSPORT">Transport</SelectItem>
                          <SelectItem value="UTILITIES">Utilities</SelectItem>
                          <SelectItem value="EMERGENCY">Emergency</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpenseItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  * All fields marked with * are required for each item
                </p>
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-900">
                    {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(calculateTotal())}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="receipt">Receipt URL (optional)</Label>
                <Input
                  id="receipt"
                  type="url"
                  placeholder="https://example.com/receipt.jpg"
                  value={formData.receipt}
                  onChange={(e) => setFormData({ ...formData, receipt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="supportingDocument">Supporting Document (PDF only)</Label>
                <Input
                  id="supportingDocument"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFormData({ ...formData, supportingDocument: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-gray-500 mt-1">Upload supporting documents (PDF format, max 10MB)</p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Record Expense
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(stats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCount} expense{stats.totalCount !== 1 ? 's' : ''} recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(
                expenses
                  .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
                  .reduce((sum, e) => sum + e.amount, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>Your recent expense records</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No expenses recorded yet</p>
              <p className="text-sm text-gray-500 mt-1">Start tracking your expenses by adding your first one</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusBadge(expense.status)}
                        <span className="text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 mb-1">{expense.description}</p>

                      {/* Show individual expense items */}
                      {expense.expenseItems && expense.expenseItems.length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">Expense Items:</p>
                          <div className="space-y-1">
                            {expense.expenseItems.map((item, index) => (
                              <div key={item.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">{index + 1}.</span>
                                  <span className="text-gray-700">{item.description}</span>
                                  <Badge className={getCategoryColor(item.category)} variant="outline">
                                    {item.category.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <span className="font-medium text-gray-900">
                                  {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(item.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-700">Total:</span>
                              <span className="font-bold text-blue-600">
                                {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(expense.amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-semibold text-blue-600">
                          {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(expense.amount)}
                        </span>
                        {expense.receipt && (
                          <a
                            href={expense.receipt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Receipt
                          </a>
                        )}
                        {expense.supportingDocument && (
                          <a
                            href={expense.supportingDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                          >
                            📄 Supporting Doc
                          </a>
                        )}
                      </div>
                      {expense.reviewNotes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Director's Review:</p>
                          <p className="text-sm text-gray-600">{expense.reviewNotes}</p>
                          {expense.reviewedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Reviewed on {new Date(expense.reviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
