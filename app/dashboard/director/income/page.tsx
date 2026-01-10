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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react'

interface Income {
  id: string
  amount: number
  date: string
  description: string
  sender: string
  category: string
  addedBy: { name: string }
  createdAt: string
}

export default function DirectorIncomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    sender: '',
    category: 'MONTHLY_BUDGET'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'COUNTRY_DIRECTOR') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchIncomes()
  }, [])

  const fetchIncomes = async () => {
    try {
      const response = await fetch('/api/income')
      if (response.ok) {
        const data = await response.json()
        setIncomes(data.incomes || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (income?: Income) => {
    if (income) {
      setEditingIncome(income)
      setForm({
        amount: income.amount.toString(),
        date: income.date.split('T')[0],
        description: income.description,
        sender: income.sender,
        category: income.category
      })
    } else {
      setEditingIncome(null)
      setForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        sender: '',
        category: 'MONTHLY_BUDGET'
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.amount || !form.description || !form.sender) {
      toast({ title: 'Error', description: 'All fields required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const url = editingIncome ? `/api/income/${editingIncome.id}` : '/api/income'
      const method = editingIncome ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
          description: form.description,
          sender: form.sender,
          category: form.category
        }),
      })

      if (response.ok) {
        toast({ title: 'Success!', description: editingIncome ? 'Income updated' : 'Income added' })
        setDialogOpen(false)
        fetchIncomes()
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
    if (!incomeToDelete) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/income/${incomeToDelete}`, { method: 'DELETE' })
      
      if (response.ok) {
        toast({ title: 'Success!', description: 'Income deleted' })
        setDeleteDialogOpen(false)
        fetchIncomes()
      } else {
        toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' })
    } finally {
      setSubmitting(false)
      setIncomeToDelete(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Income Management</h1>
          <p className="text-gray-600 mt-1">Track all income received</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />Add Income
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income List */}
      <Card>
        <CardHeader>
          <CardTitle>All Income Entries</CardTitle>
          <CardDescription>Complete history of income received</CardDescription>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No income entries yet</p>
              <Button onClick={() => openDialog()} className="mt-4" size="sm"><Plus className="h-4 w-4 mr-2" />Add First Entry</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div key={income.id} className="border rounded-lg p-4 flex items-center justify-between hover:border-blue-500 transition">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-blue-600 text-lg">{formatCurrency(income.amount)}</span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{income.category.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-gray-900 mb-1">{income.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>From: <span className="font-medium">{income.sender}</span></span>
                      <span>•</span>
                      <span>{new Date(income.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Added by {income.addedBy.name}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => openDialog(income)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setIncomeToDelete(income.id); setDeleteDialogOpen(true); }} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Edit' : 'Add'} Income</DialogTitle>
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
              <Label>Sender *</Label>
              <Input value={form.sender} onChange={(e) => setForm({...form, sender: e.target.value})} placeholder="e.g., Founder Name" required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY_BUDGET">Monthly Budget</SelectItem>
                  <SelectItem value="DONOR_GIFT">Donor Gift</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this income entry. This action cannot be undone.</AlertDialogDescription>
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