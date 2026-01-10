# Complete Implementation Guide

## 🎯 Phase-by-Phase Implementation

This guide helps you complete the system in logical phases.

---

## Phase 1: Core Setup (Week 1)

### Day 1-2: Environment & Database
```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Initialize database
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# 4. Test database connection
npx prisma studio
```

**Verification:** Prisma Studio should open and show seeded data.

### Day 3-4: Authentication
- Test login with all 4 user types
- Verify role-based access control
- Test session persistence
- Verify logout functionality

**Test Checklist:**
- [ ] Founder can login and access founder routes
- [ ] Director can login and access director routes
- [ ] Social Worker can login but NOT see financial data
- [ ] Invalid credentials are rejected
- [ ] Session persists across page refreshes

### Day 5-7: Basic UI Components

Create essential UI components:

**1. Dashboard Layout Component**
```typescript
// components/layout/dashboard-layout.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Them to Jesus</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.name}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {session.user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
```

**2. Stat Card Component**
```typescript
// components/dashboard/stat-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: { value: number; isPositive: boolean }
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Phase 2: Financial Management (Week 2)

### Income & Expense Pages

**Director Income Page:**
```typescript
// app/director/income/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function IncomePage() {
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIncomes()
  }, [])

  const fetchIncomes = async () => {
    const res = await fetch('/api/income')
    const data = await res.json()
    setIncomes(data.incomes)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Income Management</h1>
        <Button onClick={() => {/* Open add income modal */}}>
          Add Income
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income: any) => (
                  <tr key={income.id} className="border-b">
                    <td className="p-2">{formatDate(income.date)}</td>
                    <td className="p-2">{income.description}</td>
                    <td className="p-2 font-semibold">{formatCurrency(income.amount)}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {income.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Phase 3: Emergency Request System (Week 3)

### Social Worker Request Form

```typescript
// components/forms/emergency-request-form.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadFile } from '@/lib/supabase'

export function EmergencyRequestForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    urgency: 'MEDIUM',
    location: '',
  })
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload file if present
      let documentUrl = null
      if (file) {
        documentUrl = await uploadFile(file, 'emergency-documents', 'requests')
      }

      // Submit request
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          supportingDocument: documentUrl,
        }),
      })

      if (!res.ok) throw new Error('Failed to submit request')

      onSuccess()
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Emergency Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (RWF)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full border rounded p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full border rounded p-2"
              rows={4}
              required
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Urgency</label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full border rounded p-2"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border rounded p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Supporting Document (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept="image/*,.pdf"
              className="w-full"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Approval Interface (Director/Founder)

```typescript
// components/emergency/approval-card.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, getStatusColor, getUrgencyColor } from '@/lib/utils'

interface EmergencyRequest {
  id: string
  amount: number
  reason: string
  urgency: string
  location: string
  status: string
  requestedAt: string
  requestedBy: { name: string }
}

export function ApprovalCard({ request, onUpdate }: { request: EmergencyRequest; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/emergency/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })

      if (!res.ok) throw new Error('Action failed')

      alert(`Request ${action}ed successfully`)
      onUpdate()
    } catch (error) {
      alert(`Failed to ${action} request`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Emergency Request</CardTitle>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${getUrgencyColor(request.urgency)}`}>
              {request.urgency}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(request.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Requested By</p>
            <p className="text-lg">{request.requestedBy.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="text-lg">{request.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="text-lg">{formatDateTime(request.requestedAt)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Reason</p>
          <p className="text-sm bg-gray-50 p-3 rounded">{request.reason}</p>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded p-2 text-sm"
            rows={2}
            placeholder="Add any notes..."
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleAction('approve')}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Approve
          </Button>
          <Button
            onClick={() => handleAction('reject')}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Phase 4: Chat System (Week 4)

### Chat Component with Ably

```typescript
// components/chat/chat-interface.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { subscribeToChannel, publishToChannel } from '@/lib/ably'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

export function ChatInterface({ channelId }: { channelId: string }) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch message history
    fetchMessages()

    // Subscribe to real-time updates
    const channel = subscribeToChannel(`chat-${channelId}`, (message) => {
      setMessages((prev) => [...prev, message.data])
      scrollToBottom()
    })

    return () => {
      channel.unsubscribe()
    }
  }, [channelId])

  const fetchMessages = async () => {
    const res = await fetch(`/api/chat/${channelId}`)
    const data = await res.json()
    setMessages(data.messages)
    scrollToBottom()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const message = {
      content: newMessage,
      senderId: session?.user.id,
      senderName: session?.user.name,
      createdAt: new Date(),
    }

    try {
      // Send to API
      await fetch(`/api/chat/${channelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      // Publish to Ably for real-time delivery
      await publishToChannel(`chat-${channelId}`, message)

      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Team Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {messages.map((msg: any, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                msg.senderId === session?.user.id
                  ? 'bg-primary text-white ml-auto'
                  : 'bg-gray-100'
              } max-w-[80%]`}
            >
              <p className="text-sm font-medium">{msg.senderName}</p>
              <p>{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">{formatDateTime(msg.createdAt)}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded p-2"
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Phase 5: Testing & Polish (Week 5)

### Testing Checklist

**Authentication**
- [ ] All user types can login
- [ ] Invalid credentials rejected
- [ ] Sessions persist correctly
- [ ] Logout works properly

**Financial Management**
- [ ] Director can add income
- [ ] Director can add expenses
- [ ] Budget calculates correctly
- [ ] Social worker cannot see budget
- [ ] Founders can view all financial data

**Emergency Requests**
- [ ] Social worker can submit request
- [ ] Director receives notification
- [ ] Director can approve/reject
- [ ] Founder receives after director approval
- [ ] Founder can approve/reject
- [ ] Director can complete payment
- [ ] Status updates correctly
- [ ] Audit logs created

**Chat**
- [ ] Messages send in real-time
- [ ] All participants see messages
- [ ] Message history loads
- [ ] Online status works

**File Uploads**
- [ ] Emergency documents upload
- [ ] Post images upload
- [ ] Receipt images upload
- [ ] Files accessible via URL
- [ ] File size limits enforced

---

## Next Steps

1. ✅ Complete all phases above
2. ✅ Run full system test
3. ✅ Fix any bugs discovered
4. ✅ Optimize performance
5. ✅ Deploy to production
6. ✅ Train users
7. ✅ Monitor and iterate

---

**Need Help?** Check other guides:
- SETUP.md - Installation instructions
- DEPLOYMENT.md - Production deployment
- README.md - System overview
