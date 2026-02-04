import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test if we can access the PostReaction model
    const count = await prisma.postReaction.count()
    return NextResponse.json({ count, message: 'PostReaction model working' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Test creating a reaction
    const reaction = await prisma.postReaction.create({
      data: {
        postId: 'test-post-id',
        reaction: 'heart',
        ipAddress: '127.0.0.1'
      }
    })
    return NextResponse.json({ reaction, message: 'Reaction created successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
