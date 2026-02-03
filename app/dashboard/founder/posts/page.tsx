// Location: app/dashboard/founder/posts/page.tsx
// Founder enhances posts and publishes to public website

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Edit, Lock, Globe, Upload, X, Eye } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  category: string
  isPublic: boolean
  editedByDirector: boolean
  editedByFounder: boolean
  author: { name: string; role: string }
  createdAt: string
}

export default function FounderPostsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ 
    title: '', 
    content: '', 
    images: [] as string[], 
    category: 'girls_updates',
    isPublic: false 
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (session?.user.role !== 'FOUNDER') router.push('/dashboard')
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

  const openEditDialog = (post: Post) => {
    setSelectedPost(post)
    setForm({ 
      title: post.title, 
      content: post.content, 
      images: post.images,
      category: post.category || 'girls_updates',
      isPublic: post.isPublic 
    })
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
          category: form.category,
          isPublic: form.isPublic,
          editedByFounder: true,
        }),
      })

      if (response.ok) {
        toast({ 
          title: 'Success!', 
          description: form.isPublic ? 'Post published to website!' : 'Post updated' 
        })
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

  const internalPosts = posts.filter(p => !p.isPublic)
  const publicPosts = posts.filter(p => p.isPublic)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Posts</h1>
          <p className="text-gray-600 mt-1">Enhance posts and publish to public website</p>
        </div>
        <a href="/" target="_blank">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />View Public Site
          </Button>
        </a>
      </div>

      {/* Internal Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Posts to Review ({internalPosts.length})</CardTitle>
          <CardDescription>Enhance these posts and publish them to the public website</CardDescription>
        </CardHeader>
        <CardContent>
          {internalPosts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No posts to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {internalPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 hover:border-blue-500 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Internal</Badge>
                      {post.editedByDirector && <Badge variant="secondary">✓ Reviewed by Director</Badge>}
                      {post.editedByFounder && <Badge className="bg-purple-600">✓ You enhanced this</Badge>}
                    </div>
                    <Button size="sm" onClick={() => openEditDialog(post)}>
                      <Edit className="h-4 w-4 mr-2" />Enhance & Publish
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
                    </div>
                  )}

                  <div className="text-sm text-gray-500 pt-3 border-t">
                    Posted by {post.author.name} • {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Published Posts ({publicPosts.length})</CardTitle>
          <CardDescription>These posts are live on the public website</CardDescription>
        </CardHeader>
        <CardContent>
          {publicPosts.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No published posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicPosts.map((post) => (
                <div key={post.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-green-600"><Globe className="h-3 w-3 mr-1" />Live on Website</Badge>
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(post)}>
                      <Edit className="h-4 w-4" />
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
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-green-200">
                    <span>By {post.author.name}</span>
                    <a href="/" target="_blank" className="text-green-700 hover:underline">
                      View on site →
                    </a>
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
            <DialogTitle>Enhance Post</DialogTitle>
            <DialogDescription>Add your touch and decide if this should be public</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success_stories">Success Stories</SelectItem>
                  <SelectItem value="girls_updates">Girls & Babies Updates</SelectItem>
                  <SelectItem value="mission">Our Mission</SelectItem>
                  <SelectItem value="thank_you">Thank You Donors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Add More Images</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="founder-image-upload"
                />
                <label htmlFor="founder-image-upload" className="cursor-pointer">
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

            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-blue-50">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="w-5 h-5 text-blue-600"
              />
              <label htmlFor="isPublic" className="flex-1 cursor-pointer">
                <div className="font-semibold text-blue-900">Publish to Public Website</div>
                <div className="text-sm text-blue-700">Make this story visible to donors and visitors</div>
              </label>
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className={form.isPublic ? 'bg-green-600 hover:bg-green-700' : ''}>
              {saving ? 'Saving...' : form.isPublic ? '✓ Publish to Website' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}