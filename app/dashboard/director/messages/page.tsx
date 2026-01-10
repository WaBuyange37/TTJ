// Location: app/dashboard/director/messages/page.tsx
// Director can chat with founders and social workers

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Users } from 'lucide-react'

interface Channel {
  id: string
  name: string
  isGroup: boolean
  participants: string[]
}

interface Message {
  id: string
  content: string
  senderId: string
  sender: { id: string; name: string }
  createdAt: string
}

export default function DirectorMessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'COUNTRY_DIRECTOR') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchChannels()
  }, [])

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id)
      const interval = setInterval(() => {
        fetchMessages(selectedChannel.id)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedChannel])

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/chat/channels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
        if (data.channels && data.channels.length > 0) {
          setSelectedChannel(data.channels[0])
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (channelId: string) => {
    try {
      const response = await fetch(`/api/chat/${channelId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChannel) return

    setSending(true)
    try {
      const response = await fetch(`/api/chat/${selectedChannel.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      if (response.ok) {
        setNewMessage('')
        fetchMessages(selectedChannel.id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-12rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">Chat with your team</p>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chat channels</h3>
            <p className="text-gray-600">Chat channels will be set up by admin</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Channels */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChannel?.id === channel.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {channel.isGroup ? <Users className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      <span className="font-medium text-sm">{channel.name}</span>
                    </div>
                    {channel.isGroup && <Badge variant="secondary" className="mt-1 text-xs">Group</Badge>}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Messages */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{selectedChannel?.name}</CardTitle>
                {selectedChannel?.isGroup && <CardDescription>Group conversation</CardDescription>}
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No messages yet</p>
                      <p className="text-sm text-gray-500 mt-1">Start the conversation</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === session?.user.id
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          {!isOwn && <p className="text-xs font-semibold mb-1 opacity-75">{message.sender.name}</p>}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>

              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!selectedChannel || sending}
                  />
                  <Button type="submit" disabled={!selectedChannel || sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}