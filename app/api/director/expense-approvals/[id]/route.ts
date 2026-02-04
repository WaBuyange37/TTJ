import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { status, notes } = body

    // Get the expense with items before updating
    const expense = await prisma.socialWorkerExpense.findUnique({
      where: { id },
      include: {
        expenseItems: true,
        addedBy: { select: { name: true, email: true } }
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Update expense with review
    const updatedExpense = await prisma.socialWorkerExpense.update({
      where: { id },
      data: {
        status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: notes
      },
      include: {
        addedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        expenseItems: true
      }
    })

    // If approved, create corresponding expense records for each item
    if (status === 'APPROVED') {
      // Create individual expense records for each item
      for (const item of expense.expenseItems) {
        await prisma.expense.create({
          data: {
            amount: item.amount,
            date: expense.date,
            category: item.category,
            description: `Approved social worker expense: ${item.description} (From: ${expense.description})`,
            addedById: session.user.id
          }
        })
      }

      // Create audit log for approval
      await prisma.auditLog.create({
        data: {
          action: 'SOCIAL_WORKER_EXPENSE_APPROVED',
          entityType: 'SocialWorkerExpense',
          entityId: expense.id,
          details: JSON.stringify({
            totalAmount: expense.amount,
            itemCount: expense.expenseItems.length,
            approvedBy: session.user.name,
            items: expense.expenseItems.map(item => ({
              description: item.description,
              amount: item.amount,
              category: item.category
            }))
          }),
          performedById: session.user.id,
        }
      })
    } else if (status === 'REJECTED') {
      // Create audit log for rejection
      await prisma.auditLog.create({
        data: {
          action: 'SOCIAL_WORKER_EXPENSE_REJECTED',
          entityType: 'SocialWorkerExpense',
          entityId: expense.id,
          details: JSON.stringify({
            totalAmount: expense.amount,
            itemCount: expense.expenseItems.length,
            rejectedBy: session.user.name,
            reason: notes || 'No reason provided'
          }),
          performedById: session.user.id,
        }
      })
    }

    return NextResponse.json({ expense: updatedExpense })

  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
