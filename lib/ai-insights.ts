import OpenAI from 'openai';
import { db } from '@/db';
import { transactions, insights, assets, accounts } from '@/db/schema/finance';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INSIGHTS_PROMPT = `You are an expert financial analyst. Based on the provided financial data, generate 2-3 actionable insights and recommendations for a small business owner. The insights should be:

1. Specific and actionable
2. Based on actual data trends
3. Helpful for improving financial health
4. Professional but easy to understand

Focus on areas like:
- Spending patterns and potential savings
- Cash flow management
- Revenue trends
- Expense optimization
- Investment opportunities
- Risk areas

Please format each insight as a separate paragraph, starting with a clear headline in bold. Be encouraging and constructive.`;

export async function generateFinancialInsights(userId: string): Promise<string[]> {
  try {
    // Get financial data for the last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Gather comprehensive financial data
    const [
      recentTransactions,
      expenseByCategory,
      monthlyTrends,
      accountsSummary,
      assetsSummary
    ] = await Promise.all([
      // Recent transactions
      db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          category: transactions.category,
          description: transactions.description,
          transactionDate: transactions.transactionDate,
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startDateStr)
        ))
        .orderBy(desc(transactions.transactionDate))
        .limit(50),

      // Expenses by category
      db
        .select({
          category: transactions.category,
          total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
          count: sql<number>`count(${transactions.id})`.mapWith(Number)
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'expense'),
          gte(transactions.transactionDate, startDateStr)
        ))
        .groupBy(transactions.category)
        .orderBy(desc(sql`sum(${transactions.amount})`)),

      // Monthly trends (last 6 months)
      db
        .select({
          month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
          income: sql<number>`sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end)`.mapWith(Number),
          expenses: sql<number>`sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end)`.mapWith(Number)
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1).toISOString().split('T')[0])
        ))
        .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`),

      // Accounts summary
      db
        .select({
          totalBalance: sql<number>`sum(${accounts.balance})`.mapWith(Number),
          accountCount: sql<number>`count(${accounts.id})`.mapWith(Number)
        })
        .from(accounts)
        .where(eq(accounts.userId, userId)),

      // Assets summary
      db
        .select({
          totalValue: sql<number>`sum(${assets.currentValue})`.mapWith(Number),
          assetCount: sql<number>`count(${assets.id})`.mapWith(Number)
        })
        .from(assets)
        .where(eq(assets.userId, userId))
    ]);

    // Calculate additional metrics
    const totalIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const averageMonthlyBurn = totalExpenses / 3; // 3 months
    const runway = netCashFlow > 0 ? (accountsSummary[0]?.totalBalance || 0) / averageMonthlyBurn : 0;

    // Prepare data for AI analysis
    const financialData = {
      period: `Last 90 days (${startDateStr} to ${endDateStr})`,
      summary: {
        totalIncome,
        totalExpenses,
        netCashFlow,
        averageMonthlyBurn: averageMonthlyBurn.toFixed(2),
        runway: runway.toFixed(1),
      },
      accounts: {
        count: accountsSummary[0]?.accountCount || 0,
        totalBalance: accountsSummary[0]?.totalBalance || 0,
      },
      assets: {
        count: assetsSummary[0]?.assetCount || 0,
        totalValue: assetsSummary[0]?.totalValue || 0,
      },
      expenseBreakdown: expenseByCategory.map(cat => ({
        category: cat.category,
        amount: cat.total,
        percentage: ((cat.total / totalExpenses) * 100).toFixed(1)
      })),
      monthlyTrends: monthlyTrends,
      topExpenseCategories: expenseByCategory.slice(0, 5),
    };

    // Generate insights using AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: INSIGHTS_PROMPT
        },
        {
          role: "user",
          content: `Here's my financial data for analysis:

${JSON.stringify(financialData, null, 2)}

Please provide insights based on this data.`
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const insightsText = completion.choices[0]?.message?.content;

    if (!insightsText) {
      throw new Error('Failed to generate insights');
    }

    // Split insights into separate paragraphs and clean them up
    const insights = insightsText
      .split('\n\n')
      .filter(insight => insight.trim().length > 20)
      .map(insight => insight.trim());

    // Save insights to database
    for (const insight of insights) {
      await db.insert(insights).values({
        userId,
        content: insight,
      });
    }

    return insights;

  } catch (error) {
    console.error('Error generating financial insights:', error);
    throw new Error('Failed to generate insights');
  }
}

// Function to check if we should generate new insights
export async function shouldGenerateInsights(userId: string): Promise<boolean> {
  const recentInsight = await db
    .select({ id: insights.id })
    .from(insights)
    .where(eq(insights.userId, userId))
    .orderBy(desc(insights.generatedAt))
    .limit(1);

  // If no insights exist, generate them
  if (recentInsight.length === 0) {
    return true;
  }

  // Check if we have recent transactions (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentTransactions = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.createdAt, sevenDaysAgo)
    ))
    .limit(1);

  // Generate insights if there are recent transactions
  return recentTransactions.length > 0;
}

// Function to get user-friendly insight status
export async function getInsightStatus(userId: string): Promise<{
  hasUnread: boolean;
  lastGenerated: Date | null;
  canGenerate: boolean;
}> {
  const [unreadCount, lastInsight] = await Promise.all([
    db
      .select({ count: insights.id })
      .from(insights)
      .where(and(
        eq(insights.userId, userId),
        eq(insights.isRead, false)
      ))
      .then(result => result.length),

    db
      .select({ generatedAt: insights.generatedAt })
      .from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.generatedAt))
      .limit(1)
  ]);

  const canGenerate = await shouldGenerateInsights(userId);

  return {
    hasUnread: unreadCount > 0,
    lastGenerated: lastInsight[0]?.generatedAt || null,
    canGenerate,
  };
}