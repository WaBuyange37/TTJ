'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  Plus
} from 'lucide-react'
import Link from 'next/link'

export default function DirectorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingRequests: 0,
    thisMonthIncome: 0,
    thisMonthExpenses: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'COUNTRY_DIRECTOR') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch budget data
      const budgetRes = await fetch('/api/budget')
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setStats(prev => ({
          ...prev,
          totalIncome: budgetData.totalIncome || 0,
          totalExpenses: budgetData.totalExpenses || 0,
          balance: budgetData.available || 0
        }))
      }

      // Fetch emergency requests
      const requestsRes = await fetch('/api/emergency')
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        const pending = requestsData.requests?.filter(
          (r: any) => r.status === 'PENDING_DIRECTOR'
        ).length || 0
        setStats(prev => ({ ...prev, pendingRequests: pending }))
      }

      // Get current month data
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

      const incomeRes = await fetch(`/api/income?month=${month}&year=${year}`)
      if (incomeRes.ok) {
        const incomeData = await incomeRes.json()
        setStats(prev => ({ ...prev, thisMonthIncome: incomeData.total || 0 }))
      }

      const expenseRes = await fetch(`/api/expense?month=${month}&year=${year}`)
      if (expenseRes.ok) {
        const expenseData = await expenseRes.json()
        setStats(prev => ({ ...prev, thisMonthExpenses: expenseData.total || 0 }))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user.name}!
        </h1>
        <p className="text-gray-600">
          Country Director Dashboard - Manage budget and approve requests
        </p>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Available Balance */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.balance)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Income */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats.pendingRequests}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Link href="/dashboard/director/income">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="default">
                <Plus className="h-8 w-8" />
                <span className="font-semibold">Add Income</span>
              </Button>
            </Link>

            <Link href="/dashboard/director/expenses">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <Receipt className="h-8 w-8" />
                <span className="font-semibold">Add Expense</span>
              </Button>
            </Link>

            <Link href="/dashboard/director/requests">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">Review Requests</span>
              </Button>
            </Link>

            <Link href="/dashboard/director/expense-approvals">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <CheckCircle className="h-8 w-8" />
                <span className="font-semibold">Approve Expenses</span>
              </Button>
            </Link>

            <Link href="/dashboard/director/budget">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <DollarSign className="h-8 w-8" />
                <span className="font-semibold">View Budget</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* This Month Summary */}
      <Card>
        <CardHeader>
          <CardTitle>This Month</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <p className="font-medium text-gray-700">Income</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.thisMonthIncome)}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="font-medium text-gray-700">Expenses</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.thisMonthExpenses)}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <p className="font-medium text-gray-700">Net</p>
              </div>
              <p className={`text-2xl font-bold ${stats.thisMonthIncome - stats.thisMonthExpenses >= 0
                ? 'text-green-600'
                : 'text-red-600'
                }`}>
                {formatCurrency(stats.thisMonthIncome - stats.thisMonthExpenses)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {stats.pendingRequests > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  {stats.pendingRequests} Emergency Request{stats.pendingRequests > 1 ? 's' : ''} Pending Review
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Social workers are waiting for your approval to proceed with emergency funding requests.
                </p>
                <Link href="/dashboard/director/requests">
                  <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                    Review Now
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.balance < 100000 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Low Balance Alert</h3>
                <p className="text-sm text-red-800">
                  Available balance is running low. Consider requesting additional funds from the founders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
