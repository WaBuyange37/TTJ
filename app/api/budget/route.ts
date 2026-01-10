import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Budget summary (Director and Founders only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Social workers cannot see budget
    if (session.user.role === 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Calculate total income
    const totalIncome = await prisma.income.aggregate({
      _sum: { amount: true }
    })

    // Calculate total expenses
    const totalExpenses = await prisma.expense.aggregate({
      _sum: { amount: true }
    })

    // Calculate approved emergency funds (completed requests)
    const approvedEmergency = await prisma.emergencyRequest.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    })

    // Calculate pending emergency requests
    const pendingEmergency = await prisma.emergencyRequest.aggregate({
      where: {
        status: {
          in: ['PENDING_DIRECTOR', 'PENDING_FOUNDERS', 'APPROVED_BY_FOUNDERS']
        }
      },
      _sum: { amount: true }
    })

    const income = totalIncome._sum.amount || 0
    const expenses = totalExpenses._sum.amount || 0
    const emergencySpent = approvedEmergency._sum.amount || 0
    const emergencyPending = pendingEmergency._sum.amount || 0

    const available = income - expenses - emergencySpent

    // Get recent transactions
    const recentIncome = await prisma.income.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        addedBy: {
          select: { name: true }
        }
      }
    })

    const recentExpenses = await prisma.expense.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        addedBy: {
          select: { name: true }
        }
      }
    })

    // Get monthly breakdown (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyIncome = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total
      FROM incomes
      WHERE date >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
    `

    const monthlyExpenses = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total
      FROM expenses
      WHERE date >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
    `

    return NextResponse.json({
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        emergencySpent,
        emergencyPending,
        available,
        balance: income - expenses - emergencySpent,
      },
      recent: {
        income: recentIncome,
        expenses: recentExpenses,
      },
      monthly: {
        income: monthlyIncome,
        expenses: monthlyExpenses,
      }
    })
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
