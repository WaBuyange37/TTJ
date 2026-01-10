'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

export default function DirectorBudgetPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    available: 0,
    emergencyFunds: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'COUNTRY_DIRECTOR') {
      router.push('/dashboard')
    } else {
      fetchBudget()
    }
  }, [status, session, router])

  const fetchBudget = async () => {
    try {
      const response = await fetch('/api/budget')
      if (response.ok) {
        const data = await response.json()
        setBudget(data)
      }
    } catch (error) {
      console.error('Error fetching budget:', error)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Budget Overview</h1>
        <p className="text-gray-600 mt-1">Complete financial summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(budget.available)}
                </p>
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
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(budget.totalIncome)}
                </p>
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
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(budget.totalExpenses)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emergency Funds</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {formatCurrency(budget.emergencyFunds)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Calculation</CardTitle>
          <CardDescription>How the available balance is calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Total Income</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(budget.totalIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Total Expenses</span>
              <span className="font-semibold text-orange-600">
                - {formatCurrency(budget.totalExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Emergency Funds Used</span>
              <span className="font-semibold text-purple-600">
                - {formatCurrency(budget.emergencyFunds)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold text-gray-900">Available Balance</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(budget.available)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
