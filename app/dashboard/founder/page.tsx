'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

export default function FounderDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    completedRequests: 0,
    socialWorkerExpenses: 0,
    totalPosts: 0,
    publicPosts: 0,
    girlsHelped: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [socialWorkerUpdates, setSocialWorkerUpdates] = useState<any[]>([])
  const [reactionAnalytics, setReactionAnalytics] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'FOUNDER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [budgetRes, requestsRes, expensesRes, postsRes, girlsRes] = await Promise.all([
        fetch('/api/budget'),
        fetch('/api/emergency'),
        fetch('/api/director/social-worker-expenses'),
        fetch('/api/posts'),
        fetch('/api/public/posts')
      ])

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setStats(prev => ({
          ...prev,
          totalIncome: budgetData.totalIncome || 0,
          totalExpenses: budgetData.totalExpenses || 0,
          balance: budgetData.available || 0
        }))
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        const requests = requestsData.requests || []
        setStats(prev => ({
          ...prev,
          pendingRequests: requests.filter((r: any) => r.status === 'PENDING_FOUNDERS').length,
          approvedRequests: requests.filter((r: any) => r.status === 'APPROVED_BY_FOUNDERS').length,
          completedRequests: requests.filter((r: any) => r.status === 'COMPLETED').length,
        }))
      }

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        const expenses = expensesData.expenses || []
        const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0)
        setStats(prev => ({
          ...prev,
          socialWorkerExpenses: totalExpenses
        }))
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json()
        const posts = postsData.posts || []
        setStats(prev => ({
          ...prev,
          totalPosts: posts.length
        }))

        // Filter social worker posts for the updates section
        const socialWorkerPosts = posts.filter((post: any) =>
          post.author?.role === 'SOCIAL_WORKER'
        ).slice(0, 5)
        setSocialWorkerUpdates(socialWorkerPosts)
      }

      if (girlsRes.ok) {
        const girlsData = await girlsRes.json()
        const posts = girlsData.posts || []
        setStats(prev => ({
          ...prev,
          publicPosts: posts.filter((p: any) => p.category === 'girls_updates').length,
          girlsHelped: 50 // This would come from your actual girls database
        }))
      }

      // Fetch recent activity (audit logs)
      const auditRes = await fetch('/api/audit-logs')
      if (auditRes.ok) {
        const auditData = await auditRes.json()
        setRecentActivity(auditData.logs?.slice(0, 5) || [])
      }

      // Fetch reaction analytics
      const reactionsRes = await fetch('/api/founder/reactions-analytics')
      if (reactionsRes.ok) {
        const reactionsData = await reactionsRes.json()
        setReactionAnalytics(reactionsData)
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Founder Dashboard</h1>
        <p className="text-gray-600">Overview of NGO operations and impact</p>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.balance)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Girls Helped</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.girlsHelped}+</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Social Worker Expenses</p>
                <p className="text-2xl font-bold text-cyan-600 mt-1">{formatCurrency(stats.socialWorkerExpenses)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalPosts}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Public Stories</p>
                <p className="text-2xl font-bold text-pink-600 mt-1">{stats.publicPosts}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved (Awaiting Payment)</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.approvedRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Worker Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Social Worker Updates</CardTitle>
          <CardDescription>Latest field reports and updates from social workers</CardDescription>
        </CardHeader>
        <CardContent>
          {socialWorkerUpdates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No social worker updates yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {socialWorkerUpdates.map((update) => (
                <div key={update.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          Social Worker
                        </span>
                        {update.isPublic ? (
                          <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                            Public
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            Internal
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(update.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{update.title}</h3>
                      <p className="text-gray-600 line-clamp-2 mb-2">{update.content}</p>

                      {update.images && update.images.length > 0 && (
                        <div className="flex space-x-2 mb-2">
                          {update.images.slice(0, 3).map((url: string, idx: number) => (
                            <div key={idx} className="w-16 h-16 rounded border overflow-hidden">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {update.images.length > 3 && (
                            <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                              +{update.images.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {update.editedByDirector && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Director Reviewed
                        </span>
                      )}
                      {update.editedByFounder && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Founder Enhanced
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
                    <span>By {update.author?.name}</span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        View Details
                      </Button>
                      {update.editedByDirector && !update.editedByFounder && (
                        <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                          Enhance Story
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {socialWorkerUpdates.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Link href="/dashboard/founder/updates">
                <Button variant="outline" className="w-full">
                  View All Social Worker Updates
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions across the organization</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action?.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reaction Analytics */}
      {reactionAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Public Engagement Analytics</CardTitle>
            <CardDescription>See which stories resonate most with supporters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Top Performing Posts */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Top Stories</h3>
                <div className="space-y-2">
                  {reactionAnalytics.topPosts.slice(0, 5).map((post: any, index: number) => (
                    <div key={post.postId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{post.title}</p>
                        <p className="text-xs text-gray-600">
                          {post.category.replace('_', ' ')} • By {post.author}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-pink-600">{post.totalReactions}</p>
                        <p className="text-xs text-gray-600">reactions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reaction Types */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Popular Reactions</h3>
                <div className="space-y-2">
                  {reactionAnalytics.reactionTypes.map((type: any) => (
                    <div key={type.reaction} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="capitalize font-medium">{type.reaction}</span>
                      <span className="font-bold text-lg text-blue-600">{type._count.reaction}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="mt-3 pt-3 border-t">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{reactionAnalytics.summary.totalReactions}</p>
                  <p className="text-sm text-gray-600">Total Reactions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{reactionAnalytics.summary.totalPosts}</p>
                  <p className="text-sm text-gray-600">Posts with Reactions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{reactionAnalytics.summary.averageReactionsPerPost}</p>
                  <p className="text-sm text-gray-600">Avg. per Post</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button variant="outline" className="w-full">
                View Detailed Analytics Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and oversight</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Link href="/dashboard/founder/requests">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="default">
                <AlertCircle className="h-8 w-8" />
                <span className="font-semibold">Review Requests</span>
                {stats.pendingRequests > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    {stats.pendingRequests} pending
                  </span>
                )}
              </Button>
            </Link>

            <Link href="/dashboard/founder/budget">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <DollarSign className="h-8 w-8" />
                <span className="font-semibold">View Budget</span>
              </Button>
            </Link>

            <Link href="/dashboard/founder/updates">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <FileText className="h-8 w-8" />
                <span className="font-semibold">Manage Posts</span>
              </Button>
            </Link>

            <Link href="/dashboard/founder/reports">
              <Button className="w-full h-auto py-6 flex-col space-y-2" variant="outline">
                <TrendingUp className="h-8 w-8" />
                <span className="font-semibold">Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Alert */}
      {stats.pendingRequests > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  {stats.pendingRequests} Request{stats.pendingRequests > 1 ? 's' : ''} Awaiting Your Approval
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Emergency requests have been reviewed by the director and are waiting for final founder approval.
                </p>
                <Link href="/dashboard/founder/requests">
                  <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                    Review Now
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}