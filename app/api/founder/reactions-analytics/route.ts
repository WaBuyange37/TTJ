// Location: app/api/founder/reactions-analytics/route.ts
// API for Founders to see post reaction analytics

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

    // Only Founders can view reaction analytics
    if (session.user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get top posts by reactions
    const topPosts = await prisma.postReaction.groupBy({
      by: ['postId'],
      _count: { reaction: true },
      orderBy: { _count: { reaction: 'desc' } },
      take: 10
    })

    // Get post details for top posts
    const postIds = topPosts.map(item => item.postId)
    const postsDetails = await prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        author: { select: { name: true, role: true } }
      }
    })

    // Combine reaction counts with post details
    const postsWithReactions = topPosts.map(item => {
      const post = postsDetails.find(p => p.id === item.postId)
      return {
        postId: item.postId,
        title: post?.title || 'Unknown Post',
        author: post?.author?.name || 'Unknown',
        category: post?.category || 'unknown',
        isPublic: post?.isPublic || false,
        totalReactions: item._count.reaction,
        createdAt: post?.createdAt
      }
    })

    // Get reaction type distribution
    const reactionTypes = await prisma.postReaction.groupBy({
      by: ['reaction'],
      _count: { reaction: true },
      orderBy: { _count: { reaction: 'desc' } }
    })

    // Get daily reaction trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyTrends = await prisma.postReaction.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { reaction: true },
      orderBy: { createdAt: 'asc' }
    })

    // Get category performance
    const categoryPerformance = await prisma.$queryRaw`
      SELECT 
        p.category,
        COUNT(pr.id) as total_reactions,
        COUNT(DISTINCT pr.id) as unique_posts_with_reactions
      FROM posts p
      LEFT JOIN post_reactions pr ON p.id = pr.postId
      WHERE p.isPublic = true
      GROUP BY p.category
      ORDER BY total_reactions DESC
    `

    return NextResponse.json({
      topPosts: postsWithReactions,
      reactionTypes,
      dailyTrends,
      categoryPerformance,
      summary: {
        totalReactions: reactionTypes.reduce((sum, item) => sum + item._count.reaction, 0),
        totalPosts: postsWithReactions.length,
        averageReactionsPerPost: postsWithReactions.length > 0 
          ? Math.round(reactionTypes.reduce((sum, item) => sum + item._count.reaction, 0) / postsWithReactions.length)
          : 0
      }
    })

  } catch (error) {
    console.error('Error fetching reaction analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
