'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEmergencyRequestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    reason: '',
    urgency: 'MEDIUM',
    location: '',
    supportingDocument: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user.role !== 'SOCIAL_WORKER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      })
      return
    }

    if (!form.reason || form.reason.length < 10) {
      toast({
        title: 'Error',
        description: 'Please provide a detailed reason (at least 10 characters)',
        variant: 'destructive',
      })
      return
    }

    if (!form.location || form.location.length < 3) {
      toast({
        title: 'Error',
        description: 'Please enter a valid location',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          reason: form.reason,
          urgency: form.urgency,
          location: form.location,
          supportingDocument: form.supportingDocument || undefined
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Emergency request submitted successfully',
        })
        router.push('/dashboard/social-worker/requests')
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to submit request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while submitting the request',
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/social-worker/requests">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Emergency Request</h1>
          <p className="text-gray-600 mt-1">Submit a funding request for director approval</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Request Approval Process</h3>
            <p className="text-sm text-blue-800 mt-1">
              Your request will first be reviewed by the Country Director, then forwarded to the Founders for final approval. 
              You'll be notified at each step and can view the status in your requests list.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Please provide complete information to help expedite the approval process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount Needed (RWF) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g., 50000"
                required
              />
              <p className="text-sm text-gray-500">
                Enter the amount in Rwandan Francs
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Request <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={6}
                placeholder="Provide a detailed explanation of why you need this funding, what it will be used for, and how it will help the beneficiaries..."
                required
                minLength={10}
              />
              <p className="text-sm text-gray-500">
                {form.reason.length}/500 characters (minimum 10 required)
              </p>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label htmlFor="urgency">
                Urgency Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.urgency}
                onValueChange={(value) => setForm({ ...form, urgency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span>Low - Can wait 1-2 weeks</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                      <span>Medium - Needed within a week</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                      <span>High - Needed within 2-3 days</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="CRITICAL">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      <span>Critical - Urgent, needs immediate attention</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Select the appropriate urgency level to help prioritize your request
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                Location <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location"
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Muhanga District, Kigali City"
                required
                minLength={3}
              />
              <p className="text-sm text-gray-500">
                Where is this funding needed?
              </p>
            </div>

            {/* Supporting Document */}
            <div className="space-y-2">
              <Label htmlFor="document">
                Supporting Document (Optional)
              </Label>
              <Input
                id="document"
                type="url"
                value={form.supportingDocument}
                onChange={(e) => setForm({ ...form, supportingDocument: e.target.value })}
                placeholder="https://example.com/document.pdf"
              />
              <p className="text-sm text-gray-500">
                Upload your document to cloud storage (Google Drive, Dropbox, etc.) and paste the public link here
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Link href="/dashboard/social-worker/requests">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <h3 className="font-medium text-gray-900 mb-2">💡 Tips for a Successful Request</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Be specific and detailed about why you need the funding</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Include any supporting documents (photos, receipts, quotes) to strengthen your request</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Choose the urgency level honestly - critical requests are prioritized</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>You can edit your request before it's reviewed by the director</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}