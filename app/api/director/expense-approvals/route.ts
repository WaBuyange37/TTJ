// Location: app/api/director/expense-approvals/route.ts
// API for Directors to review and approve social worker expenses

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Directors can view expense approvals
    if (session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all expenses with social worker info
    const expenses = await prisma.socialWorkerExpense.findMany({
      include: {
        addedBy: {
          select: {
            name: true,
            email: true
          }
        },
        reviewedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats
    const stats = {
      pendingCount: expenses.filter(e => e.status === 'PENDING').length,
      approvedCount: expenses.filter(e => e.status === 'APPROVED').length,
      rejectedCount: expenses.filter(e => e.status === 'REJECTED').length,
      totalPendingAmount: expenses
        .filter(e => e.status === 'PENDING')
        .reduce((sum, e) => sum + e.amount, 0),
      totalApprovedAmount: expenses
        .filter(e => e.status === 'APPROVED')
        .reduce((sum, e) => sum + e.amount, 0)
    }

    return NextResponse.json({ expenses, stats })

  } catch (error) {
    console.error('Error fetching expense approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
