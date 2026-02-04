// Location: app/api/public/posts/[id]/route.ts
// Public API for individual post

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch public post by ID
    const post = await prisma.post.findFirst({
      where: { 
        id,
        isPublic: true 
      },
      include: { 
        author: { 
          select: { 
            name: true, 
            role: true 
          } 
        } 
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}
