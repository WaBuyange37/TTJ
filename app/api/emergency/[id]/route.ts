import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const approveSchema = z.object({
  action: z.enum(['approve', 'reject', 'complete']),
  notes: z.string().optional(),
  signature: z.string().optional(),
})

const updateRequestSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(10).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  location: z.string().min(3).optional(),
  supportingDocument: z.string().url().optional().nullable(),
})

// GET - Get single emergency request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const request = await prisma.emergencyRequest.findUnique({
      where: { id: params.id },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Social workers can only see their own requests
    if (session.user.role === 'SOCIAL_WORKER' && request.requestedById !== session.user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json({ request })
  } catch (error) {
    console.error('Error fetching request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = params.id
    const body = await req.json()

    const request = await prisma.emergencyRequest.findUnique({
      where: { id: requestId }
    })

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const role = session.user.role

    // SOCIAL WORKER UPDATE: Can only edit their own requests that are still pending director review
    if (role === 'SOCIAL_WORKER') {
      if (request.requestedById !== session.user.id) {
        return NextResponse.json({ error: 'You can only edit your own requests' }, { status: 403 })
      }

      if (request.status !== 'PENDING_DIRECTOR') {
        return NextResponse.json({ 
          error: 'Cannot edit request after it has been reviewed',
          currentStatus: request.status 
        }, { status: 400 })
      }

      const validatedData = updateRequestSchema.parse(body)
      
      // Prepare update data for social worker
      const updateData: any = {}
      if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
      if (validatedData.reason !== undefined) updateData.reason = validatedData.reason
      if (validatedData.urgency !== undefined) updateData.urgency = validatedData.urgency
      if (validatedData.location !== undefined) updateData.location = validatedData.location
      if (validatedData.supportingDocument !== undefined) updateData.supportingDocument = validatedData.supportingDocument

      const updatedRequest = await prisma.emergencyRequest.update({
        where: { id: requestId },
        data: updateData,
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'EMERGENCY_REQUEST_UPDATED',
          entityType: 'EmergencyRequest',
          entityId: requestId,
          details: JSON.stringify({ 
            updatedFields: Object.keys(updateData),
            previousAmount: request.amount,
            newAmount: updatedRequest.amount
          }),
          performedById: session.user.id,
        }
      })

      return NextResponse.json({ request: updatedRequest })
    }

    // DIRECTOR/FOUNDER APPROVAL WORKFLOW
    const { action, notes, signature } = approveSchema.parse(body)
    let updateData: any = {}
    let auditAction = ''

    // Director actions
    if (role === 'COUNTRY_DIRECTOR') {
      if (action === 'approve' && request.status === 'PENDING_DIRECTOR') {
        updateData = {
          status: 'PENDING_FOUNDERS',
          directorReviewedAt: new Date(),
          directorReviewedBy: session.user.id,
          directorNotes: notes,
        }
        auditAction = 'DIRECTOR_APPROVED'
      } else if (action === 'reject' && request.status === 'PENDING_DIRECTOR') {
        updateData = {
          status: 'REJECTED_BY_DIRECTOR',
          directorReviewedAt: new Date(),
          directorReviewedBy: session.user.id,
          directorNotes: notes,
        }
        auditAction = 'DIRECTOR_REJECTED'
      } else if (action === 'complete' && request.status === 'APPROVED_BY_FOUNDERS') {
        updateData = {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: session.user.id,
          completionNotes: notes,
          directorSignature: signature || session.user.name,
        }
        auditAction = 'DIRECTOR_COMPLETED'
      } else {
        return NextResponse.json({ error: 'Invalid action for current status' }, { status: 400 })
      }
    }
    // Founder actions
    else if (role === 'FOUNDER') {
      if (action === 'approve' && request.status === 'PENDING_FOUNDERS') {
        updateData = {
          status: 'APPROVED_BY_FOUNDERS',
          founderReviewedAt: new Date(),
          founderReviewedBy: session.user.id,
          founderNotes: notes,
        }
        auditAction = 'FOUNDER_APPROVED'
      } else if (action === 'reject' && request.status === 'PENDING_FOUNDERS') {
        updateData = {
          status: 'REJECTED_BY_FOUNDERS',
          founderReviewedAt: new Date(),
          founderReviewedBy: session.user.id,
          founderNotes: notes,
        }
        auditAction = 'FOUNDER_REJECTED'
      } else {
        return NextResponse.json({ error: 'Invalid action for current status' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update request
    const updatedRequest = await prisma.emergencyRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: auditAction,
        entityType: 'EmergencyRequest',
        entityId: requestId,
        details: JSON.stringify({ 
          previousStatus: request.status, 
          newStatus: updatedRequest.status,
          notes 
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ request: updatedRequest })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete emergency request (Social worker can delete their own pending requests)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const request = await prisma.emergencyRequest.findUnique({
      where: { id: params.id }
    })

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Social workers can only delete their own requests that are still pending
    if (session.user.role === 'SOCIAL_WORKER') {
      if (request.requestedById !== session.user.id) {
        return NextResponse.json({ error: 'You can only delete your own requests' }, { status: 403 })
      }

      if (request.status !== 'PENDING_DIRECTOR') {
        return NextResponse.json({ 
          error: 'Cannot delete request after it has been reviewed',
          currentStatus: request.status 
        }, { status: 400 })
      }
    } else if (session.user.role !== 'COUNTRY_DIRECTOR' && session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the request
    await prisma.emergencyRequest.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EMERGENCY_REQUEST_DELETED',
        entityType: 'EmergencyRequest',
        entityId: params.id,
        details: JSON.stringify({ 
          amount: request.amount,
          urgency: request.urgency,
          status: request.status,
          reason: request.reason
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ 
      message: 'Emergency request deleted successfully',
      id: params.id 
    })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

