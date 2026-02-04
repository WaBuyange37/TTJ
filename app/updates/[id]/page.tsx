// Location: app/updates/[id]/page.tsx
// Individual blog post page for public viewing

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, ArrowLeft, Calendar, User, Share2 } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  author: { name: string; role: string }
  createdAt: string
  category: string
}

export default function PostPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchPost()
    }
  }, [id])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/public/posts/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPost(data.post)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content.substring(0, 200) + '...',
          url: window.location.href,
        })
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const categoryLabels: Record<string, string> = {
    success_stories: 'Success Stories',
    girls_updates: 'Girls & Babies',
    mission: 'Our Mission',
    thank_you: 'Thank You Donors'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-pink-600 fill-pink-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Them To Jesus</h1>
                <p className="text-sm text-gray-600">Transforming Lives in Rwanda</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Link href="/">
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Featured Image */}
          {post.images && post.images.length > 0 && (
            <div className="aspect-video md:aspect-[16/9] overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
              <img
                src={post.images[0]}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Post Content */}
          <div className="p-8 md:p-12">
            {/* Meta Information */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-semibold text-pink-600 bg-pink-100 px-3 py-1 rounded-full">
                  {categoryLabels[post.category] || post.category}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(post.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Author Info */}
            <div className="flex items-center space-x-3 mb-8 pb-6 border-b">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {post.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{post.author.name}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {post.author.role.replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
            </div>

            {/* Image Gallery */}
            {post.images && post.images.length > 1 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Gallery</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {post.images.slice(1).map((image, index) => (
                    <div key={index} className="aspect-video rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`${post.title} - Image ${index + 2}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="mt-12 pt-8 border-t">
              <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-none">
                <CardContent className="p-8 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-pink-600 fill-pink-600" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Inspired to Help?</h3>
                  <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                    Your support helps us continue transforming the lives of street girls and their babies. 
                    Every contribution makes a real difference.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
                      Contact Us to Donate
                    </Button>
                    <Link href="/">
                      <Button variant="outline">
                        Read More Stories
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </article>

        {/* Related Stories */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">More Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* This would show related posts - for now showing a placeholder */}
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 mb-2">Discover More Stories</h3>
                <p className="text-gray-600 mb-4">
                  Explore more inspiring stories from our community
                </p>
                <Link href="/">
                  <Button variant="outline">View All Stories</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
                <span className="font-bold text-lg">Them To Jesus</span>
              </div>
              <p className="text-gray-400">
                Transforming lives of street girls and their babies in Kigali, Rwanda
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
                <li><Link href="/login" className="hover:text-white">Staff Login</Link></li>
                <li><a href="#mission" className="hover:text-white">Our Mission</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Location</h4>
              <p className="text-gray-400">
                Kigali, Rwanda<br />
                Serving street girls and their babies
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Them To Jesus NGO. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
