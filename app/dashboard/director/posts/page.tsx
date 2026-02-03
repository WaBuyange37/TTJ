// Location: app/dashboard/director/posts/page.tsx
// Director reviews and edits posts from social workers

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Edit, Lock, Globe, Upload, X } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  isPublic: boolean
  editedByDirector: boolean
  author: { name: string; role: string }
  createdAt: string
}

export default function DirectorPostsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', images: [] as string[] })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (session?.user.role !== 'COUNTRY_DIRECTOR') router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      if (response.ok) {
        const data = await response.json()
        // Show only internal posts from social workers
        setPosts(data.posts.filter((p: Post) => !p.isPublic) || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (post: Post) => {
    setSelectedPost(post)
    setForm({ title: post.title, content: post.content, images: post.images })
    setEditDialogOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setForm(prev => ({ ...prev, images: [...prev.images, ...data.urls] }))
        toast({ title: 'Success!', description: 'Images uploaded' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const handleSave = async () => {
    if (!selectedPost) return

    setSaving(true)
    try {
      const response = await fetch(`/api/posts/${selectedPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          images: form.images,
          editedByDirector: true,
        }),
      })

      if (response.ok) {
        toast({ title: 'Success!', description: 'Post updated' })
        setEditDialogOpen(false)
        fetchPosts()
      } else {
        toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Team Posts</h1>
        <p className="text-gray-600 mt-1">Edit and improve posts from social workers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posts to Review</CardTitle>
          <CardDescription>These posts are awaiting your review before being sent to founders</CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No posts to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Internal</Badge>
                      {post.editedByDirector && <Badge variant="secondary">✓ You reviewed this</Badge>}
                    </div>
                    <Button size="sm" onClick={() => openEditDialog(post)}>
                      <Edit className="h-4 w-4 mr-2" />Edit
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
                        <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-sm">
                          +{post.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-500 pt-3 border-t">
                    Posted by {post.author.name} on {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>Review and improve this post before it goes to the founder</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} />
            </div>

            <div className="space-y-2">
              <Label>Images</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label htmlFor="edit-image-upload" className="cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Add more images'}</p>
                </label>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded border overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}