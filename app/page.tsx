// Location: app/page.tsx
// Public home page showing mission updates and success stories

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, ArrowRight, Calendar, Users, Home as HomeIcon, MessageCircle, Hand, HelpCircle, Church } from 'lucide-react'

interface PublicPost {
  id: string
  title: string
  content: string
  images: string[]
  author: { name: string; role: string }
  createdAt: string
  category: string
}

interface PostReactions {
  reactions: Record<string, number>
  total: number
}

export default function HomePage() {
  const [posts, setPosts] = useState<PublicPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [reactions, setReactions] = useState<Record<string, PostReactions>>({})
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/public/posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])

        // Fetch reactions for each post
        data.posts?.forEach(async (post: PublicPost) => {
          await fetchPostReactions(post.id)
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPostReactions = async (postId: string) => {
    try {
      const response = await fetch(`/api/public/posts/${postId}/reactions`)
      if (response.ok) {
        const data = await response.json()
        setReactions(prev => ({ ...prev, [postId]: data }))
      }
    } catch (error) {
      console.error('Error fetching reactions:', error)
    }
  }

  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      const response = await fetch(`/api/public/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: reactionType })
      })

      if (response.ok) {
        // Update user reaction
        setUserReactions(prev => ({ ...prev, [postId]: reactionType }))

        // Refetch reactions for this post
        await fetchPostReactions(postId)
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const ReactionButtons = ({ postId }: { postId: string }) => {
    const postReactions = reactions[postId]
    const userReaction = userReactions[postId]

    const reactionTypes = [
      { type: 'heart', icon: Heart, label: 'Love', color: 'text-red-500' },
      { type: 'pray', icon: Hand, label: 'Pray', color: 'text-purple-500' },
      { type: 'support', icon: HelpCircle, label: 'Support', color: 'text-blue-500' },
      { type: 'amen', icon: Church, label: 'Amen', color: 'text-green-500' }
    ]

    return (
      <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
        {reactionTypes.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => handleReaction(postId, type)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-all ${userReaction === type
              ? `${color} bg-current/10 border-current border`
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Icon className="h-4 w-4" />
            <span>{postReactions?.reactions?.[type] || 0}</span>
          </button>
        ))}
        <div className="ml-auto text-sm text-gray-500">
          {postReactions?.total || 0} reactions
        </div>
      </div>
    )
  }

  const categories = ['all', 'success_stories', 'girls_updates', 'mission', 'thank_you']
  const categoryLabels: Record<string, string> = {
    all: 'All Updates',
    success_stories: 'Success Stories',
    girls_updates: 'Girls & Babies',
    mission: 'Our Mission',
    thank_you: 'Thank You Donors'
  }

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(p => p.category === selectedCategory)

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
            <Link href="/login">
              <Button>Staff Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Empowering Street Girls & Their Babies
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-pink-100">
            Providing shelter, education, and hope to vulnerable young mothers in Kigali, Rwanda
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 min-w-[150px]">
              <div className="text-3xl font-bold mb-2">{posts.length}+</div>
              <div className="text-sm text-pink-100">Updates Shared</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 min-w-[150px]">
              <div className="text-3xl font-bold mb-2">50+</div>
              <div className="text-sm text-pink-100">Girls Helped</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 min-w-[150px]">
              <div className="text-3xl font-bold mb-2">100%</div>
              <div className="text-sm text-pink-100">Transparency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Mission Statement */}
        <section className="mb-16">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-none shadow-lg">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Our Mission</h3>
              <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto leading-relaxed">
                We rescue street girls who have been abandoned or abused, providing them and their babies with
                safe shelter, nutritious food, medical care, education, and vocational training. Our goal is to
                restore their dignity, rebuild their confidence, and equip them with skills to create independent,
                successful futures.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full font-medium transition ${selectedCategory === cat
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Updates Yet</h3>
            <p className="text-gray-600">Check back soon for inspiring stories from our community!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured Post - First post */}
            {filteredPosts.length > 0 && (
              <article className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                {filteredPosts[0].images && filteredPosts[0].images.length > 0 && (
                  <div className="aspect-video md:aspect-[16/9] overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                    <img
                      src={filteredPosts[0].images[0]}
                      alt={filteredPosts[0].title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-8 md:p-12">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-sm font-semibold text-pink-600 bg-pink-100 px-3 py-1 rounded-full">
                      {categoryLabels[filteredPosts[0].category] || filteredPosts[0].category}
                    </span>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(filteredPosts[0].createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    {filteredPosts[0].title}
                  </h1>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed line-clamp-3">
                    {filteredPosts[0].content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {filteredPosts[0].author.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{filteredPosts[0].author.name}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {filteredPosts[0].author.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Link href={`/updates/${filteredPosts[0].id}`}>
                      <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
                        Read Full Story <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <ReactionButtons postId={filteredPosts[0].id} />
              </article>
            )}

            {/* Remaining Posts Grid */}
            {filteredPosts.length > 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">More Stories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.slice(1).map((post) => (
                    <article key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {post.images && post.images.length > 0 && (
                        <div className="aspect-video overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xs font-semibold text-pink-600 bg-pink-100 px-2 py-1 rounded">
                            {categoryLabels[post.category] || post.category}
                          </span>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {post.author.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm text-gray-700 font-medium truncate">
                              {post.author.name}
                            </p>
                          </div>
                          <Link href={`/updates/${post.id}`}>
                            <Button variant="ghost" className="p-0 h-auto text-pink-600 hover:text-pink-700 hover:bg-pink-50">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <ReactionButtons postId={post.id} />
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        <section className="mt-20 mb-12">
          <Card className="bg-gradient-to-r from-pink-600 to-purple-600 border-none text-white">
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-6 fill-white" />
              <h3 className="text-3xl font-bold mb-4">Your Support Changes Lives</h3>
              <p className="text-xl mb-8 text-pink-100 max-w-2xl mx-auto">
                Every donation helps provide food, shelter, education, and hope to young mothers and their babies.
                See exactly how your contribution makes a difference through our transparent updates.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" variant="secondary" className="bg-white text-pink-600 hover:bg-pink-50">
                  Contact Us to Donate
                </Button>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Staff Portal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
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