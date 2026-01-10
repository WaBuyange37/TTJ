import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List user's chat channels
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find channels where user is a participant
    const channels = await prisma.chatChannel.findMany({
      where: {
        participants: {
          has: session.user.id
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new channel (for admin use)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only directors and founders can create channels
    if (session.user.role === 'SOCIAL_WORKER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { name, isGroup, participantIds } = body

    const channel = await prisma.chatChannel.create({
      data: {
        name,
        isGroup: isGroup || false,
        participants: participantIds || [session.user.id],
      }
    })

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}