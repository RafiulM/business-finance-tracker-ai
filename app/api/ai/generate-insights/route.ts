import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/services/transaction-service';
import { insightService } from '@/lib/services/insight-service';
import { validateSession, checkRateLimit, logApiAccess } from '@/lib/middleware/auth';
import { auditService } from '@/lib/services/audit-service';

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

    // Rate limiting for AI insights (more restrictive due to computational cost)
    const clientIp = request.ip || 'unknown';
    const rateLimitResult = checkRateLimit(`ai-insights:${userId}`, 5, 60 * 1000); // 5 requests per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many insight generation requests. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    const requestBody = await request.json();
    const {
      timePeriod,
      focusAreas = ['spending_trends', 'anomalies', 'cash_flow', 'recommendations'],
      options = {}
    } = requestBody;

    // Validate time period
    if (!timePeriod || !timePeriod.startDate || !timePeriod.endDate) {
      return NextResponse.json(
        { error: 'Time period with startDate and endDate is required' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(timePeriod.startDate);
    const endDate = new Date(timePeriod.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Don't allow analysis for periods longer than 1 year
    const maxPeriod = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxPeriod) {
      return NextResponse.json(
        { error: 'Time period cannot exceed 1 year' },
        { status: 400 }
      );
    }

    // Get transaction data for the period
    const transactions = await transactionService.getUserTransactions(userId, {
      startDate: timePeriod.startDate,
      endDate: timePeriod.endDate,
      limit: 1000, // Limit to prevent excessive processing
      sortBy: 'date',
      sortOrder: 'desc'
    });

    if (transactions.transactions.length === 0) {
      return NextResponse.json({
        insights: [],
        message: 'No transactions found in the specified time period',
        summary: {
          totalTransactions: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
        }
      });
    }

    // Generate insights using AI
    const insights = await generateInsights({
      userId,
      transactions: transactions.transactions,
      timePeriod,
      focusAreas,
      options,
    });

    // Batch create insights in database
    const createdInsights = await insightService.createBatchInsights(
      userId,
      insights.map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        impact: insight.impact,
        categoryId: insight.categoryId,
        timePeriod: insight.timePeriod,
        data: insight.data,
        recommendations: insight.recommendations,
      }))
    );

    // Log insight generation
    await auditService.createAuditLog({
      userId,
      entityType: 'ai_processing',
      entityId: 'insight_generation',
      action: 'create',
      oldValue: null,
      newValue: {
        timePeriod,
        focusAreas,
        transactionCount: transactions.transactions.length,
        insightsGenerated: createdInsights.length,
        processingTime: insights.reduce((sum, insight) => sum + (insight.processingTime || 0), 0),
      },
      reason: 'AI insight generation request',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Log API access
    await logApiAccess(request, userId, 'ai', 'generate-insights', 'POST', true);

    return NextResponse.json({
      insights: createdInsights,
      summary: {
        totalTransactions: transactions.transactions.length,
        totalIncome: transactions.transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transactions.transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0),
        insightsGenerated: createdInsights.length,
        focusAreasProcessed: focusAreas,
      },
      message: `Generated ${createdInsights.length} insights successfully`,
    });

  } catch (error) {
    console.error('AI insight generation error:', error);

    // Log failed API access
    try {
      const userId = await validateSession(request);
      if (userId) {
        await logApiAccess(request, userId, 'ai', 'generate-insights', 'POST', false, error instanceof Error ? error.message : 'Unknown error');
      }
    } catch (logError) {
      // Ignore logging errors
    }

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', message: error.message },
          { status: 429 }
        );
      }

      if (error.message.includes('AI service')) {
        return NextResponse.json(
          {
            error: 'AI service temporarily unavailable',
            message: 'Unable to generate insights at this time. Please try again later.',
          },
          { status: 503 }
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
 * Generate insights using AI (mock implementation)
 * In production, this would analyze transaction patterns using sophisticated algorithms
 */
async function generateInsights(params: {
  userId: string;
  transactions: any[];
  timePeriod: { startDate: string; endDate: string };
  focusAreas: string[];
  options: any;
}): Promise<any[]> {
  const startTime = Date.now();
  const { transactions, focusAreas } = params;

  const insights = [];

  // Separate income and expenses
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  // Generate insights based on focus areas
  if (focusAreas.includes('spending_trends')) {
    insights.push(...generateSpendingTrendInsights(expenseTransactions, totalExpenses));
  }

  if (focusAreas.includes('anomalies')) {
    insights.push(...generateAnomalyInsights(transactions));
  }

  if (focusAreas.includes('cash_flow')) {
    insights.push(...generateCashFlowInsights(totalIncome, totalExpenses, netIncome));
  }

  if (focusAreas.includes('recommendations')) {
    insights.push(...generateRecommendationInsights(transactions, totalExpenses));
  }

  // Add processing time to each insight
  const processingTime = Date.now() - startTime;
  insights.forEach(insight => {
    insight.processingTime = processingTime / insights.length;
  });

  return insights;
}

/**
 * Generate spending trend insights
 */
function generateSpendingTrendInsights(expenseTransactions: any[], totalExpenses: number): any[] {
  const insights = [];

  // Group expenses by category
  const categorySpending: Record<string, { amount: number; count: number; category: any }> = {};

  expenseTransactions.forEach(transaction => {
    const categoryName = transaction.category?.name || 'Uncategorized';
    if (!categorySpending[categoryName]) {
      categorySpending[categoryName] = {
        amount: 0,
        count: 0,
        category: transaction.category,
      };
    }
    categorySpending[categoryName].amount += transaction.amount;
    categorySpending[categoryName].count++;
  });

  // Find top spending category
  const topCategory = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b.amount - a.amount)[0];

  if (topCategory && totalExpenses > 0) {
    const [categoryName, data] = topCategory;
    const percentage = (data.amount / totalExpenses) * 100;

    if (percentage > 30) {
      insights.push({
        type: 'spending_trend',
        title: `${categoryName} Represents Major Expense Category`,
        description: `${categoryName} accounts for ${percentage.toFixed(1)}% of your total expenses, totaling $${(data.amount / 100).toFixed(2)}. Consider reviewing this spending category for optimization opportunities.`,
        confidence: 85,
        impact: percentage > 50 ? 'high' : 'medium',
        categoryId: data.category?.id || null,
        data: {
          metrics: {
            categorySpending: data.amount,
            totalExpenses,
            percentage,
            transactionCount: data.count,
          },
          trends: generateMockTrends(data.amount),
        },
        recommendations: [
          `Review ${categoryName} spending for potential cost reductions`,
          `Set a budget target for ${categoryName}`,
        ],
      });
    }
  }

  // Check for subscription/recurring expenses
  const recurringKeywords = ['subscription', 'monthly', 'annual', 'recurring'];
  const recurringExpenses = expenseTransactions.filter(t =>
    recurringKeywords.some(keyword =>
      t.description.toLowerCase().includes(keyword)
    )
  );

  if (recurringExpenses.length > 0) {
    const recurringTotal = recurringExpenses.reduce((sum, t) => sum + t.amount, 0);
    insights.push({
      type: 'spending_trend',
      title: 'Recurring Expenses Identified',
      description: `Found ${recurringExpenses.length} recurring expenses totaling $${(recurringTotal / 100).toFixed(2)} per month. These represent ${((recurringTotal / totalExpenses) * 100).toFixed(1)}% of your monthly expenses.`,
      confidence: 90,
      impact: recurringTotal > totalExpenses * 0.3 ? 'high' : 'medium',
      data: {
        metrics: {
          recurringCount: recurringExpenses.length,
          recurringTotal,
          percentageOfTotal: (recurringTotal / totalExpenses) * 100,
        },
        recurringTransactions: recurringExpenses.map(t => ({
          description: t.description,
          amount: t.amount,
          category: t.category?.name,
        })),
      },
      recommendations: [
        'Review recurring subscriptions for unused services',
        'Consider annual billing plans for discounts',
      ],
    });
  }

  return insights;
}

/**
 * Generate anomaly detection insights
 */
function generateAnomalyInsights(transactions: any[]): any[] {
  const insights = [];

  // Look for unusually large transactions
  const amounts = transactions.map(t => t.amount);
  const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const stdDev = Math.sqrt(
    amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length
  );

  const outliers = transactions.filter(t => Math.abs(t.amount - mean) > 2 * stdDev);

  if (outliers.length > 0) {
    const largestOutlier = outliers.reduce((max, t) => t.amount > max.amount ? t : max, outliers[0]);

    insights.push({
      type: 'anomaly',
      title: 'Unusually Large Transaction Detected',
      description: `Transaction "${largestOutlier.description}" for $${(largestOutlier.amount / 100).toFixed(2)} is significantly larger than your average transaction of $${(mean / 100).toFixed(2)}.`,
      confidence: 95,
      impact: largestOutlier.amount > mean * 3 ? 'high' : 'medium',
      categoryId: largestOutlier.categoryId,
      data: {
        metrics: {
          transactionAmount: largestOutlier.amount,
          averageAmount: mean,
          standardDeviation: stdDev,
          outlierScore: Math.abs(largestOutlier.amount - mean) / stdDev,
        },
        transaction: {
          id: largestOutlier.id,
          description: largestOutlier.description,
          amount: largestOutlier.amount,
          date: largestOutlier.date,
          category: largestOutlier.category?.name,
        },
      },
      recommendations: [
        'Verify this transaction is correct',
        'Consider if this expense was planned',
      ],
    });
  }

  return insights;
}

/**
 * Generate cash flow insights
 */
function generateCashFlowInsights(totalIncome: number, totalExpenses: number, netIncome: number): any[] {
  const insights = [];

  if (netIncome > 0) {
    insights.push({
      type: 'cash_flow',
      title: 'Positive Cash Flow This Period',
      description: `Your income exceeds expenses by $${(netIncome / 100).toFixed(2)}, providing healthy working capital for business operations.`,
      confidence: 98,
      impact: netIncome > totalIncome * 0.3 ? 'high' : 'medium',
      data: {
        metrics: {
          totalIncome,
          totalExpenses,
          netIncome,
          cashFlowRatio: totalIncome / totalExpenses,
        },
      },
      recommendations: [
        'Consider investing surplus in business growth',
        'Build emergency reserve fund',
      ],
    });
  } else {
    insights.push({
      type: 'cash_flow',
      title: 'Negative Cash Flow Detected',
      description: `Your expenses exceed income by $${(Math.abs(netIncome) / 100).toFixed(2)}. Review expenses and consider cost-cutting measures or revenue enhancement strategies.`,
      confidence: 95,
      impact: 'high',
      data: {
        metrics: {
          totalIncome,
          totalExpenses,
          netIncome,
          deficit: Math.abs(netIncome),
          burnRate: Math.abs(netIncome) / 30, // Daily burn rate
        },
      },
      recommendations: [
        'Review and reduce non-essential expenses',
        'Explore additional revenue streams',
        'Consider short-term financing options',
      ],
    });
  }

  return insights;
}

/**
 * Generate recommendation insights
 */
function generateRecommendationInsights(transactions: any[], totalExpenses: number): any[] {
  const insights = [];

  // Check for potential tax deductions
  const businessKeywords = ['office', 'software', 'equipment', 'travel', 'supplies', 'marketing'];
  const businessExpenses = transactions.filter(t =>
    businessKeywords.some(keyword =>
      t.description.toLowerCase().includes(keyword) && t.type === 'expense'
    )
  );

  if (businessExpenses.length > 0) {
    const businessTotal = businessExpenses.reduce((sum, t) => sum + t.amount, 0);

    insights.push({
      type: 'tax_opportunity',
      title: 'Potential Tax Deductions Identified',
      description: `Found ${businessExpenses.length} business-related expenses totaling $${(businessTotal / 100).toFixed(2)} that may be tax-deductible.`,
      confidence: 75,
      impact: businessTotal > 100000 ? 'high' : 'medium',
      data: {
        metrics: {
          businessExpenseCount: businessExpenses.length,
          businessExpenseTotal: businessTotal,
          potentialTaxSavings: businessTotal * 0.21, // Assuming 21% tax rate
        },
        expenses: businessExpenses.map(t => ({
          description: t.description,
          amount: t.amount,
          category: t.category?.name,
        })),
      },
      recommendations: [
        'Consult with tax professional about these deductions',
        'Ensure proper documentation for all business expenses',
        'Consider categorizing expenses more precisely for tax purposes',
      ],
    });
  }

  return insights;
}

/**
 * Generate mock trend data for insights
 */
function generateMockTrends(amount: number): any[] {
  const trends = [];
  const baseAmount = amount * 0.8;

  for (let i = 0; i < 7; i++) {
    trends.push({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(baseAmount + (Math.random() - 0.5) * amount * 0.4),
    });
  }

  return trends;
}