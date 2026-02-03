// Location: app/dashboard/director/reports/page.tsx
// Director can generate PDF reports for any date range

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { FileText, Download, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

// Type definitions for better type safety
interface ReportSummary {
  totalIncome: number
  totalExpenses: number
  totalEmergency: number
  available: number
}

interface Income {
  date: string
  amount: number
  description: string
  sender: string
  addedBy: string
}

interface Expense {
  date: string
  amount: number
  description: string
  category: string
  addedBy: string
}

interface EmergencyRequest {
  date: string
  amount: number
  reason: string
  status: string
  urgency: string
}

interface ReportData {
  metadata: {
    startDate: string
    endDate: string
    generatedAt: string
    generatedBy: string
  }
  summary: ReportSummary
  incomes: Income[]
  expenses: Expense[]
  requests: EmergencyRequest[]
}

export default function DirectorReportsPage() {
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
    if (status === 'unauthenticated') {
      router.push('/auth/Login')
    } else if (session?.user?.role !== 'COUNTRY_DIRECTOR') {
      router.push('/customer')
    }
  }, [status, session, router])

  const generateReport = async () => {
    if (!form.startDate || !form.endDate) {
      toast({
        title: 'Error',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      })
      return
    }

    if (new Date(form.startDate) > new Date(form.endDate)) {
      toast({
        title: 'Error',
        description: 'Start date must be before end date',
        variant: 'destructive',
      })
      return
    }

    if (!form.includeIncome && !form.includeExpenses && !form.includeRequests && !form.includeBudget) {
      toast({
        title: 'Error',
        description: 'Please select at least one section to include',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    
    try {
      // Request server to return PDF directly (falls back to JSON if not)
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, format: 'pdf' }),
      })

      const contentType = response.headers.get('content-type') || ''

      if (response.ok && contentType.includes('application/pdf')) {
        // Receive binary PDF and download
        const buffer = await response.arrayBuffer()
        const blob = new Blob([buffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Wakazi-Motors-Report-${form.startDate}-to-${form.endDate}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)

        toast({ 
          title: 'Success!', 
          description: 'Report downloaded successfully' 
        })
      } else if (response.ok) {
        // Fallback: server returned JSON data — generate client-side PDF
        const data: ReportData = await response.json()

        // Dynamic import to reduce bundle size
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('en-RW', { 
            style: 'currency', 
            currency: 'RWF', 
            maximumFractionDigits: 0 
          }).format(amount)
        }

        const formatDate = (dateStr: string) => {
          return new Date(dateStr).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        }

        let yPos = 20

        // Header
        doc.setFontSize(20)
        doc.text('Them To Jesus', 105, yPos, { align: 'center' })
        yPos += 8
        doc.setFontSize(12)
        doc.text('Jesus is in Control', 105, yPos, { align: 'center' })
        yPos += 10
        doc.setFontSize(16)
        doc.text('TTJ Activity Report', 105, yPos, { align: 'center' })
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
        if (form.includeBudget && data.summary) {
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
        if (form.includeIncome && data.incomes && data.incomes.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          doc.setFontSize(14)
          doc.text('INCOME DETAILS', 20, yPos)
          yPos += 10

          doc.setFontSize(10)
          data.incomes.forEach((income, index) => {
            if (yPos > 270) {
              doc.addPage()
              yPos = 20
            }

            doc.text(`${index + 1}. ${formatDate(income.date)} - ${formatCurrency(income.amount)}`, 20, yPos)
            yPos += 5
            doc.text(`   ${income.description}`, 20, yPos)
            yPos += 5
            doc.text(`   From: ${income.sender} | Added by: ${income.addedBy}`, 20, yPos)
            yPos += 8
          })

          doc.setFontSize(12)
          doc.text(`Total: ${formatCurrency(data.summary.totalIncome)}`, 20, yPos)
          yPos += 15
        }

        // Expense Details
        if (form.includeExpenses && data.expenses && data.expenses.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          doc.setFontSize(14)
          doc.text('EXPENSE DETAILS', 20, yPos)
          yPos += 10

          doc.setFontSize(10)
          data.expenses.forEach((expense, index) => {
            if (yPos > 270) {
              doc.addPage()
              yPos = 20
            }

            doc.text(`${index + 1}. ${formatDate(expense.date)} - ${formatCurrency(expense.amount)}`, 20, yPos)
            yPos += 5
            doc.text(`   ${expense.description}`, 20, yPos)
            yPos += 5
            doc.text(`   Category: ${expense.category} | Added by: ${expense.addedBy}`, 20, yPos)
            yPos += 8
          })

          doc.setFontSize(12)
          doc.text(`Total: ${formatCurrency(data.summary.totalExpenses)}`, 20, yPos)
          yPos += 15
        }

        // Emergency Requests
        if (form.includeRequests && data.requests && data.requests.length > 0) {
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          doc.setFontSize(14)
          doc.text('EMERGENCY REQUESTS', 20, yPos)
          yPos += 10

          doc.setFontSize(10)
          data.requests.forEach((request, index) => {
            if (yPos > 260) {
              doc.addPage()
              yPos = 20
            }

            doc.text(`${index + 1}. ${formatDate(request.date)} - ${formatCurrency(request.amount)}`, 20, yPos)
            yPos += 5
            doc.text(`   ${request.reason}`, 20, yPos)
            yPos += 5
            doc.text(`   Status: ${request.status} | Urgency: ${request.urgency}`, 20, yPos)
            yPos += 8
          })
        }

        // Save PDF
        doc.save(`TTJ-report${form.startDate}-to-${form.endDate}.pdf`)

        toast({
          title: 'Success!',
          description: 'Report downloaded successfully',
        })
      } else {
        const error = await response.json()
        const details = error.details ? ` — ${String(error.details).split('\n')[0]}` : ''
        toast({
          title: 'Error',
          description: `${error.error || 'Failed to generate report'}${details}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while generating the report',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Reports</h1>
        <p className="text-gray-600 mt-1">Create comprehensive PDF reports for any date range</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>Configure your report parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Quick Date Ranges */}
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date()
                      setForm({
                        ...form,
                        startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                        endDate: today.toISOString().split('T')[0]
                      })
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date()
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                      setForm({
                        ...form,
                        startDate: lastMonth.toISOString().split('T')[0],
                        endDate: lastMonthEnd.toISOString().split('T')[0]
                      })
                    }}
                  >
                    Last Month
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date()
                      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
                      setForm({
                        ...form,
                        startDate: threeMonthsAgo.toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      })
                    }}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date()
                      setForm({
                        ...form,
                        startDate: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
                        endDate: today.toISOString().split('T')[0]
                      })
                    }}
                  >
                    This Year
                  </Button>
                </div>
              </div>

              {/* Sections to Include */}
              <div className="space-y-3">
                <Label>Include in Report</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeBudget"
                      checked={form.includeBudget}
                      onCheckedChange={(checked) => setForm({ ...form, includeBudget: checked as boolean })}
                    />
                    <label htmlFor="includeBudget" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Budget Summary (Overview of income, expenses, and balance)
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeIncome"
                      checked={form.includeIncome}
                      onCheckedChange={(checked) => setForm({ ...form, includeIncome: checked as boolean })}
                    />
                    <label htmlFor="includeIncome" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Income Details (All income received during period)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeExpenses"
                      checked={form.includeExpenses}
                      onCheckedChange={(checked) => setForm({ ...form, includeExpenses: checked as boolean })}
                    />
                    <label htmlFor="includeExpenses" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Expense Details (All expenses made during period)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeRequests"
                      checked={form.includeRequests}
                      onCheckedChange={(checked) => setForm({ ...form, includeRequests: checked as boolean })}
                    />
                    <label htmlFor="includeRequests" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Emergency Requests (All requests with status and amounts)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeAudit"
                      checked={form.includeAudit}
                      onCheckedChange={(checked) => setForm({ ...form, includeAudit: checked as boolean })}
                    />
                    <label htmlFor="includeAudit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Audit Trail (All actions and changes made during period)
                    </label>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-4 border-t">
                <Button
                  onClick={generateReport}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate & Download PDF Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          {/* What's Included Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What&apos;s Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Financial Summary</p>
                  <p className="text-gray-600">Total income, expenses, and available balance</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <TrendingDown className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Detailed Transactions</p>
                  <p className="text-gray-600">Complete list of all financial activities</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Emergency Requests</p>
                  <p className="text-gray-600">Status and outcome of all funding requests</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Audit Trail</p>
                  <p className="text-gray-600">Complete history of all actions taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Use monthly reports for regular stakeholder updates</li>
                <li>• Include audit trail for complete transparency</li>
                <li>• Generate quarterly reports for documentation</li>
                <li>• Keep digital copies for your records</li>
              </ul>
            </CardContent>
          </Card>

          {/* Sample Report Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-3">
                  Reports are professionally formatted and ready to share with stakeholders or use for official documentation.
                </p>
                <p className="text-xs text-gray-500">
                  PDF format • Includes charts • Logo header • Professional layout
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}