import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createRequestSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(10),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  location: z.string().min(3),
  supportingDocument: z.string().url().optional(),
})

// GET - List emergency requests (filtered by role)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    const userId = session.user.id

    let requests

    if (role === 'SOCIAL_WORKER') {
      // Social workers see only their own requests
      requests = await prisma.emergencyRequest.findMany({
        where: { requestedById: userId },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { requestedAt: 'desc' }
      })
    } else {
      // Founders and Directors see all requests
      requests = await prisma.emergencyRequest.findMany({
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { requestedAt: 'desc' }
      })
    }

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new emergency request (Social Worker only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Only social workers can create requests' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = createRequestSchema.parse(body)

    const request = await prisma.emergencyRequest.create({
      data: {
        ...validatedData,
        requestedById: session.user.id,
        status: 'PENDING_DIRECTOR'
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EMERGENCY_REQUEST_CREATED',
        entityType: 'EmergencyRequest',
        entityId: request.id,
        details: JSON.stringify({ amount: request.amount, urgency: request.urgency }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ request }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
