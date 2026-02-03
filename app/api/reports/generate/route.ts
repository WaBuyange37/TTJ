// src/app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// Type definitions
interface ReportRequest {
  startDate: string
  endDate: string
  includeIncome: boolean
  includeExpenses: boolean
  includeRequests: boolean
  includeBudget: boolean
  includeAudit: boolean
  format?: 'pdf' | 'json'
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'You must be logged in to generate reports' },
        { status: 401 }
      )
    }

    // Check if user has director role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { role: true, name: true }
    })

    if (!user || user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json(
        { error: 'Forbidden', details: 'Only Country Directors can generate reports' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: ReportRequest = await request.json()
    const { startDate, endDate, includeIncome, includeExpenses, includeRequests, includeBudget } = body

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // Include entire end date

    if (start > end) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Initialize data structure
    const reportData = {
      metadata: {
        startDate: startDate,
        endDate: endDate,
        generatedAt: new Date().toISOString(),
        generatedBy: user.name || session.user.email || 'Unknown',
        organization: 'THEM TO JESUS NGO'
      },
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        totalEmergency: 0,
        available: 0
      },
      incomes: [] as any[],
      expenses: [] as any[],
      requests: [] as any[]
    }

    // Fetch Income Data (from Prisma model)
    if (includeIncome) {
      try {
        const incomes = await prisma.income.findMany({
          where: {
            date: { gte: start, lte: end }
          },
          include: { addedBy: { select: { name: true } } },
          orderBy: { date: 'desc' }
        })

        reportData.incomes = incomes.map((income: any) => ({
          date: income.date,
          amount: Number(income.amount),
          description: income.description || 'No description',
          sender: income.sender || 'Unknown',
          addedBy: income.addedBy?.name || 'Unknown'
        }))

        reportData.summary.totalIncome = incomes.reduce(
          (sum: number, income: any) => sum + Number(income.amount),
          0
        )
      } catch (error) {
        console.log('Error fetching incomes:', error)
        reportData.incomes = []
      }
    }

    // Fetch Expense Data
    if (includeExpenses) {
      try {
        const expenses = await prisma.expense.findMany({
          where: {
            date: { gte: start, lte: end }
          },
          include: { addedBy: { select: { name: true } } },
          orderBy: { date: 'desc' }
        })

        reportData.expenses = expenses.map((expense: any) => ({
          date: expense.date,
          amount: Number(expense.amount),
          description: expense.description || 'No description',
          category: expense.category || 'General',
          addedBy: expense.addedBy?.name || 'Unknown'
        }))

        reportData.summary.totalExpenses = expenses.reduce(
          (sum: number, expense: any) => sum + Number(expense.amount),
          0
        )
      } catch (error) {
        console.log('Error fetching expenses:', error)
        reportData.expenses = []
      }
    }

    // Fetch Emergency Requests
    if (includeRequests) {
      try {
        const requests = await prisma.emergencyRequest.findMany({
          where: {
            requestedAt: { gte: start, lte: end }
          },
          include: { requestedBy: { select: { name: true } } },
          orderBy: { requestedAt: 'desc' }
        })

        reportData.requests = requests.map((request: any) => ({
          date: request.requestedAt || request.createdAt,
          amount: Number(request.amount),
          reason: request.reason || 'No reason provided',
          status: request.status || 'PENDING_DIRECTOR',
          urgency: request.urgency || 'MEDIUM',
          requestedBy: request.requestedBy?.name || 'Unknown'
        }))

        reportData.summary.totalEmergency = requests
          .filter((r: any) => r.status === 'APPROVED_BY_DIRECTOR' || r.status === 'APPROVED_BY_FOUNDERS')
          .reduce((sum: number, r: any) => sum + Number(r.amount), 0)
      } catch (error) {
        console.log('Error fetching emergency requests:', error)
        reportData.requests = []
      }
    }

    // Calculate available balance
    reportData.summary.available = 
      reportData.summary.totalIncome - 
      reportData.summary.totalExpenses - 
      reportData.summary.totalEmergency

    // Return JSON data (client will generate PDF)
    return NextResponse.json(reportData, { status: 200 })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}