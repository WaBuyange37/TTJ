const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDirectorApproval() {
  try {
    console.log('Testing director approval workflow...');

    // Get a director user
    const director = await prisma.user.findFirst({
      where: { role: 'COUNTRY_DIRECTOR' }
    });

    if (!director) {
      console.log('No director found');
      return;
    }

    console.log('Found director:', director.name);

    // Get a pending expense
    const pendingExpense = await prisma.socialWorkerExpense.findFirst({
      where: { status: 'PENDING' },
      include: {
        expenseItems: true,
        addedBy: { select: { name: true, email: true } }
      }
    });

    if (!pendingExpense) {
      console.log('No pending expenses found');
      return;
    }

    console.log('Found pending expense:', pendingExpense.description);
    console.log('Expense amount:', pendingExpense.amount);
    console.log('Expense items:', pendingExpense.expenseItems.length);

    // Get current balance before approval
    const currentIncome = await prisma.income.aggregate({
      _sum: { amount: true }
    });

    const currentExpenses = await prisma.expense.aggregate({
      _sum: { amount: true }
    });

    const currentBalance = (currentIncome._sum.amount || 0) - (currentExpenses._sum.amount || 0);
    console.log('Current balance before approval:', currentBalance);

    // Approve the expense (simulate director approval)
    const approvedExpense = await prisma.socialWorkerExpense.update({
      where: { id: pendingExpense.id },
      data: {
        status: 'APPROVED',
        reviewedById: director.id,
        reviewedAt: new Date(),
        reviewNotes: 'Approved for school supplies'
      },
      include: {
        addedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        expenseItems: true
      }
    });

    console.log('Approved expense:', approvedExpense.status);

    // Create expense records for each item (simulate the API logic)
    for (const item of approvedExpense.expenseItems) {
      await prisma.expense.create({
        data: {
          amount: item.amount,
          date: approvedExpense.date,
          category: item.category,
          description: `Approved social worker expense: ${item.description} (From: ${approvedExpense.description})`,
          addedById: director.id
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'SOCIAL_WORKER_EXPENSE_APPROVED',
        entityType: 'SocialWorkerExpense',
        entityId: approvedExpense.id,
        details: JSON.stringify({
          totalAmount: approvedExpense.amount,
          itemCount: approvedExpense.expenseItems.length,
          approvedBy: director.name,
          items: approvedExpense.expenseItems.map(item => ({
            description: item.description,
            amount: item.amount,
            category: item.category
          }))
        }),
        performedById: director.id,
      }
    });

    // Check balance after approval
    const newIncome = await prisma.income.aggregate({
      _sum: { amount: true }
    });

    const newExpenses = await prisma.expense.aggregate({
      _sum: { amount: true }
    });

    const newBalance = (newIncome._sum.amount || 0) - (newExpenses._sum.amount || 0);
    console.log('New balance after approval:', newBalance);
    console.log('Balance decreased by:', currentBalance - newBalance);

    // Verify the expense records were created
    const createdExpenses = await prisma.expense.findMany({
      where: {
        description: {
          contains: 'Approved social worker expense'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Created expense records:', createdExpenses.length);
    createdExpenses.forEach((exp, index) => {
      console.log(`  ${index + 1}. ${exp.description} - ${exp.amount}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectorApproval();
