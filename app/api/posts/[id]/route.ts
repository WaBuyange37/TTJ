// Location: app/api/posts/[id]/route.ts
// Update and delete individual posts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only author, director, or founder can edit
    const canEdit = post.authorId === session.user.id || 
                    ['COUNTRY_DIRECTOR', 'FOUNDER'].includes(session.user.role)
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { title, content, images, category, isPublic, editedByDirector, editedByFounder } = body

    const updated = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(images && { images }),
        ...(category && { category }),
        ...(typeof isPublic === 'boolean' && { isPublic }),
        ...(editedByDirector && { editedByDirector: true }),
        ...(editedByFounder && { editedByFounder: true }),
      },
      include: {
        author: {
          select: { name: true, role: true },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'POST_UPDATED',
        entityType: 'Post',
        entityId: params.id,
        details: JSON.stringify({ 
          title: updated.title, 
          isPublic: updated.isPublic,
          editedBy: session.user.role 
        }),
        performedById: session.user.id,
      },
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only author or admin can delete
    if (post.authorId !== session.user.id && !['COUNTRY_DIRECTOR', 'FOUNDER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await prisma.post.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'POST_DELETED',
        entityType: 'Post',
        entityId: params.id,
        details: JSON.stringify({ title: post.title }),
        performedById: session.user.id,
      },
    })

    return NextResponse.json({ message: 'Post deleted' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}