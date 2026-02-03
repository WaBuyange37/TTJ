// Location: app/dashboard/social-worker/posts/page.tsx
// Social worker creates and manages their posts (internal updates)

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Lock, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  isPublic: boolean
  editedByDirector: boolean
  editedByFounder: boolean
  author: { name: string }
  createdAt: string
}

export default function SocialWorkerPostsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (session?.user.role !== 'SOCIAL_WORKER') router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return

    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (response.ok) fetchPosts()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Posts</h1>
          <p className="text-gray-600 mt-1">View and manage your field updates</p>
        </div>
        <Link href="/dashboard/social-worker/updates">
          <Button>Create New Post</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Your Posts</CardTitle>
          <CardDescription>Track how your posts are being used</CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No posts yet</p>
              <Link href="/dashboard/social-worker/updates">
                <Button>Create Your First Post</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      {post.isPublic ? (
                        <Badge className="bg-green-600 text-white">✓ Published to Public Website</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          <Lock className="h-3 w-3 mr-1" />Internal Only
                        </Badge>
                      )}
                      {post.editedByDirector && <Badge variant="secondary">Reviewed by Director</Badge>}
                      {post.editedByFounder && <Badge variant="secondary">Enhanced by Founder</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                  <p className="text-gray-700 mb-3 line-clamp-2">{post.content}</p>

                  {post.images && post.images.length > 0 && (
                    <div className="flex space-x-2 mb-3">
                      {post.images.slice(0, 4).map((url, idx) => (
                        <div key={idx} className="w-16 h-16 rounded border overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {post.images.length > 4 && (
                        <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                          +{post.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
                    <span>Posted {new Date(post.createdAt).toLocaleDateString()}</span>
                    {post.isPublic && (
                      <a href="/" target="_blank" className="text-blue-600 hover:underline">
                        View on Public Site →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">📝 Post Workflow</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>1. You create</strong> field updates with stories and photos</p>
            <p><strong>2. Director reviews</strong> and can edit for clarity or add context</p>
            <p><strong>3. Founder enhances</strong> the post and decides if it goes public</p>
            <p><strong>4. Public posts</strong> appear on the website for donors to see!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}