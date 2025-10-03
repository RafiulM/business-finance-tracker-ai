import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { transactions, accounts, NewTransaction } from '@/db/schema/finance';

// GET /api/transactions - List transactions with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountIds = searchParams.get('accountIds')?.split(',').filter(Boolean);
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    const types = searchParams.get('types')?.split(',').filter(Boolean);

    const offset = (page - 1) * limit;

    const whereConditions = [eq(transactions.userId, session.user.id)];

    if (startDate) {
      whereConditions.push(gte(transactions.transactionDate, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(transactions.transactionDate, endDate));
    }

    if (accountIds && accountIds.length > 0) {
      whereConditions.push(eq(transactions.accountId, accountIds[0]));
    }

    if (categories && categories.length > 0) {
      whereConditions.push(eq(transactions.category, categories[0]));
    }

    if (types && types.length > 0) {
      whereConditions.push(eq(transactions.type, types[0]));
    }

    const [transactionsData, totalCount] = await Promise.all([
      db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
          accountName: accounts.name,
          type: transactions.type,
          amount: transactions.amount,
          description: transactions.description,
          category: transactions.category,
          transactionDate: transactions.transactionDate,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...whereConditions))
        .orderBy(desc(transactions.transactionDate))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: transactions.id })
        .from(transactions)
        .where(and(...whereConditions))
        .then((result) => result.length),
    ]);

    return NextResponse.json({
      transactions: transactionsData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
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

    const newTransaction: NewTransaction = {
      userId: session.user.id,
      accountId,
      type,
      amount: amount.toString(),
      description,
      category: category || 'Uncategorized',
      transactionDate: transactionDate || new Date().toISOString().split('T')[0],
    };

    const [transaction] = await db
      .insert(transactions)
      .values(newTransaction)
      .returning();

    // Update account balance
    const balanceChange = type === 'income' ?
      parseFloat(amount.toString()) :
      -parseFloat(amount.toString());

    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`
      })
      .where(eq(accounts.id, accountId));

    return NextResponse.json(transaction, { status: 201 });

  } catch (error) {
    console.error('Failed to create transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}