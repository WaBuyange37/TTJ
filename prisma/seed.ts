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

  // Create initial chat channels
  console.log('Creating chat channels...')
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

  // Create sample income entries
  console.log('Creating sample income entries...')
  await prisma.income.createMany({
    data: [
      {
        amount: 500000,
        description: 'Monthly budget from founders - January 2024',
        sender: 'Founder One',
        category: 'MONTHLY_BUDGET',
        date: new Date('2024-01-01'),
        addedById: director.id,
      },
      {
        amount: 100000,
        description: 'Donor gift from local church',
        sender: 'Anonymous Donor',
        category: 'DONOR_GIFT',
        date: new Date('2024-01-15'),
        addedById: director.id,
      },
      {
        amount: 500000,
        description: 'Monthly budget from founders - February 2024',
        sender: 'Founder Two',
        category: 'MONTHLY_BUDGET',
        date: new Date('2024-02-01'),
        addedById: director.id,
      },
    ],
  })

  // Create sample expenses
  console.log('Creating sample expense entries...')
  await prisma.expense.createMany({
    data: [
      {
        amount: 150000,
        description: 'Monthly rent for facility',
        category: 'RENT',
        date: new Date('2024-01-05'),
        addedById: director.id,
      },
      {
        amount: 80000,
        description: 'Food supplies for the month',
        category: 'FOOD',
        date: new Date('2024-01-10'),
        addedById: director.id,
      },
      {
        amount: 120000,
        description: 'School fees for 3 girls',
        category: 'SCHOOL',
        date: new Date('2024-01-15'),
        addedById: director.id,
      },
      {
        amount: 45000,
        description: 'Medical checkup for girls',
        category: 'HEALTH',
        date: new Date('2024-01-20'),
        addedById: director.id,
      },
      {
        amount: 150000,
        description: 'Monthly rent for facility',
        category: 'RENT',
        date: new Date('2024-02-05'),
        addedById: director.id,
      },
    ],
  })

  // Create sample emergency request
  console.log('Creating sample emergency request...')
  const emergencyRequest = await prisma.emergencyRequest.create({
    data: {
      amount: 35000,
      reason: 'One of the girls needs urgent dental treatment. She has been experiencing severe tooth pain and the dentist recommends immediate attention.',
      urgency: 'HIGH',
      location: 'Muhanga District Hospital',
      status: 'PENDING_DIRECTOR',
      requestedById: worker.id,
    },
  })

  // Create sample post
  console.log('Creating sample post...')
  await prisma.post.create({
    data: {
      title: 'Monthly Progress Update - January 2024',
      content: 'All the girls are doing well in school. We had a great week with art classes and community service activities. The girls are very enthusiastic and showing great progress in their studies.',
      images: [],
      authorId: worker.id,
      published: true,
    },
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
  console.log('- 3 Income entries')
  console.log('- 5 Expense entries')
  console.log('- 1 Emergency request (pending)')
  console.log('- 1 News post')
  console.log('- 2 Chat channels')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
