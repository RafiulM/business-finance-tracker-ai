import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/category-service';
import { middleware } from '@/lib/middleware';
import { auditService } from '@/lib/services/audit-service';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from middleware headers (set in middleware.ts)
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clone request to read body for both rate limiting and processing
    const clonedRequest = request.clone();
    const requestBody = await clonedRequest.text();
    const transactionData = JSON.parse(requestBody);

    // Additional rate limiting check for this specific endpoint
    const rateLimitResult = await middleware.rateLimit.check(request, {
      userId,
      endpoint: '/api/ai/process-transaction',
      estimatedTokens: middleware.rateLimit.estimateTokens(requestBody),
    });

    if (!rateLimitResult.allowed) {
      return middleware.rateLimit.createResponse(rateLimitResult);
    }

    // Validate required fields
    if (!transactionData.description) {
      return NextResponse.json(
        { error: 'Transaction description is required' },
        { status: 400 }
      );
    }

    if (!transactionData.amount || typeof transactionData.amount !== 'number' || transactionData.amount <= 0) {
      return NextResponse.json(
        { error: 'Valid transaction amount is required' },
        { status: 400 }
      );
    }

    if (!transactionData.type || !['income', 'expense'].includes(transactionData.type)) {
      return NextResponse.json(
        { error: 'Transaction type must be either "income" or "expense"' },
        { status: 400 }
      );
    }

    // Get user categories for context
    const userCategories = await categoryService.getAllAvailableCategories(
      userId,
      transactionData.type
    );

    // Get system categories as fallback
    const systemCategories = await categoryService.getSystemCategories(transactionData.type);

    // Process with AI (mock implementation for now)
    const aiResult = await processTransactionWithAI({
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      currency: transactionData.currency || 'USD',
      date: transactionData.date || new Date().toISOString().split('T')[0],
      context: {
        userCategories,
        systemCategories,
        recentTransactions: transactionData.context?.recentTransactions || [],
      },
    });

    // Log AI processing
    await auditService.createAuditLog({
      userId,
      entityType: 'ai_processing',
      entityId: 'transaction_processing',
      action: 'read',
      oldValue: null,
      newValue: {
        description: transactionData.description,
        amount: transactionData.amount,
        type: transactionData.type,
        aiCategory: aiResult.category?.name,
        confidence: aiResult.confidence,
        processingTime: aiResult.processingTime,
      },
      reason: 'AI transaction processing request',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Log API access
    middleware.log.request(request, {
      userId,
      endpoint: 'ai/process-transaction',
      method: 'POST',
      success: true,
      processingTime: Date.now(),
    });

    return NextResponse.json({
      category: aiResult.category,
      confidence: aiResult.confidence,
      processedDescription: aiResult.processedDescription,
      extractedMetadata: aiResult.extractedMetadata,
      suggestions: aiResult.suggestions,
      warnings: aiResult.warnings,
      processingTime: aiResult.processingTime,
      model: aiResult.model,
    });

  } catch (error) {
    // Log error using middleware
    middleware.log.error('AI transaction processing error', error instanceof Error ? error : new Error(String(error)), {
      endpoint: 'ai/process-transaction',
      userId: request.headers.get('X-User-ID'),
    });

    // Use error handling middleware to create proper response
    return middleware.error.handle(error, request);
  }
}

/**
 * Process transaction with AI (mock implementation)
 * In production, this would call OpenAI GPT-4o or similar
 */
async function processTransactionWithAI(data: {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  currency: string;
  date: string;
  context: {
    userCategories: any[];
    systemCategories: any[];
    recentTransactions: any[];
  };
}): Promise<{
  category: any;
  confidence: number;
  processedDescription: string;
  extractedMetadata: any;
  suggestions: any[];
  warnings: string[];
  processingTime: number;
  model: string;
}> {
  const startTime = Date.now();

  try {
    // Mock AI processing - in production, this would call OpenAI
    const mockAIResponse = await mockOpenAICall(data);

    const processingTime = Date.now() - startTime;

    return {
      category: mockAIResponse.category,
      confidence: mockAIResponse.confidence,
      processedDescription: mockAIResponse.processedDescription,
      extractedMetadata: mockAIResponse.extractedMetadata,
      suggestions: mockAIResponse.suggestions,
      warnings: mockAIResponse.warnings,
      processingTime,
      model: 'gpt-4o-mock',
    };

  } catch (error) {
    // Fallback response if AI fails
    const processingTime = Date.now() - startTime;

    return {
      category: {
        id: data.type === 'income' ? 'fallback-income' : 'fallback-expense',
        name: `Uncategorized ${data.type === 'income' ? 'Income' : 'Expense'}`,
        type: data.type,
      },
      confidence: 0,
      processedDescription: data.description.trim(),
      extractedMetadata: {
        vendor: null,
        location: null,
        tags: [],
      },
      suggestions: [],
      warnings: ['AI service unavailable - using fallback categorization'],
      processingTime,
      model: 'fallback',
    };
  }
}

