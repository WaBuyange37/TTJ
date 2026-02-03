// Location: app/api/public/posts/route.ts
// Public API - returns only posts marked as public

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Fetch public posts
    const posts = await prisma.post.findMany({
      where: { isPublic: true },
      include: { author: { select: { name: true, role: true } } },
    })

    // Fetch published girls entries (featured on homepage)
    const girls = await prisma.girl.findMany({
      where: { published: true },
      include: { author: { select: { name: true, role: true } } },
    })

    // Normalize and merge results so the front page can show a single list
    const normalizedGirls = girls.map(g => ({
      id: g.id,
      title: g.title,
      content: g.content,
      images: g.images || [],
      author: g.author,
      createdAt: g.createdAt,
      category: 'girls_updates',
    }))

    const merged = [...posts, ...normalizedGirls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ posts: merged })
  } catch (error) {
    console.error('Error fetching public posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
