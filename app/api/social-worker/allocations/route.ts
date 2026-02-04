import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Show social worker their allocated funds (without showing total balance)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Only social workers can access this endpoint' }, { status: 403 })
    }

    // Get funds allocated to this social worker
    const allocations = await prisma.income.findMany({
      where: { allocatedTo: session.user.id },
      include: {
        addedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Calculate total allocated funds
    const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.amount, 0)

    // Get their expenses to calculate remaining
    const expenses = await prisma.socialWorkerExpense.findMany({
      where: { addedById: session.user.id },
      select: { amount: true, allocatedFrom: true }
    })

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const remainingFunds = totalAllocated - totalExpenses

    return NextResponse.json({
      allocations,
      stats: {
        totalAllocated,
        totalExpenses,
        remainingFunds,
        allocationCount: allocations.length
      }
    })
  } catch (error) {
    console.error('Error fetching social worker allocations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
