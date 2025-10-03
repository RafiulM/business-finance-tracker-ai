import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/services/transaction-service';
import { auditService } from '@/lib/services/audit-service';
import { validateSession } from '@/lib/middleware/auth';

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactionId = params.id;
    const updateData = await request.json();

    // Validate transaction exists and belongs to user
    const existingTransaction = await transactionService.getTransactionById(transactionId, userId);
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Validate amount if provided
    if (updateData.amount !== undefined) {
      if (typeof updateData.amount !== 'number' || updateData.amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate date if provided
    if (updateData.date !== undefined) {
      if (isNaN(Date.parse(updateData.date))) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
    }

    // Validate transaction type if provided
    if (updateData.type !== undefined) {
      if (!['income', 'expense'].includes(updateData.type)) {
        return NextResponse.json(
          { error: 'Transaction type must be either "income" or "expense"' },
          { status: 400 }
        );
      }
    }

    // Store old values for audit
    const oldValues = {
      description: existingTransaction.description,
      amount: existingTransaction.amount,
      type: existingTransaction.type,
      categoryId: existingTransaction.categoryId,
      date: existingTransaction.date,
      currency: existingTransaction.currency,
      needsReview: existingTransaction.needsReview,
    };

    // Update transaction
    const updatedTransaction = await transactionService.updateTransaction(
      transactionId,
      userId,
      updateData
    );

    // Log the update
    await auditService.createAuditLog({
      userId,
      entityType: 'transaction',
      entityId: transactionId,
      action: 'update',
      oldValue: oldValues,
      newValue: updateData,
      reason: 'User updated transaction',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      transaction: updatedTransaction,
      message: 'Transaction updated successfully',
    });

  } catch (error) {
    console.error('Update transaction error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('not found') ||
          error.message.includes('does not belong to user') ||
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

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactionId = params.id;

    // Validate transaction exists and belongs to user
    const existingTransaction = await transactionService.getTransactionById(transactionId, userId);
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Store values for audit before deletion
    const transactionValues = {
      description: existingTransaction.description,
      amount: existingTransaction.amount,
      type: existingTransaction.type,
      categoryId: existingTransaction.categoryId,
      date: existingTransaction.date,
      currency: existingTransaction.currency,
    };

    // Delete transaction
    await transactionService.deleteTransaction(transactionId, userId);

    // Log the deletion
    await auditService.createAuditLog({
      userId,
      entityType: 'transaction',
      entityId: transactionId,
      action: 'delete',
      oldValue: transactionValues,
      newValue: null,
      reason: 'User deleted transaction',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      message: 'Transaction deleted successfully',
    });

  } catch (error) {
    console.error('Delete transaction error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}