'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Upload, X, Image as ImageIcon } from 'lucide-react'

export default function SocialWorkerUpdatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [form, setForm] = useState({
    title: '',
    content: '',
    images: [] as string[]
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'SOCIAL_WORKER') {
      router.push('/dashboard')
    }
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
      console.error('Error fetching posts:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    const maxSize = 5 * 1024 * 1024 // 5MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Only JPEG, PNG, and PDF files are allowed',
          variant: 'destructive',
        })
        continue
      }

      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 5MB',
          variant: 'destructive',
        })
        continue
      }

      setUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          setForm(prev => ({
            ...prev,
            images: [...prev.images, data.url]
          }))
          toast({
            title: 'Success',
            description: 'File uploaded successfully',
          })
        } else {
          throw new Error('Upload failed')
        }
      } catch (error) {
        toast({
          title: 'Upload failed',
          description: 'Failed to upload file. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
      }
    }

    // Reset input
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title || form.title.length < 5) {
      toast({
        title: 'Error',
        description: 'Please enter a title (at least 5 characters)',
        variant: 'destructive',
      })
      return
    }

    if (!form.content || form.content.length < 10) {
      toast({
        title: 'Error',
        description: 'Please enter content (at least 10 characters)',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          images: form.images
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Update posted successfully',
        })
        setForm({ title: '', content: '', images: [] })
        fetchPosts()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to post update',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Post Updates</h1>
        <p className="text-gray-600 mt-1">Share news and progress with the team</p>
      </div>

      {/* Post Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
          <CardDescription>
            Share updates about the program, success stories, or important news
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Monthly Progress Update - December 2024"
                required
                minLength={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                placeholder="Share details about recent activities, achievements, challenges, or important updates..."
                required
                minLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Images & Documents (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {uploading ? 'Uploading...' : 'Click to upload files'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, or PDF (max 5MB each)
                  </p>
                </label>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {form.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg border bg-gray-100 flex items-center justify-center overflow-hidden">
                        {url.endsWith('.pdf') ? (
                          <FileText className="h-12 w-12 text-gray-400" />
                        ) : (
                          <img src={url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ title: '', content: '', images: [] })}
              >
                Clear
              </Button>
              <Button type="submit" disabled={submitting || uploading}>
                {submitting ? 'Posting...' : 'Post Update'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
          <CardDescription>Your previously shared updates</CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No posts yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first post above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {post.images.map((url: string, idx: number) => (
                        <div key={idx} className="aspect-square rounded border overflow-hidden">
                          {url.endsWith('.pdf') ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Posted on {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}