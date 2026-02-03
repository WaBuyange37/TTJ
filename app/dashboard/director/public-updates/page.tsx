// Location: app/dashboard/director/public-updates/page.tsx
// Director creates public blog posts for donors and visitors

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
import { useToast } from '@/components/ui/use-toast'
import { Upload, X, FileText, Globe, Plus, Edit, Trash2 } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  category: string
  isPublic: boolean
  createdAt: string
}

export default function DirectorPublicUpdatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'mission',
    images: [] as string[]
  })

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
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
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
      } else {
        toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Error', description: 'Title and content required', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category,
          images: form.images,
          isPublic: true, // Always public for this page
        }),
      })

      if (response.ok) {
        toast({ title: 'Success!', description: 'Post published' })
        setForm({ title: '', content: '', category: 'mission', images: [] })
        fetchPosts()
      } else {
        toast({ title: 'Error', description: 'Failed to publish', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return

    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success!', description: 'Post deleted' })
        fetchPosts()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Public Updates</h1>
          <p className="text-gray-600 mt-1">Share stories with donors and supporters</p>
        </div>
        <a href="/" target="_blank">
          <Button variant="outline">
            <Globe className="h-4 w-4 mr-2" />View Public Site
          </Button>
        </a>
      </div>

      {/* Create Post Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Update</CardTitle>
          <CardDescription>Share inspiring stories about our girls and mission</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Meet Maria: From Streets to School"
                required
              />
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
              <Label>Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                placeholder="Tell the story... Share how lives are being transformed..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Images (up to 5)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading || form.images.length >= 5}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload images'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG (max 5MB each)</p>
                </label>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded border overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={creating} className="w-full" size="lg">
              {creating ? 'Publishing...' : <><Globe className="h-4 w-4 mr-2" />Publish Public Update</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Published Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Your Published Updates</CardTitle>
          <CardDescription>Posts visible on the public website</CardDescription>
        </CardHeader>
        <CardContent>
          {posts.filter(p => p.isPublic).length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No public posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.filter(p => p.isPublic).map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Globe className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Public</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{post.category.replace('_', ' ')}</span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                      <p className="text-gray-600 line-clamp-2 mb-2">{post.content}</p>
                      {post.images.length > 0 && (
                        <div className="flex space-x-2 mb-2">
                          {post.images.slice(0, 3).map((url, idx) => (
                            <div key={idx} className="w-16 h-16 rounded border overflow-hidden">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {post.images.length > 3 && (
                            <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                              +{post.images.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        Posted {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}