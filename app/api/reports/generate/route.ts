// Location: app/api/reports/generate/route.ts
// Returns report data as JSON for client-side PDF generation

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

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
    end.setHours(23, 59, 59, 999)

    // Fetch data (incomes/expenses/requests/audit) in parallel when requested
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
        where: { createdAt: { gte: start, lte: end } },
        include: { performedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      }) : []
    ])

    // If budget summary requested, compute it (date range restricted)
    let budgetSummary = null
    if (includeBudget) {
      const [incomeAgg, expenseAgg, approvedEmergencyAgg, pendingEmergencyAgg] = await Promise.all([
        prisma.income.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.emergencyRequest.aggregate({ where: { requestedAt: { gte: start, lte: end }, status: 'COMPLETED' }, _sum: { amount: true } }),
        prisma.emergencyRequest.aggregate({ where: { requestedAt: { gte: start, lte: end }, status: { in: ['PENDING_DIRECTOR', 'PENDING_FOUNDERS', 'APPROVED_BY_FOUNDERS'] } }, _sum: { amount: true } }),
      ])

      const totalIncomeInRange = incomeAgg._sum.amount || 0
      const totalExpensesInRange = expenseAgg._sum.amount || 0
      const totalEmergencySpent = approvedEmergencyAgg._sum.amount || 0
      const totalEmergencyPending = pendingEmergencyAgg._sum.amount || 0
      const availableInRange = totalIncomeInRange - totalExpensesInRange - totalEmergencySpent

      budgetSummary = {
        totalIncome: totalIncomeInRange,
        totalExpenses: totalExpensesInRange,
        emergencySpent: totalEmergencySpent,
        emergencyPending: totalEmergencyPending,
        available: availableInRange,
      }
    }

    // Calculate totals
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const completedRequests = requests.filter(r => r.status === 'COMPLETED')
    const totalEmergency = completedRequests.reduce((sum, r) => sum + Number(r.amount), 0)
    const available = totalIncome - totalExpenses - totalEmergency

    // Structured data object (used for JSON or PDF export)
    const reportData = {
      metadata: {
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.name,
      },
      summary: {
        totalIncome,
        totalExpenses,
        totalEmergency,
        available,
      },
      incomes: incomes.map(i => ({
        date: i.date.toISOString(),
        amount: Number(i.amount),
        description: i.description,
        sender: i.sender,
        category: i.category,
        addedBy: i.addedBy.name,
      })),
      expenses: expenses.map(e => ({
        date: e.date.toISOString(),
        amount: Number(e.amount),
        description: e.description,
        category: e.category,
        receipt: e.receipt,
        addedBy: e.addedBy.name,
      })),
      requests: requests.map(r => ({
        date: r.requestedAt.toISOString(),
        amount: Number(r.amount),
        reason: r.reason,
        urgency: r.urgency,
        location: r.location,
        status: r.status,
        requestedBy: r.requestedBy.name,
      })),
      auditLogs: auditLogs.map(a => ({
        timestamp: a.createdAt.toISOString(),
        action: a.action,
        performedBy: a.performedBy?.name || null,
        entityType: a.entityType,
      })),
      // Include budget summary when requested
      budget: budgetSummary,
    }

    // If client requested PDF, generate it server-side and return binary
    if (body && body.format === 'pdf') {
      // Validate inputs
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'startDate and endDate are required for PDF generation' }, { status: 400 })
      }

      try {
        const PDFDocument = (await import('pdfkit')).default
        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        const buffers: Buffer[] = []
        doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)))

        // Try to register a system TrueType font to avoid PDFKit looking for AFM files
        // (Next's server bundle may not include pdfkit's AFM files, causing ENOENT for Helvetica.afm)
        try {
          // common system fonts
          const systemFonts = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf',
            '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
          ]

          // also look for any .ttf files in the project's public/fonts directory
          const projectFontsDir = path.join(process.cwd(), 'public', 'fonts')
          let projectFonts: string[] = []
          try {
            if (fs.existsSync(projectFontsDir)) {
              projectFonts = fs.readdirSync(projectFontsDir)
                .filter(f => f.toLowerCase().endsWith('.ttf') || f.toLowerCase().endsWith('.otf'))
                .map(f => path.join(projectFontsDir, f))
            }
          } catch (e) {
            // ignore
          }

          const possibleFonts = [...projectFonts, ...systemFonts]
          let fontPath = possibleFonts.find(p => fs.existsSync(p))

          // If no font found, try to download a small open-source font (DejaVuSans) into public/fonts
          if (!fontPath) {
            try {
              const downloadUrl = 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf'
              if (!fs.existsSync(projectFontsDir)) fs.mkdirSync(projectFontsDir, { recursive: true })
              const target = path.join(projectFontsDir, 'DejaVuSans.ttf')

              // Only download if not already present
              if (!fs.existsSync(target)) {
                const res = await fetch(downloadUrl)
                if (res.ok) {
                  const buf = Buffer.from(await res.arrayBuffer())
                  fs.writeFileSync(target, buf)
                  console.log('Downloaded DejaVuSans.ttf to', target)
                } else {
                  console.warn('Failed to download font. HTTP status:', res.status)
                }
              }

              if (fs.existsSync(target)) fontPath = target
            } catch (e) {
              console.warn('Font auto-download failed:', e)
            }
          }
          if (fontPath) {
            // registerFont is provided by PDFDocument; use a stable registered name
            ;(doc as any).registerFont?.('TTFSans', fontPath)
            doc.font('TTFSans')
          } else {
            // No system TTF found; continue — PDFKit will try built-in fonts (might fail if AFM files missing)
            console.warn('No system TTF font found for PDF generation; PDFKit may attempt AFM files.')
          }
        } catch (fontErr) {
          console.warn('Failed to register system font for PDF generation:', fontErr)
        }

        const pdfEnd = new Promise<Buffer>((resolve, reject) => {
          doc.on('end', () => resolve(Buffer.concat(buffers)))
          doc.on('error', reject)
        })

        // Header
        doc.fontSize(20).text('Them To Jesus — Financial Report', { align: 'center' })
        doc.moveDown()
        doc.fontSize(10).text(`Period: ${startDate} — ${endDate}`)
        doc.text(`Generated by: ${session.user.name} on ${new Date().toLocaleString()}`)
        doc.moveDown()

        // Summary
        doc.fontSize(12).text('Summary', { underline: true })
        doc.fontSize(10).text(`Total Income: ${reportData.summary.totalIncome}`)
        doc.text(`Total Expenses: ${reportData.summary.totalExpenses}`)
        doc.text(`Total Emergency (completed): ${reportData.summary.totalEmergency}`)
        doc.text(`Available: ${reportData.summary.available}`)
        doc.moveDown()

        // Budget summary
        if (reportData.budget) {
          doc.fontSize(12).text('Budget Summary', { underline: true })
          doc.fontSize(10).text(`Income in range: ${reportData.budget.totalIncome}`)
          doc.text(`Expenses in range: ${reportData.budget.totalExpenses}`)
          doc.text(`Emergency spent: ${reportData.budget.emergencySpent}`)
          doc.text(`Emergency pending: ${reportData.budget.emergencyPending}`)
          doc.text(`Available in range: ${reportData.budget.available}`)
          doc.moveDown()
        }

        // Sections helper
        const writeList = (title: string, items: any[], formatter: (i: any) => string) => {
          if (!items || items.length === 0) return
          doc.fontSize(12).text(title, { underline: true })
          doc.moveDown(0.25)
          items.forEach((it) => {
            doc.fontSize(10).text(formatter(it))
            doc.moveDown(0.25)
          })
          doc.moveDown()
        }

        writeList('Incomes', reportData.incomes, (i) => `${new Date(i.date).toLocaleDateString()} — ${i.description} — ${i.amount} (${i.sender})`)
        writeList('Expenses', reportData.expenses, (e) => `${new Date(e.date).toLocaleDateString()} — ${e.description} — ${e.amount} (${e.category})`)
        writeList('Emergency Requests', reportData.requests, (r) => `${new Date(r.date).toLocaleDateString()} — ${r.reason} — ${r.amount} (${r.status})`)
        writeList('Audit Logs', reportData.auditLogs, (a) => `${new Date(a.timestamp).toLocaleString()} — ${a.action} — ${a.performedBy || 'system'}`)

        // Finalize
        doc.end()
        const pdfBuffer = await pdfEnd

        // Generate safe filename
        const safeStart = startDate.replace(/[^0-9-]/g, '_')
        const safeEnd = endDate.replace(/[^0-9-]/g, '_')

        // Return PDF as binary - cast to BodyInit for TypeScript compatibility
        return new Response(pdfBuffer as unknown as BodyInit, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="report_${safeStart}_${safeEnd}.pdf"`,
          },
        })
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)

        // If the error is an ENOENT for AFM metric files (commonly Helvetica.afm) provide a helpful hint
        let details = String(pdfError)
        try {
          if ((pdfError as any)?.code === 'ENOENT' || details.includes('Helvetica.afm') || details.includes('.afm')) {
            details += ' — Missing AFM font metrics. On Linux install fonts such as DejaVu (`sudo apt install fonts-dejavu-core`) or add a TTF to the server and register it (e.g. /public/fonts).'
          }
        } catch (e) {
          // ignore enrichment failures
        }

        return NextResponse.json({ error: 'PDF generation failed', details }, { status: 500 })
      }
    }

    // Default: return JSON data
    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}