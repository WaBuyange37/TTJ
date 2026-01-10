import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-RW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING_DIRECTOR: 'bg-yellow-100 text-yellow-800',
    APPROVED_BY_DIRECTOR: 'bg-blue-100 text-blue-800',
    REJECTED_BY_DIRECTOR: 'bg-red-100 text-red-800',
    PENDING_FOUNDERS: 'bg-purple-100 text-purple-800',
    APPROVED_BY_FOUNDERS: 'bg-green-100 text-green-800',
    REJECTED_BY_FOUNDERS: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  }
  return colors[urgency] || 'bg-gray-100 text-gray-800'
}
