import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, NewAccount } from '@/db/schema/finance';

// GET /api/accounts - List all accounts for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        balance: accounts.balance,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))
      .orderBy(desc(accounts.createdAt));

    return NextResponse.json({ accounts: userAccounts });

  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, balance } = body;

    if (!name || !type) {
      return NextResponse.json({
        error: 'name and type are required'
      }, { status: 400 });
    }

    const validTypes = ['Bank Account', 'Credit Card', 'Cash', 'Investment', 'Other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: `type must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    const newAccount: NewAccount = {
      userId: session.user.id,
      name,
      type,
      balance: balance ? balance.toString() : '0.00',
    };

    const [account] = await db
      .insert(accounts)
      .values(newAccount)
      .returning();

    return NextResponse.json(account, { status: 201 });

  } catch (error) {
    console.error('Failed to create account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}