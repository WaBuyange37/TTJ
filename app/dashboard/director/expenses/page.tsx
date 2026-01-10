// Location: app/dashboard/director/expenses/page.tsx
// Director manages all expense entries

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, TrendingDown, Receipt } from 'lucide-react'

interface Expense {
  id: string
  amount: number
  date: string
  description: string
  category: string
  receipt?: string
  addedBy: { name: string }
}

export default function DirectorExpensesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'OTHER',
    receipt: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (session?.user.role !== 'COUNTRY_DIRECTOR') router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expense')
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setForm({
        amount: expense.amount.toString(),
        date: expense.date.split('T')[0],
        description: expense.description,
        category: expense.category,
        receipt: expense.receipt || ''
      })
    } else {
      setEditingExpense(null)
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '', category: 'OTHER', receipt: '' })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.amount || !form.description) {
      toast({ title: 'Error', description: 'Amount and description required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const url = editingExpense ? `/api/expense/${editingExpense.id}` : '/api/expense'
      const method = editingExpense ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
          description: form.description,
          category: form.category,
          receipt: form.receipt || null
        }),
      })

      if (response.ok) {
        toast({ title: 'Success!', description: editingExpense ? 'Expense updated' : 'Expense added' })
        setDialogOpen(false)
        fetchExpenses()
      } else {
        const error = await response.json()
        toast({ title: 'Error', description: error.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!expenseToDelete) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/expense/${expenseToDelete}`, { method: 'DELETE' })
      
      if (response.ok) {
        toast({ title: 'Success!', description: 'Expense deleted' })
        setDeleteDialogOpen(false)
        fetchExpenses()
      } else {
        toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
    } finally {
      setSubmitting(false)
      setExpenseToDelete(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-gray-600 mt-1">Track all expenses made</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />Add Expense
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expense Entries</CardTitle>
          <CardDescription>Complete history of expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No expenses yet</p>
              <Button onClick={() => openDialog()} className="mt-4" size="sm"><Plus className="h-4 w-4 mr-2" />Add First Expense</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4 flex items-center justify-between hover:border-orange-500 transition">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-orange-600 text-lg">{formatCurrency(expense.amount)}</span>
                      <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">{expense.category}</span>
                    </div>
                    <p className="text-gray-900 mb-1">{expense.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{new Date(expense.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Added by {expense.addedBy.name}</span>
                      {expense.receipt && (
                        <>
                          <span>•</span>
                          <a href={expense.receipt} target="_blank" className="text-blue-600 hover:underline">View Receipt</a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => openDialog(expense)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setExpenseToDelete(expense.id); setDeleteDialogOpen(true); }} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (RWF) *</Label>
              <Input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENT">Rent</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="SCHOOL">School</SelectItem>
                  <SelectItem value="HEALTH">Health</SelectItem>
                  <SelectItem value="TRANSPORT">Transport</SelectItem>
                  <SelectItem value="UTILITIES">Utilities</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receipt URL (optional)</Label>
              <Input type="url" value={form.receipt} onChange={(e) => setForm({...form, receipt: e.target.value})} placeholder="https://..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this expense. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{submitting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}