/**
 * Mock OpenAI API call
 * In production, replace with actual OpenAI API call
 */
async function mockOpenAICall(data: {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  context: any;
}): Promise<any> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  const description = data.description.toLowerCase();
  const amount = data.amount;
  const type = data.type;

  // Simple keyword-based categorization (mock AI logic)
  let category = null;
  let confidence = 85;
  let extractedMetadata: any = {
    vendor: null,
    location: null,
    tags: [],
  };

  // Expense categories
  if (type === 'expense') {
    if (description.includes('adobe') || description.includes('creative cloud') || description.includes('software')) {
      category = { id: 'cat-software', name: 'Software & Subscriptions', type: 'expense' };
      extractedMetadata.vendor = 'Adobe';
      extractedMetadata.tags = ['software', 'subscription', 'design'];
      confidence = 95;
    } else if (description.includes('office') || description.includes('staples') || description.includes('supplies')) {
      category = { id: 'cat-office', name: 'Office Supplies', type: 'expense' };
      extractedMetadata.vendor = 'Staples';
      extractedMetadata.tags = ['office', 'supplies'];
      confidence = 90;
    } else if (description.includes('restaurant') || description.includes('lunch') || description.includes('dinner') || description.includes('meal')) {
      category = { id: 'cat-travel', name: 'Travel & Meals', type: 'expense' };
      extractedMetadata.tags = ['meal', 'business'];
      confidence = 85;
    } else if (description.includes('gas') || description.includes('fuel') || description.includes('uber') || description.includes('lyft')) {
      category = { id: 'cat-travel', name: 'Travel & Meals', type: 'expense' };
      extractedMetadata.tags = ['transportation'];
      confidence = 90;
    } else {
      category = { id: 'cat-other', name: 'Other Expenses', type: 'expense' };
      confidence = 60;
    }
  }
  // Income categories
  else {
    if (description.includes('client') || description.includes('payment') || description.includes('invoice')) {
      category = { id: 'cat-service', name: 'Service Revenue', type: 'income' };
      extractedMetadata.tags = ['client', 'payment'];
      confidence = 90;
    } else if (description.includes('salary') || description.includes('paycheck')) {
      category = { id: 'cat-salary', name: 'Salary', type: 'income' };
      confidence = 95;
    } else if (description.includes('interest') || description.includes('dividend')) {
      category = { id: 'cat-investment', name: 'Investment Income', type: 'income' };
      extractedMetadata.tags = ['investment'];
      confidence = 90;
    } else {
      category = { id: 'cat-other-income', name: 'Other Income', type: 'income' };
      confidence = 60;
    }
  }

  // Extract potential vendor information
  const vendorPatterns = [
    /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+\s+(?:Store|Shop|Cafe|Restaurant))/i,
  ];

  for (const pattern of vendorPatterns) {
    const match = description.match(pattern);
    if (match) {
      extractedMetadata.vendor = match[1];
      break;
    }
  }

  // Generate processed description (cleaned up version)
  let processedDescription = data.description.trim();

  // Remove common filler words and normalize
  processedDescription = processedDescription
    .replace(/\b(payment for|purchase of|order from)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Add suggestions based on amount and frequency
  const suggestions = [];

  if (type === 'expense' && amount > 50000) { // $500+
    suggestions.push({
      type: 'budget',
      value: 'Consider adding to monthly budget',
      confidence: 75,
    });
  }

  if (description.includes('subscription') || description.includes('monthly')) {
    suggestions.push({
      type: 'recurring',
      value: 'This appears to be a recurring expense',
      confidence: 90,
    });
  }

  return {
    category,
    confidence,
    processedDescription,
    extractedMetadata,
    suggestions,
    warnings: [],
  };
}