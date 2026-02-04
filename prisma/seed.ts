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
    where: { email: 'niyonicole2002@gmail.com' },
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
  console.log('- 3 Emergency requests')
  console.log('- 5 News posts')
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

  // Create sample social worker expenses
  console.log('Creating sample social worker expenses...')
  await prisma.socialWorkerExpense.createMany({
    data: [
      {
        amount: 5000,
        description: 'Emergency medical supplies for Sarah - malaria treatment',
        category: 'HEALTH',
        date: new Date('2026-02-03'),
        receipt: null,
        addedById: worker.id,
        status: 'PENDING'
      },
      {
        amount: 8000,
        description: 'School fees and uniforms for 2 girls',
        category: 'SCHOOL',
        date: new Date('2026-02-02'),
        receipt: null,
        addedById: worker.id,
        status: 'APPROVED',
        reviewedById: director.id,
        reviewedAt: new Date('2026-02-03'),
        reviewNotes: 'Approved - essential educational expenses for the girls'
      },
      {
        amount: 3000,
        description: 'Food supplies for emergency situation',
        category: 'FOOD',
        date: new Date('2026-02-01'),
        receipt: null,
        addedById: worker.id,
        status: 'REJECTED',
        reviewedById: director.id,
        reviewedAt: new Date('2026-02-02'),
        reviewNotes: 'Rejected - please use regular budget allocation for food supplies'
      },
      {
        amount: 12000,
        description: 'Transport costs for hospital visit - 3 girls',
        category: 'TRANSPORT',
        date: new Date('2026-02-04'),
        receipt: null,
        addedById: worker.id,
        status: 'PENDING'
      }
    ]
  })

  // Create sample emergency requests
  console.log('Creating sample emergency requests...')
  await prisma.emergencyRequest.createMany({
    data: [
      {
        amount: 15000,
        reason: 'Emergency medical treatment for Sarah - severe malaria requiring hospitalization',
        urgency: 'CRITICAL',
        location: 'Kigali Hospital',
        requestedById: worker.id,
        status: 'PENDING_DIRECTOR'
      },
      {
        amount: 8000,
        reason: 'Emergency food supplies for 3 girls who ran out of basic necessities',
        urgency: 'HIGH',
        location: 'Muhanga Center',
        requestedById: worker.id,
        status: 'APPROVED_BY_DIRECTOR'
      },
      {
        amount: 12000,
        reason: 'Urgent school fees and supplies for 2 girls starting secondary school',
        urgency: 'MEDIUM',
        location: 'Kigali',
        requestedById: worker.id,
        status: 'COMPLETED'
      }
    ]
  })

  // Create sample posts
  console.log('Creating sample posts...')
  await prisma.post.createMany({
    data: [
      {
        title: 'Welcome to Them To Jesus!',
        content: 'We are so excited to share our journey with you. Together, we are transforming the lives of street girls and their babies in Kigali, Rwanda. Every day brings new hope, new challenges, and new opportunities to make a difference.',
        images: [],
        category: 'mission',
        isPublic: true,
        authorId: director.id,
        published: true
      },
      {
        title: 'Maria\'s Journey: From Streets to University',
        content: 'When we first met Maria, she was living on the streets of Kigali, pregnant and alone. Today, she\'s a university student with a beautiful baby girl. Maria\'s transformation began when our outreach team found her and offered her shelter at our center. With counseling, medical care, and educational support, Maria not only completed her high school education but also gained admission to university to study social work. Her daughter, Grace, is now a healthy, happy two-year-old who brings joy to everyone at our center. Maria dreams of becoming a social worker to help other girls like herself. Your support makes stories like Maria\'s possible every day.',
        images: [],
        category: 'success_stories',
        isPublic: true,
        authorId: director.id,
        published: true
      },
      {
        title: 'New Baby Care Center Opening Soon!',
        content: 'Exciting news! Thanks to your generous support, we\'re expanding our facilities to include a dedicated baby care center. This new wing will provide specialized care for the babies of the young mothers in our program. The center will feature: 24/7 medical supervision, a pediatric clinic, educational play areas, and a nutrition program. We\'ve already hired two experienced nurses and a pediatric specialist. Construction is 80% complete, and we expect to open by next month. This center will ensure that while mothers are in classes or vocational training, their babies receive the best possible care. Thank you for making this dream a reality!',
        images: [],
        category: 'mission',
        isPublic: true,
        authorId: director.id,
        published: true
      },
      {
        title: 'Thank You for Making 50 Dreams Come True',
        content: 'This month, we celebrated an incredible milestone - we\'ve now helped 50 street girls and their babies find hope and new beginnings! Each of these 50 stories represents a life transformed, a family healed, and a future restored. From Sarah who now runs her own tailoring business, to Grace who\'s studying to become a teacher, to baby David who just took his first steps at our center - every success story is made possible by your support. Our anniversary celebration was filled with tears of joy as the girls shared their journeys. The mothers prepared a feast, the babies played together, and we all thanked God for the miracles we\'ve witnessed. Here\'s to 50 more dreams waiting to come true!',
        images: [],
        category: 'thank_you',
        isPublic: true,
        authorId: director.id,
        published: true
      },
      {
        title: 'Vocational Training Success Story',
        content: 'We\'re thrilled to share that 12 of our girls have completed their vocational training programs! 6 girls graduated from tailoring school and are now starting their own businesses, 4 completed computer literacy courses and are working in local offices, and 2 finished culinary arts training and are now employed at local restaurants. Each of these young women is now financially independent and able to provide for their children. The ripple effect of their success extends to their families and communities. Your investment in their education is paying dividends that will last for generations!',
        images: [],
        category: 'success_stories',
        isPublic: true,
        authorId: worker.id,
        published: true
      }
    ]
  })

  console.log('\n📧 Login credentials (all passwords: password123):')
  console.log('─────────────────────────────────────────────────')
  console.log('Founder 1:        inshimyumukiza47@gmail.com')
  console.log('Founder 2:        manuela.bader@posteo.de')
  console.log('Director:         kwizeramugisha017@gmail.com')
  console.log('Social Worker:    niyonicole2002@gmail.com')
  console.log('─────────────────────────────────────────────────')
  console.log('\n💰 Sample Data Created:')
  console.log('- 1 Income entry (founder funds - Jan 2026)')
  console.log('- 32 Expense entries (Jan 2026 budget items)')
  console.log('- 3 Emergency requests')
  console.log('- 5 News posts')
  console.log('- 2 Chat channels (with 2 starter messages)')
  console.log('- 2 Girl profiles (featured on home page)')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
