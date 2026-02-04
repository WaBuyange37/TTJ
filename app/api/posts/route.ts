import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10),
  images: z.array(z.string().url()).optional(),
})

// GET - List all posts (Directors and Founders can see, Social Workers see their own)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let posts

    if (session.user.role === 'SOCIAL_WORKER') {
      // Social workers see only their own posts
      posts = await prisma.post.findMany({
        where: { authorId: session.user.id },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Directors and Founders see all posts
      posts = await prisma.post.findMany({
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new post (Social Worker, Director, and Founder)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SOCIAL_WORKER' && session.user.role !== 'COUNTRY_DIRECTOR' && session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Only authorized staff can create posts' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = createPostSchema.parse(body)

    const post = await prisma.post.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        images: validatedData.images || [],
        authorId: session.user.id,
        published: true,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'POST_CREATED',
        entityType: 'Post',
        entityId: post.id,
        details: JSON.stringify({
          title: post.title,
          authorRole: session.user.role
        }),
        performedById: session.user.id,
      }
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}