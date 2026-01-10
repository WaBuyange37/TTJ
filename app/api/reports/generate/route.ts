// Location: app/api/reports/generate/route.ts
// Generate comprehensive PDF reports

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PDFDocument from 'pdfkit'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { startDate, endDate, includeIncome, includeExpenses, includeRequests, includeBudget, includeAudit } = body

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // End of day

    // Fetch data
    const [incomes, expenses, requests, auditLogs] = await Promise.all([
      includeIncome ? prisma.income.findMany({
        where: { date: { gte: start, lte: end } },
        include: { addedBy: { select: { name: true } } },
        orderBy: { date: 'desc' }
      }) : [],
      includeExpenses ? prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
        include: { addedBy: { select: { name: true } } },
        orderBy: { date: 'desc' }
      }) : [],
      includeRequests ? prisma.emergencyRequest.findMany({
        where: { requestedAt: { gte: start, lte: end } },
        include: { requestedBy: { select: { name: true } } },
        orderBy: { requestedAt: 'desc' }
      }) : [],
      includeAudit ? prisma.auditLog.findMany({
        where: { timestamp: { gte: start, lte: end } },
        include: { performedBy: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
        take: 100 // Limit to recent 100
      }) : []
    ])

    // Calculate totals
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const completedRequests = requests.filter(r => r.status === 'COMPLETED')
    const totalEmergency = completedRequests.reduce((sum, r) => sum + r.amount, 0)
    const available = totalIncome - totalExpenses - totalEmergency

    // Create PDF
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    // Helper functions
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount)
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('THEM TO JESUS NGO', { align: 'center' })
    doc.fontSize(16).font('Helvetica').text('Financial Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Period: ${formatDate(start)} to ${formatDate(end)}`, { align: 'center' })
    doc.fontSize(10).text(`Generated: ${formatDate(new Date())}`, { align: 'center' })
    doc.fontSize(10).text(`By: ${session.user.name}`, { align: 'center' })
    doc.moveDown(2)

    // Budget Summary
    if (includeBudget) {
      doc.fontSize(16).font('Helvetica-Bold').text('BUDGET SUMMARY')
      doc.moveDown()
      
      const summaryY = doc.y
      doc.fontSize(11).font('Helvetica')
      doc.text(`Total Income:`, 50, summaryY)
      doc.text(formatCurrency(totalIncome), 400, summaryY, { align: 'right' })
      
      doc.text(`Total Expenses:`, 50, summaryY + 20)
      doc.text(formatCurrency(totalExpenses), 400, summaryY + 20, { align: 'right' })
      
      doc.text(`Emergency Funds:`, 50, summaryY + 40)
      doc.text(formatCurrency(totalEmergency), 400, summaryY + 40, { align: 'right' })
      
      doc.moveTo(50, summaryY + 60).lineTo(550, summaryY + 60).stroke()
      
      doc.fontSize(12).font('Helvetica-Bold')
      doc.text(`Available Balance:`, 50, summaryY + 70)
      doc.text(formatCurrency(available), 400, summaryY + 70, { align: 'right', color: available >= 0 ? 'green' : 'red' })
      
      doc.moveDown(4)
    }

    // Income Details
    if (includeIncome && incomes.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('INCOME DETAILS')
      doc.moveDown()
      
      incomes.forEach((income, index) => {
        if (doc.y > 700) doc.addPage()
        
        doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${formatDate(income.date)}`)
        doc.fontSize(10).font('Helvetica')
        doc.text(`Amount: ${formatCurrency(income.amount)}`)
        doc.text(`Description: ${income.description}`)
        doc.text(`From: ${income.sender}`)
        doc.text(`Category: ${income.category}`)
        doc.text(`Added by: ${income.addedBy.name}`)
        doc.moveDown()
      })
      
      doc.moveDown()
      doc.fontSize(12).font('Helvetica-Bold').text(`Total Income: ${formatCurrency(totalIncome)}`)
    }

    // Expense Details
    if (includeExpenses && expenses.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('EXPENSE DETAILS')
      doc.moveDown()
      
      expenses.forEach((expense, index) => {
        if (doc.y > 700) doc.addPage()
        
        doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${formatDate(expense.date)}`)
        doc.fontSize(10).font('Helvetica')
        doc.text(`Amount: ${formatCurrency(expense.amount)}`)
        doc.text(`Description: ${expense.description}`)
        doc.text(`Category: ${expense.category}`)
        if (expense.receipt) doc.text(`Receipt: ${expense.receipt}`)
        doc.text(`Added by: ${expense.addedBy.name}`)
        doc.moveDown()
      })
      
      doc.moveDown()
      doc.fontSize(12).font('Helvetica-Bold').text(`Total Expenses: ${formatCurrency(totalExpenses)}`)
    }

    // Emergency Requests
    if (includeRequests && requests.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('EMERGENCY REQUESTS')
      doc.moveDown()
      
      requests.forEach((request, index) => {
        if (doc.y > 700) doc.addPage()
        
        doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${formatDate(request.requestedAt)}`)
        doc.fontSize(10).font('Helvetica')
        doc.text(`Amount: ${formatCurrency(request.amount)}`)
        doc.text(`Reason: ${request.reason}`)
        doc.text(`Urgency: ${request.urgency}`)
        doc.text(`Location: ${request.location}`)
        doc.text(`Status: ${request.status}`)
        doc.text(`Requested by: ${request.requestedBy.name}`)
        doc.moveDown()
      })
      
      const pending = requests.filter(r => r.status.includes('PENDING')).length
      const approved = requests.filter(r => r.status.includes('APPROVED') || r.status === 'COMPLETED').length
      const rejected = requests.filter(r => r.status.includes('REJECTED')).length
      
      doc.moveDown()
      doc.fontSize(12).font('Helvetica-Bold').text(`Summary: ${pending} Pending, ${approved} Approved, ${rejected} Rejected`)
    }

    // Audit Trail
    if (includeAudit && auditLogs.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('AUDIT TRAIL')
      doc.moveDown()
      doc.fontSize(9).text('(Showing last 100 entries)')
      doc.moveDown()
      
      auditLogs.forEach((log, index) => {
        if (doc.y > 720) doc.addPage()
        
        doc.fontSize(9).font('Helvetica')
        doc.text(`${formatDate(log.timestamp)} - ${log.action} by ${log.performedBy.name}`)
      })
    }

    // Footer on last page
    doc.moveDown(3)
    doc.fontSize(10).font('Helvetica-Italic').text('End of Report', { align: 'center' })
    doc.fontSize(8).text(`Generated by Them to Jesus NGO Management System`, { align: 'center' })

    // Finalize PDF
    doc.end()

    // Wait for PDF generation to complete
    await new Promise((resolve) => {
      doc.on('end', resolve)
    })

    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="TTJ-Report-${startDate}-to-${endDate}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}