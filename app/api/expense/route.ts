import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(5),
  category: z.enum(['RENT', 'FOOD', 'SCHOOL', 'HEALTH', 'TRANSPORT', 'UTILITIES', 'EMERGENCY', 'OTHER']),
  receipt: z.string().url().optional(),
  date: z.string().datetime().optional(),
})

// GET - List all expenses (Director and Founders only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const category = searchParams.get('category')

    let whereClause: any = {}

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    if (category) {
      whereClause.category = category
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    })

    const total = await prisma.expense.aggregate({
      where: whereClause,
      _sum: { amount: true }
    })

    // Get expenses by category
    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
    })

    return NextResponse.json({ 
      expenses, 
      total: total._sum.amount || 0,
      byCategory 
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add expense (Director only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Only directors can add expenses' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = expenseSchema.parse(body)

    const expense = await prisma.expense.create({
      data: {
        ...validatedData,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        addedById: session.user.id,
      },
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_ADDED',
        entityType: 'Expense',
        entityId: expense.id,
        details: JSON.stringify({ 
          amount: expense.amount, 
          category: expense.category 
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
