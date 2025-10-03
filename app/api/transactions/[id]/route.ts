import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { transactions, accounts } from '@/db/schema/finance';

interface Params {
  params: Promise<{ id: string }>;
}

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, type, amount, description, category, transactionDate } = body;

    if (!accountId || !type || !amount) {
      return NextResponse.json({
        error: 'accountId, type, and amount are required'
      }, { status: 400 });
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json({
        error: 'type must be either income or expense'
      }, { status: 400 });
    }

    // Get the original transaction to calculate balance adjustment
    const [originalTransaction] = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id)
      ))
      .limit(1);

    if (!originalTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Calculate balance changes
    const originalAmount = parseFloat(originalTransaction.amount);
    const newAmount = parseFloat(amount.toString());

    // First, revert the original transaction's effect on balance
    const originalBalanceChange = originalTransaction.type === 'income' ?
      -originalAmount : originalAmount;

    // Then apply the new transaction's effect
    const newBalanceChange = type === 'income' ? newAmount : -newAmount;

    const totalBalanceChange = originalBalanceChange + newBalanceChange;

    // Update transaction
    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        accountId,
        type,
        amount: amount.toString(),
        description,
        category: category || 'Uncategorized',
        transactionDate: transactionDate || originalTransaction.transactionDate,
      })
      .where(and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id)
      ))
      .returning();

    // Update account balance
    if (originalTransaction.accountId === accountId) {
      // Same account, just adjust the difference
      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${totalBalanceChange}`
        })
        .where(eq(accounts.id, accountId));
    } else {
      // Different accounts, revert from old and add to new
      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${originalBalanceChange}`
        })
        .where(eq(accounts.id, originalTransaction.accountId));

      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${newBalanceChange}`
        })
        .where(eq(accounts.id, accountId));
    }

    return NextResponse.json(updatedTransaction);

  } catch (error) {
    console.error('Failed to update transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the transaction before deleting to adjust account balance
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id)
      ))
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Calculate balance change to revert
    const balanceChange = transaction.type === 'income' ?
      -parseFloat(transaction.amount) :
      parseFloat(transaction.amount);

    // Delete transaction
    await db
      .delete(transactions)
      .where(and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id)
      ));

    // Update account balance
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`
      })
      .where(eq(accounts.id, transaction.accountId));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}