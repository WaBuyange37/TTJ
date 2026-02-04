// Location: app/api/public/posts/[id]/reactions/route.ts
// API for handling post reactions (public)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get all reactions for a post
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch reactions grouped by type
    const reactions = await prisma.postReaction.groupBy({
      by: ['reaction'],
      where: { postId: id },
      _count: { reaction: true }
    })

    // Format the response
    const reactionCounts = reactions.reduce((acc, item) => {
      acc[item.reaction] = item._count.reaction
      return acc
    }, {} as Record<string, number>)

    // Get total count
    const totalReactions = await prisma.postReaction.count({
      where: { postId: id }
    })

    return NextResponse.json({
      reactions: reactionCounts,
      total: totalReactions
    })

  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
  }
}

// POST - Add or update a reaction
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { reaction, userEmail } = body

    console.log('Reaction request:', { id, reaction, userEmail })

    // Validate reaction type
    const validReactions = ['heart', 'pray', 'support', 'amen']
    if (!validReactions.includes(reaction)) {
      console.log('Invalid reaction type:', reaction)
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 })
    }

    // Get client IP
    const ipAddress = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    console.log('Checking existing reaction for:', { postId: id, ipAddress })

    // Check if user already reacted
    const existingReaction = await prisma.postReaction.findFirst({
      where: {
        postId: id,
        OR: [
          { ipAddress },
          ...(userEmail ? [{ userEmail }] : [])
        ]
      }
    })

    console.log('Existing reaction:', existingReaction)

    if (existingReaction) {
      // Update existing reaction
      const updatedReaction = await prisma.postReaction.update({
        where: { id: existingReaction.id },
        data: { reaction }
      })

      console.log('Updated reaction:', updatedReaction)

      return NextResponse.json({
        message: 'Reaction updated',
        reaction: updatedReaction
      })
    } else {
      // Create new reaction
      const newReaction = await prisma.postReaction.create({
        data: {
          postId: id,
          reaction,
          ipAddress,
          userEmail: userEmail || null
        }
      })

      console.log('Created new reaction:', newReaction)

      return NextResponse.json({
        message: 'Reaction added',
        reaction: newReaction
      })
    }

  } catch (error) {
    console.error('Error adding reaction:', error)
    return NextResponse.json({
      error: 'Failed to add reaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Remove a reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get client IP
    const ipAddress = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    // Find and delete the reaction
    const deletedReaction = await prisma.postReaction.deleteMany({
      where: {
        postId: id,
        OR: [
          { ipAddress },
          { userEmail: req.headers.get('x-user-email') || undefined }
        ]
      }
    })

    if (deletedReaction.count === 0) {
      return NextResponse.json({ error: 'No reaction found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Reaction removed',
      deleted: deletedReaction.count
    })

  } catch (error) {
    console.error('Error removing reaction:', error)
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 })
  }
}
