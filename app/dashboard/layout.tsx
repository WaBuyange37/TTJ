'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  DollarSign, 
  AlertCircle, 
  MessageSquare, 
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode

}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  const role = session.user.role

  // Define navigation based on role
  const getNavigation = () => {
    const baseNav = [
      { name: 'Dashboard', href: `/dashboard/${role.toLowerCase().replace('_', '-')}`, icon: LayoutDashboard },
    ]

    if (role === 'FOUNDER') {
      return [
        ...baseNav,
        { name: 'Budget Overview', href: '/dashboard/founder/budget', icon: DollarSign },
        { name: 'Emergency Requests', href: '/dashboard/founder/requests', icon: AlertCircle },
        { name: 'Reports', href: '/dashboard/founder/reports', icon: TrendingUp },
        { name: 'Updates', href: '/dashboard/founder/updates', icon: FileText },
        { name: 'Messages', href: '/dashboard/founder/messages', icon: MessageSquare },
      ]
    } else if (role === 'COUNTRY_DIRECTOR') {
      return [
        ...baseNav,
        { name: 'Budget Management', href: '/dashboard/director/budget', icon: DollarSign },
        { name: 'Income', href: '/dashboard/director/income', icon: TrendingUp },
        { name: 'Expenses', href: '/dashboard/director/expenses', icon: Receipt },
        { name: 'Emergency Requests', href: '/dashboard/director/requests', icon: AlertCircle },
        { name: 'Reports', href: '/dashboard/director/reports', icon: FileText },
        { name: 'Messages', href: '/dashboard/director/messages', icon: MessageSquare },
      ]
    } else if (role === 'SOCIAL_WORKER') {
      return [
        ...baseNav,
        { name: 'My Requests', href: '/dashboard/social-worker/requests', icon: AlertCircle },
        { name: 'Post Updates', href: '/dashboard/social-worker/updates', icon: FileText },
        { name: 'Messages', href: '/dashboard/social-worker/messages', icon: MessageSquare },
      ]
    }

    return baseNav
  }

  const navigation = getNavigation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex lg:flex-col
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              TTJ
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Them to Jesus</h1>
              <p className="text-xs text-gray-500">{role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t">
          <Button
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="outline"
            className="w-full justify-start space-x-3"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar for mobile */}
        <div className="lg:hidden bg-white border-b sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                TTJ
              </div>
              <span className="font-bold text-gray-900">Them to Jesus</span>
            </div>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
