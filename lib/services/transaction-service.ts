import { db } from '@/db';
import {
  transaction,
  category,
  user,
  type Transaction,
  type NewTransaction,
  type TransactionStatus,
  type TransactionType
} from '@/db/schema';
import { eq, and, desc, asc, ilike, between, gte, lte, inArray, sql } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(transactionData: {
    description: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    date: string;
    currency?: string;
    confidence?: number;
    needsReview?: boolean;
    processedDescription?: string;
    metadata?: Record<string, any>;
    userId: string;
  }): Promise<Transaction> {
    // Validate category exists and belongs to user
    const categoryRecord = await db
      .select()
      .from(category)
      .where(
        and(
          eq(category.id, transactionData.categoryId),
          eq(category.userId, transactionData.userId),
          eq(category.deletedAt, null)
        )
      )
      .limit(1);

    if (categoryRecord.length === 0) {
      throw new Error('Category not found or does not belong to user');
    }

    // Validate amount
    if (transactionData.amount <= 0) {
      throw new Error('Transaction amount must be greater than 0');
    }

    // Validate date
    const transactionDate = new Date(transactionData.date);
    if (isNaN(transactionDate.getTime())) {
      throw new Error('Invalid transaction date');
    }

    // Don't allow future dates for most transactions
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (transactionDate > today) {
      throw new Error('Transaction date cannot be in the future');
    }

    const newTransaction: NewTransaction = {
      id: createId(),
      description: transactionData.description.trim(),
      amount: transactionData.amount,
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      date: transactionDate,
      currency: transactionData.currency || 'USD',
      confidence: transactionData.confidence || 100,
      needsReview: transactionData.needsReview || false,
      processedDescription: transactionData.processedDescription || transactionData.description.trim(),
      status: 'confirmed' as TransactionStatus,
      metadata: transactionData.metadata || {},
      userId: transactionData.userId,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdTransaction] = await db
      .insert(transaction)
      .values(newTransaction)
      .returning();

    // Add category information to the response
    const transactionWithCategory = {
      ...createdTransaction,
      category: categoryRecord[0]
    };

    return transactionWithCategory as Transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string, userId: string): Promise<Transaction | null> {
    const [transactionRecord] = await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.id, transactionId),
          eq(transaction.userId, userId),
          eq(transaction.deletedAt, null)
        )
      )
      .limit(1);

    return transactionRecord || null;
  }

  /**
   * Get all transactions for a user with pagination
   */
  async getUserTransactions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: TransactionType;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      status?: TransactionStatus;
      needsReview?: boolean;
      sortBy?: 'date' | 'amount' | 'description';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    transactions: Transaction[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 50,
      offset = 0,
      type,
      categoryId,
      startDate,
      endDate,
      search,
      status,
      needsReview,
      sortBy = 'date',
      sortOrder = 'desc'
    } = options;

    // Build conditions
    const conditions = [
      eq(transaction.userId, userId),
      eq(transaction.deletedAt, null)
    ];

    if (type) {
      conditions.push(eq(transaction.type, type));
    }

    if (categoryId) {
      conditions.push(eq(transaction.categoryId, categoryId));
    }

    if (status) {
      conditions.push(eq(transaction.status, status));
    }

    if (needsReview !== undefined) {
      conditions.push(eq(transaction.needsReview, needsReview));
    }

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(transaction.date, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(transaction.date, end));
    }

    if (search) {
      conditions.push(ilike(transaction.description, `%${search.toLowerCase()}%`));
    }

    // Build order by
    let orderBy;
    if (sortBy === 'date') {
      orderBy = sortOrder === 'asc' ? asc(transaction.date) : desc(transaction.date);
    } else if (sortBy === 'amount') {
      orderBy = sortOrder === 'asc' ? asc(transaction.amount) : desc(transaction.amount);
    } else if (sortBy === 'description') {
      orderBy = sortOrder === 'asc' ? asc(transaction.description) : desc(transaction.description);
    } else {
      orderBy = desc(transaction.date);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transaction)
      .where(and(...conditions));

    const count = countResult[0]?.count || 0;

    // Get transactions
    const transactions = await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      transactions,
      total: Number(count),
      hasMore: offset + transactions.length < Number(count)
    };
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    transactionId: string,
    userId: string,
    updateData: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
  ): Promise<Transaction> {
    const existingTransaction = await this.getTransactionById(transactionId, userId);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    // Validate category if provided
    if (updateData.categoryId) {
      const categoryRecord = await db
        .select()
        .from(category)
        .where(
          and(
            eq(category.id, updateData.categoryId),
            eq(category.userId, userId),
            eq(category.deletedAt, null)
          )
        )
        .limit(1);

      if (categoryRecord.length === 0) {
        throw new Error('Category not found or does not belong to user');
      }
    }

    // Validate amount if provided
    if (updateData.amount !== undefined && updateData.amount <= 0) {
      throw new Error('Transaction amount must be greater than 0');
    }

    // Validate date if provided
    if (updateData.date) {
      const transactionDate = new Date(updateData.date);
      if (isNaN(transactionDate.getTime())) {
        throw new Error('Invalid transaction date');
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (transactionDate > today) {
        throw new Error('Transaction date cannot be in the future');
      }
    }

    // Clear needsReview flag if transaction is manually updated
    const finalUpdateData = {
      ...updateData,
      needsReview: false,
      updatedAt: new Date(),
    };

    const [updatedTransaction] = await db
      .update(transaction)
      .set(finalUpdateData)
      .where(eq(transaction.id, transactionId))
      .returning();

    // Add category information to the response
    const transactionWithCategory = await this.getTransactionById(transactionId, userId);

    return transactionWithCategory!;
  }

  /**
   * Soft delete transaction
   */
  async deleteTransaction(transactionId: string, userId: string): Promise<void> {
    const existingTransaction = await this.getTransactionById(transactionId, userId);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    await db
      .update(transaction)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transaction.id, transactionId));
  }

  /**
   * Bulk delete transactions
   */
  async bulkDeleteTransactions(transactionIds: string[], userId: string): Promise<number> {
    if (transactionIds.length === 0) {
      return 0;
    }

    // Verify all transactions belong to user
    const userTransactions = await db
      .select()
      .from(transaction)
      .where(
        and(
          inArray(transaction.id, transactionIds),
          eq(transaction.userId, userId),
          eq(transaction.deletedAt, null)
        )
      );

    if (userTransactions.length !== transactionIds.length) {
      throw new Error('Some transactions not found or do not belong to user');
    }

    const result = await db
      .update(transaction)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(transaction.id, transactionIds));

    return result.rowCount || 0;
  }

  /**
   * Mark transaction as reviewed
   */
  async markTransactionReviewed(transactionId: string, userId: string): Promise<Transaction> {
    const existingTransaction = await this.getTransactionById(transactionId, userId);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    const updatedTransaction = await this.updateTransaction(transactionId, userId, {
      needsReview: false,
      status: 'confirmed'
    });

    return updatedTransaction;
  }

  /**
   * Get transactions that need review
   */
  async getTransactionsNeedingReview(
    userId: string,
    limit: number = 20
  ): Promise<Transaction[]> {
    return await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.needsReview, true),
          eq(transaction.deletedAt, null)
        )
      )
      .orderBy(desc(transaction.date))
      .limit(limit);
  }

  /**
   * Get transaction statistics for a date range
   */
  async getTransactionStats(
    userId: string,
    startDate: string,
    endDate: string,
    categoryId?: string
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
    averageTransaction: number;
    largestTransaction: number;
    smallestTransaction: number;
    categoryBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
      percentage: number;
      transactionCount: number;
      type: TransactionType;
    }>;
  }> {
    const conditions = [
      eq(transaction.userId, userId),
      gte(transaction.date, new Date(startDate)),
      lte(transaction.date, new Date(endDate)),
      eq(transaction.deletedAt, null)
    ];

    if (categoryId) {
      conditions.push(eq(transaction.categoryId, categoryId));
    }

    const transactions = await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(...conditions));

    if (transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: 0,
        averageTransaction: 0,
        largestTransaction: 0,
        smallestTransaction: 0,
        categoryBreakdown: [],
      };
    }

    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const amounts = transactions.map(t => t.amount);
    const largestTransaction = Math.max(...amounts);
    const smallestTransaction = Math.min(...amounts);
    const averageTransaction = totalIncome + totalExpenses / transactions.length;

    // Calculate category breakdown
    const categoryMap = new Map();

    transactions.forEach(t => {
      const key = `${t.category?.id}-${t.type}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: t.category?.id || 'uncategorized',
          categoryName: t.category?.name || 'Uncategorized',
          amount: 0,
          transactionCount: 0,
          type: t.type,
        });
      }

      const category = categoryMap.get(key);
      category.amount += t.amount;
      category.transactionCount += 1;
    });

    const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      percentage: ((cat.amount / (totalIncome + totalExpenses)) * 100).toFixed(2),
    }));

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      transactionCount: transactions.length,
      averageTransaction,
      largestTransaction,
      smallestTransaction,
      categoryBreakdown,
    };
  }

  /**
   * Search transactions
   */
  async searchTransactions(
    userId: string,
    query: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    return await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          ilike(transaction.description, `%${query.toLowerCase()}%`),
          eq(transaction.deletedAt, null)
        )
      )
      .orderBy(desc(transaction.date))
      .limit(limit);
  }

  /**
   * Get transactions by category
   */
  async getTransactionsByCategory(
    userId: string,
    categoryId: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    return await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.categoryId, categoryId),
          eq(transaction.deletedAt, null)
        )
      )
      .orderBy(desc(transaction.date))
      .limit(limit);
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(
    userId: string,
    limit: number = 10
  ): Promise<Transaction[]> {
    return await db
      .select({
        ...transaction,
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        }
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.deletedAt, null)
        )
      )
      .orderBy(desc(transaction.date))
      .limit(limit);
  }

  /**
   * Get monthly trend data
   */
  async getMonthlyTrend(
    userId: string,
    months: number = 12
  ): Promise<Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await db
      .select()
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, userId),
          gte(transaction.date, startDate),
          lte(transaction.date, endDate),
          eq(transaction.deletedAt, null)
        )
      )
      .orderBy(asc(transaction.date));

    // Group by month
    const monthlyData = new Map();

    transactions.forEach(t => {
      const monthKey = t.date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0 });
      }

      const monthData = monthlyData.get(monthKey);
      if (t.type === 'income') {
        monthData.income += t.amount;
      } else {
        monthData.expenses += t.amount;
      }
    });

    // Convert to array and calculate net
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Validate transaction data
   */
  private validateTransactionData(transactionData: any): void {
    if (!transactionData.description || typeof transactionData.description !== 'string') {
      throw new Error('Transaction description is required and must be a string');
    }

    if (!transactionData.amount || typeof transactionData.amount !== 'number' || transactionData.amount <= 0) {
      throw new Error('Transaction amount is required and must be greater than 0');
    }

    if (!transactionData.type || !['income', 'expense'].includes(transactionData.type)) {
      throw new Error('Transaction type must be either "income" or "expense"');
    }

    if (!transactionData.categoryId || typeof transactionData.categoryId !== 'string') {
      throw new Error('Category ID is required');
    }

    if (!transactionData.date || typeof transactionData.date !== 'string') {
      throw new Error('Transaction date is required');
    }

    const description = transactionData.description.trim();
    if (description.length < 3) {
      throw new Error('Transaction description must be at least 3 characters long');
    }

    if (description.length > 500) {
      throw new Error('Transaction description cannot exceed 500 characters');
    }

    if (transactionData.amount > 999999999) {
      throw new Error('Transaction amount is too large');
    }
  }

  /**
   * Create transaction with validation
   */
  async createTransactionWithValidation(transactionData: {
    description: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    date: string;
    currency?: string;
    confidence?: number;
    needsReview?: boolean;
    processedDescription?: string;
    metadata?: Record<string, any>;
    userId: string;
  }): Promise<Transaction> {
    this.validateTransactionData(transactionData);
    return this.createTransaction(transactionData);
  }
}

// Export singleton instance
export const transactionService = new TransactionService();