import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/services/transaction-service';
import { insightService } from '@/lib/services/insight-service';
import { assetService } from '@/lib/services/asset-service';
import { validateSession, logApiAccess } from '@/lib/middleware/auth';
import { auditService } from '@/lib/services/audit-service';

export async function GET(request: NextRequest) {
  try {
    // Validate session and get user ID
    const userId = await validateSession(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // Default to 30 days
    const currency = searchParams.get('currency') || 'USD';
    const includeInsights = searchParams.get('includeInsights') !== 'false'; // Default to true
    const includeAssets = searchParams.get('includeAssets') !== 'false'; // Default to true

    // Calculate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period);

    // Get transaction statistics for the period
    const transactionStats = await transactionService.getTransactionStats(
      userId,
      startDate,
      endDate
    );

    // Get recent transactions
    const recentTransactions = await transactionService.getRecentTransactions(userId, 5);

    // Get monthly trends for the last 12 months
    const monthlyTrends = await transactionService.getMonthlyTrends(userId, 12);

    // Get transactions needing review
    const transactionsNeedingReview = await transactionService.getTransactionsNeedingReview(userId, 5);

    // Get insights if requested
    let recentInsights = [];
    if (includeInsights) {
      const dashboardInsights = await insightService.getDashboardInsights(userId, 5);
      recentInsights = dashboardInsights.unread.slice(0, 3); // Top 3 unread insights
    }

    // Get asset summary if requested
    let assetSummary = null;
    if (includeAssets) {
      const assetStats = await assetService.getAssetStats(userId);
      assetSummary = {
        totalAssets: assetStats.totalAssets,
        totalValue: assetStats.totalValue,
        totalGainLoss: assetStats.totalGainLoss,
        percentageGainLoss: assetStats.percentageGainLoss,
        topAssets: assetStats.mostValuableAssets.slice(0, 3),
      };
    }

    // Build category breakdown with enhanced data
    const categoryBreakdown = await Promise.all(
      transactionStats.categoryBreakdown.map(async (cat) => {
        const categoryTransactions = await transactionService.getTransactionsByCategory(
          userId,
          cat.categoryId,
          3
        );

        return {
          ...cat,
          recentTransactions: categoryTransactions.slice(0, 3).map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            date: t.date,
          })),
          trend: await getCategoryTrend(userId, cat.categoryId, startDate, endDate),
        };
      })
    );

    // Calculate performance metrics
    const performanceMetrics = {
      averageTransactionValue: transactionStats.transactionCount > 0
        ? (transactionStats.totalIncome + transactionStats.totalExpenses) / transactionStats.transactionCount
        : 0,
      largestTransaction: transactionStats.transactionCount > 0
        ? Math.max(...recentTransactions.map(t => t.amount))
        : 0,
      smallestTransaction: transactionStats.transactionCount > 0
        ? Math.min(...recentTransactions.map(t => t.amount))
        : 0,
      mostActiveDay: await getMostActiveDay(userId, startDate, endDate),
      categoryDiversity: transactionStats.categoryBreakdown.length,
      savingsRate: transactionStats.totalIncome > 0
        ? ((transactionStats.netIncome / transactionStats.totalIncome) * 100)
        : 0,
    };

    // Build response
    const dashboardData = {
      summary: {
        totalIncome: transactionStats.totalIncome,
        totalExpenses: transactionStats.totalExpenses,
        netIncome: transactionStats.netIncome,
        transactionCount: transactionStats.transactionCount,
        averageTransaction: performanceMetrics.averageTransactionValue,
        currency,
        period,
        savingsRate: performanceMetrics.savingsRate,
      },
      trends: {
        incomeTrend: formatMonthlyTrends(monthlyTrends, 'income'),
        expenseTrend: formatMonthlyTrends(monthlyTrends, 'expense'),
        netIncomeTrend: formatMonthlyTrends(monthlyTrends, 'net'),
      },
      categories: categoryBreakdown,
      recentTransactions: recentTransactions.slice(0, 5),
      transactionsNeedingReview: transactionsNeedingReview.slice(0, 5),
      recentInsights,
      performanceMetrics,
      assetSummary,
      period: {
        startDate,
        endDate,
        label: getPeriodLabel(period),
      },
    };

    // Log dashboard access
    await auditService.createAuditLog({
      userId,
      entityType: 'dashboard',
      entityId: 'overview',
      action: 'read',
      oldValue: null,
      newValue: {
        period,
        currency,
        includeInsights,
        includeAssets,
        dataPoints: {
          transactionCount: transactionStats.transactionCount,
          insightCount: recentInsights.length,
          assetCount: assetSummary?.totalAssets || 0,
        }
      },
      reason: 'User viewed dashboard overview',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Log API access
    await logApiAccess(request, userId, 'dashboard', 'overview', 'GET', true);

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard overview error:', error);

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

/**
 * Get date range from period string
 */
function getDateRangeFromPeriod(period: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Format monthly trends for specific type
 */
function formatMonthlyTrends(monthlyTrends: any[], type: 'income' | 'expense' | 'net'): any[] {
  return monthlyTrends.map(trend => ({
    date: trend.month,
    amount: type === 'income' ? trend.income :
             type === 'expense' ? trend.expenses :
             trend.net,
  }));
}

/**
 * Get trend data for a specific category
 */
async function getCategoryTrend(
  userId: string,
  categoryId: string,
  startDate: string,
  endDate: string
): Promise<{ currentPeriod: number; previousPeriod: number; trend: 'up' | 'down' | 'stable' }> {
  // Get current period data
  const currentStats = await transactionService.getTransactionStats(
    userId,
    startDate,
    endDate,
    categoryId
  );

  // Calculate previous period of same length
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - daysDiff);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const previousStats = await transactionService.getTransactionStats(
    userId,
    prevStart.toISOString().split('T')[0],
    prevEnd.toISOString().split('T')[0],
    categoryId
  );

  const currentTotal = currentStats.totalIncome + currentStats.totalExpenses;
  const previousTotal = previousStats.totalIncome + previousStats.totalExpenses;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (currentTotal > previousTotal * 1.1) {
    trend = 'up';
  } else if (currentTotal < previousTotal * 0.9) {
    trend = 'down';
  }

  return {
    currentPeriod: currentTotal,
    previousPeriod: previousTotal,
    trend,
  };
}

/**
 * Get most active day within a period
 */
async function getMostActiveDay(
  userId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  try {
    const transactions = await transactionService.getUserTransactions(userId, {
      startDate,
      endDate,
      limit: 1000, // Reasonable limit for processing
    });

    const dayActivity: Record<string, number> = {};

    transactions.transactions.forEach(transaction => {
      const day = transaction.date.toISOString().split('T')[0];
      dayActivity[day] = (dayActivity[day] || 0) + 1;
    });

    const mostActiveDay = Object.entries(dayActivity)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return mostActiveDay || '';
  } catch (error) {
    console.error('Error getting most active day:', error);
    return '';
  }
}

/**
 * Get human-readable period label
 */
function getPeriodLabel(period: string): string {
  switch (period) {
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    case '1y':
      return 'Last year';
    default:
      return 'Last 30 days';
  }
}