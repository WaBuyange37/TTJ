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
import { useToast } from '@/components/ui/use-toast'
import { FileText, Download, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

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
      router.push('/login')
    } else if (session?.user.role !== 'COUNTRY_DIRECTOR') {
      router.push('/dashboard')
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
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `TTJ-NGO-Report-${form.startDate}-to-${form.endDate}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: 'Success!',
          description: 'Report downloaded successfully',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to generate report',
          variant: 'destructive',
        })
      }
    } catch (error) {
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
                      const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3))
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
              <CardTitle className="text-base">What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Financial Summary</p>
                  <p className="text-gray-600">Total income, expenses, and available balance</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <TrendingDown className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">Detailed Transactions</p>
                  <p className="text-gray-600">Complete list of all financial activities</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Emergency Requests</p>
                  <p className="text-gray-600">Status and outcome of all funding requests</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-green-600 mt-0.5" />
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
                <li>• Use monthly reports for regular founder updates</li>
                <li>• Include audit trail for complete transparency</li>
                <li>• Generate quarterly reports for visa applications</li>
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
                  Reports are professionally formatted and ready to share with founders or use for official documentation.
                </p>
                <p className="text-xs text-gray-500">
                  PDF format • Includes charts • Logo header • Digital signatures
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}