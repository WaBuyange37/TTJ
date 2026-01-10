import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const incomeSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(5),
  sender: z.string().min(2),
  category: z.enum(['MONTHLY_BUDGET', 'DONOR_GIFT', 'OTHER']),
  date: z.string().datetime().optional(),
})

// GET - List all income (Director and Founders only)
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

    let whereClause: any = {}

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    const incomes = await prisma.income.findMany({
      where: whereClause,
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    })

    const total = await prisma.income.aggregate({
      where: whereClause,
      _sum: { amount: true }
    })

    return NextResponse.json({ 
      incomes, 
      total: total._sum.amount || 0 
    })
  } catch (error) {
    console.error('Error fetching incomes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add income (Director only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Only directors can add income' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = incomeSchema.parse(body)

    const income = await prisma.income.create({
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
        action: 'INCOME_ADDED',
        entityType: 'Income',
        entityId: income.id,
        details: JSON.stringify({ 
          amount: income.amount, 
          category: income.category,
          sender: income.sender 
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ income }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating income:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
