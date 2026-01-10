import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Redirect based on role
  switch (session.user.role) {
    case 'FOUNDER':
      redirect('/dashboard/founder')
    case 'COUNTRY_DIRECTOR':
      redirect('/dashboard/director')
    case 'SOCIAL_WORKER':
      redirect('/dashboard/social-worker')
    default:
      redirect('/login')
  }
}
