import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(5).optional(),
  category: z.enum(['RENT', 'FOOD', 'SCHOOL', 'HEALTH', 'TRANSPORT', 'UTILITIES', 'EMERGENCY', 'OTHER']).optional(),
  receipt: z.string().url().optional().nullable(),
  date: z.string().datetime().optional(),
})

// GET - Get single expense record
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update expense record (Director only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Only directors can update expenses' }, { status: 403 })
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id: params.id }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = updateExpenseSchema.parse(body)

    // Prepare update data
    const updateData: any = {}
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.category !== undefined) updateData.category = validatedData.category
    if (validatedData.receipt !== undefined) updateData.receipt = validatedData.receipt
    if (validatedData.date !== undefined) updateData.date = new Date(validatedData.date)

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: updateData,
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_UPDATED',
        entityType: 'Expense',
        entityId: expense.id,
        details: JSON.stringify({ 
          previousData: {
            amount: existingExpense.amount,
            category: existingExpense.category,
            description: existingExpense.description
          },
          newData: {
            amount: expense.amount,
            category: expense.category,
            description: expense.description
          }
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ expense })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete expense record (Director only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Only directors can delete expenses' }, { status: 403 })
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id: params.id }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 })
    }

    // Delete the expense record
    await prisma.expense.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_DELETED',
        entityType: 'Expense',
        entityId: params.id,
        details: JSON.stringify({ 
          amount: existingExpense.amount,
          category: existingExpense.category,
          description: existingExpense.description
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ 
      message: 'Expense record deleted successfully',
      id: params.id 
    })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
