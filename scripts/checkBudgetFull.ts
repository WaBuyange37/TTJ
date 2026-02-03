import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const totalIncome = (await prisma.income.aggregate({ _sum: { amount: true } }))._sum.amount || 0
  const totalExpenses = (await prisma.expense.aggregate({ _sum: { amount: true } }))._sum.amount || 0
  const approvedEmergency = (await prisma.emergencyRequest.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }))._sum.amount || 0
  const pendingEmergency = (await prisma.emergencyRequest.aggregate({ where: { status: { in: ['PENDING_DIRECTOR', 'PENDING_FOUNDERS', 'APPROVED_BY_FOUNDERS'] } }, _sum: { amount: true } }))._sum.amount || 0

  const available = totalIncome - totalExpenses - approvedEmergency

  console.log('Budget overview (DB)')
  console.log('Total income:', totalIncome)
  console.log('Total expenses:', totalExpenses)
  console.log('Emergency funds spent (completed):', approvedEmergency)
  console.log('Emergency funds pending:', pendingEmergency)
  console.log('Available:', available)

  const recentIncome = await prisma.income.findMany({ take: 5, orderBy: { date: 'desc' } })
  const recentExpenses = await prisma.expense.findMany({ take: 5, orderBy: { date: 'desc' } })

  console.log('\nRecent income entries:')
  console.table(recentIncome.map(i => ({ date: i.date.toISOString(), amount: i.amount, description: i.description })))

  console.log('\nRecent expense entries:')
  console.table(recentExpenses.map(e => ({ date: e.date.toISOString(), amount: e.amount, description: e.description })))

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyIncome = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', date) as month,
      SUM(amount) as total
    FROM incomes
    WHERE date >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month DESC
  `

  const monthlyExpenses = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', date) as month,
      SUM(amount) as total
    FROM expenses
    WHERE date >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month DESC
  `

  console.log('\nMonthly income (last 6 months):')
  console.log(monthlyIncome)
  console.log('\nMonthly expenses (last 6 months):')
  console.log(monthlyExpenses)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})