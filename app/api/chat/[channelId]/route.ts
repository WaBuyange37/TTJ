import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get messages for a channel
export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const channelId = params.channelId

    // Check if user is a participant
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (!channel.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Not a participant of this channel' }, { status: 403 })
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { channelId },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100 // Limit to last 100 messages
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Send a message to a channel
export async function POST(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const channelId = params.channelId
    const body = await req.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Check if user is a participant
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (!channel.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Not a participant of this channel' }, { status: 403 })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: session.user.id,
        channelId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    // Update channel's updatedAt
    await prisma.chatChannel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}