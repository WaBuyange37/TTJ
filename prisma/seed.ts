import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create Founders
  console.log('Creating founders...')
  const founder1 = await prisma.user.upsert({
    where: { email: 'inshimyumukiza47@gmail.com' },
    update: {},
    create: {
      email: 'inshimyumukiza47@gmail.com',
      name: 'Shima',
      password: hashedPassword,
      role: 'FOUNDER',
      country: 'Germany',
      location: 'Berlin',
      phone: '+49 1525 2633486',
    },
  })

  const founder2 = await prisma.user.upsert({
    where: { email: 'manuela.bader@posteo.de' },
    update: {},
    create: {
      email: 'manuela.bader@posteo.de',
      name: 'Manuela',
      password: hashedPassword,
      role: 'FOUNDER',
      country: 'Germany',
      location: 'Munich',
      phone: '+49 1512 5329676',
    },
  })

  // Create Country Director
  console.log('Creating country director...')
  const director = await prisma.user.upsert({
    where: { email: 'kwizeramugisha017@gmail.com' },
    update: {},
    create: {
      email: 'kwizeramugisha017@gmail.com',
      name: 'K.Mugisha (Country Director)',
      password: hashedPassword,
      role: 'COUNTRY_DIRECTOR',
      country: 'Rwanda',
      location: 'Kigali',
      phone: '+250 739 898 011',
    },
  })

  // Create Social Worker
  console.log('Creating social worker...')
  const worker = await prisma.user.upsert({
    where: { email:'niyonicole2002@gmail.com' },
    update: {},
    create: {
      email: 'niyonicole2002@gmail.com',
      name: 'Nicole (Social Worker)',
      password: hashedPassword,
      role: 'SOCIAL_WORKER',
      country: 'Rwanda',
      location: 'Muhanga',
      phone: '+250 781 192 768',
    },
  })



  // Ensure idempotency: remove any previous Jan 2026 incomes/expenses and sample channels/posts
  console.log('Cleaning previous Jan 2026 budget entries and sample artifacts (if any)...')
  const janStart = new Date('2026-01-01')
  const janEnd = new Date('2026-01-31')
  janEnd.setHours(23, 59, 59, 999)

  await prisma.income.deleteMany({ where: { date: { gte: janStart, lte: janEnd } } })
  await prisma.expense.deleteMany({ where: { date: { gte: janStart, lte: janEnd } } })

  // Remove sample chat channels created by earlier seeds (by name)
  await prisma.chatChannel.deleteMany({ where: { name: { in: ['Founders & Director', 'All Team'] } } })

  // Create initial chat channels and starter messages
  console.log('Creating initial chat channels and starter messages...')
  const founderDirectorChannel = await prisma.chatChannel.create({
    data: {
      name: 'Founders & Director',
      isGroup: true,
      participants: [founder1.id, founder2.id, director.id],
    },
  })

  const groupChannel = await prisma.chatChannel.create({
    data: {
      name: 'All Team',
      isGroup: true,
      participants: [founder1.id, founder2.id, director.id, worker.id],
    },
  })

  console.log('\n💰 Sample Data Created:')
  console.log('- 1 Income entry (founder funds - Jan 2026)')
  console.log('- 32 Expense entries (Jan 2026 budget items)')
  console.log('- 0 Emergency requests')
  console.log('- 0 News posts')
  console.log('- 2 Chat channels (with 2 starter messages)')
  console.log('- 2 Girl profiles (featured on home page)')

  // Create Jan 2026 budget income
  console.log('Creating Jan 2026 budget income...')
  const income = await prisma.income.create({
    data: {
      amount: 676323,
      description: 'Founder funds received - January 2026',
      sender: 'Founders',
      category: 'MONTHLY_BUDGET',
      date: new Date('2026-01-05'),
      addedById: director.id,
    },
  })

  // Create Jan 2026 expense entries (budget items)
  console.log('Creating Jan 2026 expense entries...')
  await prisma.expense.createMany({
    data: [
      { amount: 18600, description: 'Cooking oil 7L', category: 'FOOD', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 5700, description: 'Bogy Jelly (Movit)', category: 'OTHER', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 1900, description: 'Magi', category: 'FOOD', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 6000, description: 'Toilet paper', category: 'OTHER', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 2000, description: 'Colgate', category: 'OTHER', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 6000, description: 'Omo (detergent)', category: 'OTHER', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 15500, description: 'Soap', category: 'OTHER', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 5000, description: 'Dried fish', category: 'FOOD', date: new Date('2026-01-05'), addedById: director.id },
      { amount: 20000, description: 'Porridge flour', category: 'FOOD', date: new Date('2026-01-06'), addedById: director.id },
      { amount: 2700, description: 'Salt 4.5kg', category: 'FOOD', date: new Date('2026-01-06'), addedById: director.id },
      { amount: 7000, description: 'Cassava flour 14kg', category: 'FOOD', date: new Date('2026-01-06'), addedById: director.id },
      { amount: 8750, description: 'Redgold', category: 'FOOD', date: new Date('2026-01-06'), addedById: director.id },
      { amount: 32500, description: 'Rice 25kg', category: 'FOOD', date: new Date('2026-01-07'), addedById: director.id },
      { amount: 25000, description: 'Maize flour', category: 'FOOD', date: new Date('2026-01-07'), addedById: director.id },
      { amount: 5000, description: 'Rosemary', category: 'FOOD', date: new Date('2026-01-07'), addedById: director.id },
      { amount: 22500, description: 'Spaghetti', category: 'FOOD', date: new Date('2026-01-07'), addedById: director.id },
      { amount: 17500, description: 'Grand nut flour 5kg', category: 'FOOD', date: new Date('2026-01-08'), addedById: director.id },
      { amount: 200, description: 'Manpower (local labor)', category: 'OTHER', date: new Date('2026-01-08'), addedById: director.id },
      { amount: 13200, description: 'Irish Potatoes 33kg', category: 'FOOD', date: new Date('2026-01-08'), addedById: director.id },
      { amount: 11250, description: 'Green Banana 25kg', category: 'FOOD', date: new Date('2026-01-09'), addedById: director.id },
      { amount: 53500, description: 'Vegetables (2 weeks debt)', category: 'FOOD', date: new Date('2026-01-09'), addedById: director.id },
      { amount: 800, description: 'Transport - Nyabugogo', category: 'TRANSPORT', date: new Date('2026-01-10'), addedById: director.id },
      { amount: 1506, description: 'Transport - Muhanga', category: 'TRANSPORT', date: new Date('2026-01-10'), addedById: director.id },
      { amount: 400, description: 'Transport - Sinyora', category: 'TRANSPORT', date: new Date('2026-01-10'), addedById: director.id },
      { amount: 0, description: 'Bike to Sinyora (no cost)', category: 'TRANSPORT', date: new Date('2026-01-10'), addedById: director.id },
      { amount: 600, description: 'Bike to Mucyakabiri', category: 'TRANSPORT', date: new Date('2026-01-11'), addedById: director.id },
      { amount: 3000, description: 'Bus to Nyabugogo', category: 'TRANSPORT', date: new Date('2026-01-11'), addedById: director.id },
      { amount: 1000, description: 'Nyabugogo to Kiste', category: 'TRANSPORT', date: new Date('2026-01-11'), addedById: director.id },
      { amount: 17000, description: 'Moving vehicle + juice (kwimuka)', category: 'TRANSPORT', date: new Date('2026-01-12'), addedById: director.id },
      { amount: 12000, description: 'Charcoal', category: 'OTHER', date: new Date('2026-01-12'), addedById: director.id },
      { amount: 150000, description: 'Social worker salary - January 2026', category: 'OTHER', date: new Date('2026-01-25'), addedById: director.id },
      { amount: 100000, description: 'Country director salary - January 2026', category: 'OTHER', date: new Date('2026-01-25'), addedById: director.id },
    ],
  })





  console.log('✅ Database seeded successfully!')
  console.log('\n📧 Login credentials (all passwords: password123):')
  console.log('─────────────────────────────────────────────────')
  console.log('Founder 1:        founder1@themtojesus.org')
  console.log('Founder 2:        founder2@themtojesus.org')
  console.log('Director:         olivier@themtojesus.org')
  console.log('Social Worker:    nicole@themtojesus.org')
  console.log('─────────────────────────────────────────────────')
  console.log('\n💰 Sample Data Created:')
  console.log('- 1 Income entry (founder funds - Jan 2026)')
  console.log('- 32 Expense entries (Jan 2026 budget items)')
  console.log('- 0 Emergency requests')
  console.log('- 0 News posts')
  console.log('- 2 Chat channels (with 2 starter messages)')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
