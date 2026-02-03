import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const start = new Date('2026-01-01')
  const end = new Date('2026-01-31')
  end.setHours(23,59,59,999)

  const incomeAgg = await prisma.income.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } })
  const expenseAgg = await prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } })

  const totalIncome = incomeAgg._sum.amount || 0
  const totalExpenses = expenseAgg._sum.amount || 0
  const remaining = totalIncome - totalExpenses

  console.log('Jan 2026 budget check:')
  console.log('Total Income:', totalIncome)
  console.log('Total Expenses:', totalExpenses)
  console.log('Remaining:', remaining)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})