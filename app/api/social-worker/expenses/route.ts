import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  receipt: z.string().url().optional().nullable(),
  supportingDocument: z.string().url().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required'),
    amount: z.number().positive('Item amount must be positive'),
    category: z.enum(['RENT', 'FOOD', 'SCHOOL', 'HEALTH', 'TRANSPORT', 'UTILITIES', 'EMERGENCY', 'OTHER']),
  })).min(1, 'At least one expense item is required'),
  allocatedFrom: z.string().optional(),
})

// GET - List social worker's own expenses only
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Only social workers can access this endpoint' }, { status: 403 })
    }

    // Get social worker's expenses only
    const expenses = await prisma.socialWorkerExpense.findMany({
      where: { addedById: session.user.id },
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        },
        expenseItems: {
          orderBy: { createdAt: 'asc' }
        } as any
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate their total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

    return NextResponse.json({
      expenses,
      totalExpenses,
      stats: {
        totalCount: expenses.length,
        totalAmount: totalExpenses
      }
    })
  } catch (error) {
    console.error('Error fetching social worker expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new social worker expense
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Only social workers can create expenses' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = createExpenseSchema.parse(body)

    // If allocatedFrom is provided, verify it exists and is marked for social worker allocation
    let allocationInfo = null
    if (validatedData.allocatedFrom) {
      const allocation = await prisma.income.findUnique({
        where: { id: validatedData.allocatedFrom },
        select: { id: true, amount: true, description: true }
      })

      if (!allocation) {
        return NextResponse.json({ error: 'Invalid allocation reference' }, { status: 400 })
      }

      allocationInfo = allocation
    }

    const expense = await prisma.socialWorkerExpense.create({
      data: {
        amount: validatedData.amount,
        description: validatedData.description,
        receipt: validatedData.receipt,
        supportingDocument: validatedData.supportingDocument,
        allocatedFrom: validatedData.allocatedFrom,
        addedById: session.user.id,
        expenseItems: {
          create: validatedData.items.map(item => ({
            description: item.description,
            amount: item.amount,
            category: item.category,
          }))
        } as any
      } as any,
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        },
        expenseItems: true as any
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'SOCIAL_WORKER_EXPENSE_CREATED',
        entityType: 'SocialWorkerExpense',
        entityId: expense.id,
        details: JSON.stringify({
          amount: expense.amount,
          description: expense.description,
          allocatedFrom: allocationInfo?.description || 'General funds',
          itemCount: (expense as any).expenseItems?.length || 0
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({
      expense,
      allocation: allocationInfo,
      message: 'Expense recorded successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating social worker expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
