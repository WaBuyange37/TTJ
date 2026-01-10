import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateIncomeSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(5).optional(),
  sender: z.string().min(2).optional(),
  category: z.enum(['MONTHLY_BUDGET', 'DONOR_GIFT', 'OTHER']).optional(),
  date: z.string().datetime().optional(),
})

// GET - Get single income record
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

    const income = await prisma.income.findUnique({
      where: { id: params.id },
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!income) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    return NextResponse.json({ income })
  } catch (error) {
    console.error('Error fetching income:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update income record (Director only)
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
      return NextResponse.json({ error: 'Only directors can update income' }, { status: 403 })
    }

    // Check if income exists
    const existingIncome = await prisma.income.findUnique({
      where: { id: params.id }
    })

    if (!existingIncome) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = updateIncomeSchema.parse(body)

    // Prepare update data
    const updateData: any = {}
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.sender !== undefined) updateData.sender = validatedData.sender
    if (validatedData.category !== undefined) updateData.category = validatedData.category
    if (validatedData.date !== undefined) updateData.date = new Date(validatedData.date)

    const income = await prisma.income.update({
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
        action: 'INCOME_UPDATED',
        entityType: 'Income',
        entityId: income.id,
        details: JSON.stringify({ 
          previousData: {
            amount: existingIncome.amount,
            category: existingIncome.category,
            sender: existingIncome.sender
          },
          newData: {
            amount: income.amount,
            category: income.category,
            sender: income.sender
          }
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ income })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating income:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete income record (Director only)
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
      return NextResponse.json({ error: 'Only directors can delete income' }, { status: 403 })
    }

    // Check if income exists
    const existingIncome = await prisma.income.findUnique({
      where: { id: params.id }
    })

    if (!existingIncome) {
      return NextResponse.json({ error: 'Income record not found' }, { status: 404 })
    }

    // Delete the income record
    await prisma.income.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'INCOME_DELETED',
        entityType: 'Income',
        entityId: params.id,
        details: JSON.stringify({ 
          amount: existingIncome.amount,
          category: existingIncome.category,
          sender: existingIncome.sender,
          description: existingIncome.description
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ 
      message: 'Income record deleted successfully',
      id: params.id 
    })
  } catch (error) {
    console.error('Error deleting income:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
