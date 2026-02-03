'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

export default function FounderDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    completedRequests: 0,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'FOUNDER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [budgetRes, requestsRes] = await Promise.all([
        fetch('/api/budget'),
        fetch('/api/emergency')
      ])

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setStats(prev => ({
          ...prev,
          totalIncome: budgetData.totalIncome || 0,
          totalExpenses: budgetData.totalExpenses || 0,
          balance: budgetData.available || 0
        }))
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        const requests = requestsData.requests || []
        setStats(prev => ({
          ...prev,
          pendingRequests: requests.filter((r: any) => r.status === 'PENDING_FOUNDERS').length,
          approvedRequests: requests.filter((r: any) => r.status === 'APPROVED_BY_FOUNDERS').length,
          completedRequests: requests.filter((r: any) => r.status === 'COMPLETED').length,
        }))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {session?.user.name}!</h1>
        <p className="text-gray-600 mt-1">Founder Dashboard - High-level overview of operations</p>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.balance)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingRequests}</p>
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
                <p className="text-sm font-medium text-gray-600">Approved (Awaiting Payment)</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.approvedRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/dashboard/founder/requests">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="default">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">Review Requests</span>
              </Button>
            </Link>

            <Link href="/dashboard/founder/budget">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <DollarSign className="h-8 w-8" />
                <span className="font-semibold">View Budget</span>
              </Button>
            </Link>

            <Link href="/dashboard/founder/updates">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <FileText className="h-8 w-8" />
                <span className="font-semibold">View Updates</span>
              </Button>
            </Link>

            <Link href="/dashboard/founder/reports">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <TrendingUp className="h-8 w-8" />
                <span className="font-semibold">Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Alert */}
      {stats.pendingRequests > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  {stats.pendingRequests} Request{stats.pendingRequests > 1 ? 's' : ''} Awaiting Your Approval
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Emergency requests have been reviewed by the director and are waiting for final founder approval.
                </p>
                <Link href="/dashboard/founder/requests">
                  <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                    Review Now
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}