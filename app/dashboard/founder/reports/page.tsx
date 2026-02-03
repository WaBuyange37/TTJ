// Location: app/dashboard/founder/reports/page.tsx
// Founder can generate same reports as director

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Download, FileText } from 'lucide-react'

export default function FounderReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeIncome: true,
    includeExpenses: true,
    includeRequests: true,
    includeBudget: true,
    includeAudit: false
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (session?.user.role !== 'FOUNDER') router.push('/dashboard')
  }, [status, session, router])

  const generateReport = async () => {
    if (!form.startDate || !form.endDate) {
      toast({ title: 'Error', description: 'Select date range', variant: 'destructive' })
      return
    }

    setGenerating(true)
    
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (response.ok) {
        const data = await response.json()
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        
        const formatCurrency = (amount: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
        const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        let yPos = 20

        // Header
        doc.setFontSize(20)
        doc.text('THEM TO JESUS NGO', 105, yPos, { align: 'center' })
        yPos += 10
        doc.setFontSize(16)
        doc.text('Financial Report', 105, yPos, { align: 'center' })
        yPos += 10
        doc.setFontSize(12)
        doc.text(`Period: ${formatDate(data.metadata.startDate)} to ${formatDate(data.metadata.endDate)}`, 105, yPos, { align: 'center' })
        yPos += 7
        doc.setFontSize(10)
        doc.text(`Generated: ${formatDate(data.metadata.generatedAt)}`, 105, yPos, { align: 'center' })
        yPos += 5
        doc.text(`By: ${data.metadata.generatedBy}`, 105, yPos, { align: 'center' })
        yPos += 15

        // Budget Summary
        if (form.includeBudget) {
          doc.setFontSize(14)
          doc.text('BUDGET SUMMARY', 20, yPos)
          yPos += 10
          
          doc.setFontSize(11)
          doc.text('Total Income:', 20, yPos)
          doc.text(formatCurrency(data.summary.totalIncome), 150, yPos, { align: 'right' })
          yPos += 7
          
          doc.text('Total Expenses:', 20, yPos)
          doc.text(formatCurrency(data.summary.totalExpenses), 150, yPos, { align: 'right' })
          yPos += 7
          
          doc.text('Emergency Funds:', 20, yPos)
          doc.text(formatCurrency(data.summary.totalEmergency), 150, yPos, { align: 'right' })
          yPos += 7
          
          doc.line(20, yPos, 150, yPos)
          yPos += 5
          
          doc.setFontSize(12)
          doc.text('Available Balance:', 20, yPos)
          doc.text(formatCurrency(data.summary.available), 150, yPos, { align: 'right' })
          yPos += 15
        }

        // Income Details
        if (form.includeIncome && data.incomes.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFontSize(14)
          doc.text('INCOME DETAILS', 20, yPos)
          yPos += 10
          
          doc.setFontSize(10)
          data.incomes.forEach((income: any, index: number) => {
            if (yPos > 270) {
              doc.addPage()
              yPos = 20
            }
            
            doc.text(`${index + 1}. ${formatDate(income.date)} - ${formatCurrency(income.amount)}`, 20, yPos)
            yPos += 5
            doc.text(`   ${income.description}`, 20, yPos)
            yPos += 5
            doc.text(`   From: ${income.sender}`, 20, yPos)
            yPos += 8
          })
          
          doc.setFontSize(12)
          doc.text(`Total: ${formatCurrency(data.summary.totalIncome)}`, 20, yPos)
          yPos += 15
        }

        // Expense Details
        if (form.includeExpenses && data.expenses.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFontSize(14)
          doc.text('EXPENSE DETAILS', 20, yPos)
          yPos += 10
          
          doc.setFontSize(10)
          data.expenses.forEach((expense: any, index: number) => {
            if (yPos > 270) {
              doc.addPage()
              yPos = 20
            }
            
            doc.text(`${index + 1}. ${formatDate(expense.date)} - ${formatCurrency(expense.amount)}`, 20, yPos)
            yPos += 5
            doc.text(`   ${expense.description}`, 20, yPos)
            yPos += 5
            doc.text(`   Category: ${expense.category}`, 20, yPos)
            yPos += 8
          })
          
          doc.setFontSize(12)
          doc.text(`Total: ${formatCurrency(data.summary.totalExpenses)}`, 20, yPos)
          yPos += 15
        }

        // Emergency Requests
        if (form.includeRequests && data.requests.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }
          
          doc.setFontSize(14)
          doc.text('EMERGENCY REQUESTS', 20, yPos)
          yPos += 10
          
          doc.setFontSize(10)
          data.requests.forEach((request: any, index: number) => {
            if (yPos > 260) {
              doc.addPage()
              yPos = 20
            }
            
            doc.text(`${index + 1}. ${formatDate(request.date)} - ${formatCurrency(request.amount)}`, 20, yPos)
            yPos += 5
            doc.text(`   Status: ${request.status}`, 20, yPos)
            yPos += 8
          })
        }

        doc.save(`TTJ-Report-${form.startDate}-to-${form.endDate}.pdf`)

        toast({ title: 'Success!', description: 'Report downloaded' })
      } else {
        toast({ title: 'Error', description: 'Failed to generate', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Reports</h1>
        <p className="text-gray-600 mt-1">Download financial reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Include</Label>
              <div className="space-y-3">
                {[
                  { id: 'includeBudget', label: 'Budget Summary' },
                  { id: 'includeIncome', label: 'Income Details' },
                  { id: 'includeExpenses', label: 'Expense Details' },
                  { id: 'includeRequests', label: 'Emergency Requests' },
                  { id: 'includeAudit', label: 'Audit Trail' }
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Checkbox
                      id={id}
                      checked={form[id as keyof typeof form] as boolean}
                      onCheckedChange={(checked) => setForm({ ...form, [id]: checked })}
                    />
                    <label htmlFor={id} className="text-sm">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={generateReport} disabled={generating} className="w-full" size="lg">
              {generating ? 'Generating...' : <><Download className="h-4 w-4 mr-2" />Generate PDF</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              Reports provide complete transparency of all financial operations during the selected period.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}