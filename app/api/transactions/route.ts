import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/services/transaction-service';
import { auditService } from '@/lib/services/audit-service';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/transactions - Get user's transactions
export async function GET(request: NextRequest) {
  try {
    // Validate session using Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const options = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      type: searchParams.get('type') as 'income' | 'expense' | undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as 'pending' | 'confirmed' | 'rejected' | undefined,
      needsReview: searchParams.get('needsReview') === 'true' ? true :
                   searchParams.get('needsReview') === 'false' ? false : undefined,
      sortBy: searchParams.get('sortBy') as 'date' | 'amount' | 'description' | undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' | undefined,
    };

    const result = await transactionService.getUserTransactions(session.user.id, options);

    // Log the read operation
    await auditService.createAuditLog({
      userId: session.user.id,
      entityType: 'transaction',
      entityId: 'batch',
      action: 'read',
      oldValue: null,
      newValue: { options, resultCount: result.transactions.length },
      reason: 'User retrieved transactions',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      transactions: result.transactions,
      total: result.total,
      hasMore: result.hasMore,
      limit: options.limit,
      offset: options.offset,
    });

  } catch (error) {
    console.error('Get transactions error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactionData = await request.json();

    // Validate required fields
    const requiredFields = ['description', 'amount', 'type', 'categoryId', 'date'];
    for (const field of requiredFields) {
      if (!transactionData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate transaction type
    if (!['income', 'expense'].includes(transactionData.type)) {
      return NextResponse.json(
        { error: 'Transaction type must be either "income" or "expense"' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof transactionData.amount !== 'number' || transactionData.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate date
    if (isNaN(Date.parse(transactionData.date))) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = await transactionService.createTransactionWithValidation({
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      date: transactionData.date,
      currency: transactionData.currency || 'USD',
      confidence: transactionData.confidence,
      needsReview: transactionData.needsReview,
      processedDescription: transactionData.processedDescription,
      metadata: transactionData.metadata,
      userId,
    });

    // Log the creation
    await auditService.createAuditLog({
      userId,
      entityType: 'transaction',
      entityId: transaction.id,
      action: 'create',
      oldValue: null,
      newValue: {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        date: transaction.date,
        currency: transaction.currency,
      },
      reason: 'User created a new transaction',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      transaction,
      message: 'Transaction created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create transaction error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('not found') ||
          error.message.includes('does not belong to user') ||
          error.message.includes('required') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}