import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Directors and Founders can view all social worker expenses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COUNTRY_DIRECTOR' && session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const socialWorkerId = searchParams.get('socialWorkerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    let whereClause: any = {}

    if (socialWorkerId) {
      whereClause.addedById = socialWorkerId
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    // Get expenses with detailed information
    const expenses = await prisma.socialWorkerExpense.findMany({
      where: whereClause,
      include: {
        addedBy: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get allocation information for expenses that have allocatedFrom
    const expensesWithAllocation = await Promise.all(
      expenses.map(async (expense: any) => {
        let allocation = null
        if (expense.allocatedFrom) {
          allocation = await prisma.income.findUnique({
            where: { id: expense.allocatedFrom },
            select: { id: true, amount: true, description: true, date: true, sender: true }
          })
        }
        return {
          ...expense,
          allocation
        }
      })
    )

    // Calculate statistics
    const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0)
    const expensesByCategory = expenses.reduce((acc: Record<string, number>, expense: any) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    const expensesByWorker = expenses.reduce((acc: Record<string, { count: number; total: number }>, expense: any) => {
      const workerName = expense.addedBy.name
      if (!acc[workerName]) {
        acc[workerName] = { count: 0, total: 0 }
      }
      acc[workerName].count += 1
      acc[workerName].total += expense.amount
      return acc
    }, {} as Record<string, { count: number; total: number }>)

    return NextResponse.json({
      expenses: expensesWithAllocation,
      stats: {
        totalCount: expenses.length,
        totalAmount: totalExpenses,
        byCategory: expensesByCategory,
        byWorker: expensesByWorker
      }
    })
  } catch (error) {
    console.error('Error fetching social worker expenses for director:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
