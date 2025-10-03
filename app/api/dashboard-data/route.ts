import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import { transactions, accounts, assets, insights } from '@/db/schema/finance';

// GET /api/dashboard-data - Get aggregated financial data for dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30'; // Default to last 30 days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(range));

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all data in parallel for better performance
    const [
      totalIncome,
      totalExpenses,
      netWorth,
      transactionsByCategory,
      recentTransactions,
      totalAssets,
      recentAssets,
      unreadInsights,
      monthlyIncomeExpense,
      accountsSummary
    ] = await Promise.all([
      // Total income in the period
      db
        .select({
          total: sql<number>`sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end)`.mapWith(Number)
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, session.user.id),
          gte(transactions.transactionDate, startDateStr),
          lte(transactions.transactionDate, endDateStr)
        )),

      // Total expenses in the period
      db
        .select({
          total: sql<number>`sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end)`.mapWith(Number)
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, session.user.id),
          gte(transactions.transactionDate, startDateStr),
          lte(transactions.transactionDate, endDateStr)
        )),

      // Net worth (accounts balance + assets value)
      db
        .select({
          total: sql<number>`(select sum(${accounts.balance}) from ${accounts} where ${accounts.userId} = ${session.user.id}) + (select sum(${assets.currentValue}) from ${assets} where ${assets.userId} = ${session.user.id})`.mapWith(Number)
        })
        .from(accounts)
        .limit(1),

      // Transactions by category
      db
        .select({
          category: transactions.category,
          type: transactions.type,
          total: sql<number>`sum(${transactions.amount})`.mapWith(Number)
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, session.user.id),
          gte(transactions.transactionDate, startDateStr),
          lte(transactions.transactionDate, endDateStr)
        ))
        .groupBy(transactions.category, transactions.type),

      // Recent transactions
      db
        .select({
          id: transactions.id,
          accountName: accounts.name,
          type: transactions.type,
          amount: transactions.amount,
          description: transactions.description,
          category: transactions.category,
          transactionDate: transactions.transactionDate,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(eq(transactions.userId, session.user.id))
        .orderBy(desc(transactions.transactionDate))
        .limit(10),

      // Total assets value
      db
        .select({
          count: sql<number>`count(${assets.id})`.mapWith(Number),
          total: sql<number>`sum(${assets.currentValue})`.mapWith(Number)
        })
        .from(assets)
        .where(eq(assets.userId, session.user.id)),

      // Recent assets
      db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          initialValue: assets.initialValue,
          currentValue: assets.currentValue,
          acquisitionDate: assets.acquisitionDate,
        })
        .from(assets)
        .where(eq(assets.userId, session.user.id))
        .orderBy(desc(assets.createdAt))
        .limit(5),

      // Unread insights
      db
        .select({
          id: insights.id,
          content: insights.content,
          generatedAt: insights.generatedAt,
        })
        .from(insights)
        .where(and(
          eq(insights.userId, session.user.id),
          eq(insights.isRead, false)
        ))
        .orderBy(desc(insights.generatedAt))
        .limit(3),

      // Monthly income/expense trends (last 6 months)
      db
        .select({
          month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
          income: sql<number>`sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end)`.mapWith(Number),
          expenses: sql<number>`sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end)`.mapWith(Number)
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, session.user.id),
          gte(transactions.transactionDate, new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1).toISOString().split('T')[0])
        ))
        .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`),

      // Accounts summary
      db
        .select({
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
          balance: accounts.balance,
        })
        .from(accounts)
        .where(eq(accounts.userId, session.user.id))
    ]);

    const totalIncomeAmount = totalIncome[0]?.total || 0;
    const totalExpensesAmount = totalExpenses[0]?.total || 0;
    const netWorthAmount = netWorth[0]?.total || 0;
    const cashFlow = totalIncomeAmount - totalExpensesAmount;

    return NextResponse.json({
      summary: {
        totalIncome: totalIncomeAmount,
        totalExpenses: totalExpensesAmount,
        cashFlow,
        netWorth: netWorthAmount,
        dateRange: {
          startDate: startDateStr,
          endDate: endDateStr,
          days: parseInt(range)
        }
      },
      transactionsByCategory,
      recentTransactions,
      assets: {
        count: totalAssets[0]?.count || 0,
        totalValue: totalAssets[0]?.total || 0,
        recent: recentAssets
      },
      insights: unreadInsights,
      monthlyTrends: monthlyIncomeExpense,
      accounts: accountsSummary
    });

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}