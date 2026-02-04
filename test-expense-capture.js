const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testExpenseCapture() {
  try {
    console.log('Testing expense capture...');

    // Get a social worker user
    const socialWorker = await prisma.user.findFirst({
      where: { role: 'SOCIAL_WORKER' }
    });

    if (!socialWorker) {
      console.log('No social worker found');
      return;
    }

    console.log('Found social worker:', socialWorker.name);

    // Create a test multi-item expense
    const expense = await prisma.socialWorkerExpense.create({
      data: {
        amount: 25000,
        description: 'Test expense for school supplies',
        addedById: socialWorker.id,
        expenseItems: {
          create: [
            {
              description: 'School books and notebooks',
              amount: 15000,
              category: 'SCHOOL'
            },
            {
              description: 'School uniforms',
              amount: 10000,
              category: 'SCHOOL'
            }
          ]
        }
      },
      include: {
        expenseItems: true,
        addedBy: true
      }
    });

    console.log('Created expense:', expense);
    console.log('Expense items:', expense.expenseItems);

    // Check if director can see it
    const director = await prisma.user.findFirst({
      where: { role: 'COUNTRY_DIRECTOR' }
    });

    if (director) {
      console.log('Found director:', director.name);
      
      // Get pending expenses for director
      const pendingExpenses = await prisma.socialWorkerExpense.findMany({
        where: { status: 'PENDING' },
        include: {
          addedBy: { select: { name: true, email: true } },
          expenseItems: true
        }
      });

      console.log('Pending expenses for director:', pendingExpenses.length);
      console.log('First pending expense:', pendingExpenses[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExpenseCapture();
