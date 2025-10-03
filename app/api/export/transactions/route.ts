import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/services/transaction-service';
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

    // Rate limiting for exports (more restrictive due to processing cost)
    const rateLimitResult = checkRateLimit(`export:${userId}`, 10, 60 * 1000); // 10 exports per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many export requests. Please try again later.',
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

    const exportRequest = await request.json();
    const {
      format = 'csv',
      filters = {},
      options = {}
    } = exportRequest;

    // Validate export format
    if (!['csv', 'json', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { error: 'Export format must be csv, json, or xlsx' },
        { status: 400 }
      );
    }

    // Validate date range
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

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

      // Limit export to maximum 2 years of data
      const maxPeriod = 730 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
      if (endDate.getTime() - startDate.getTime() > maxPeriod) {
        return NextResponse.json(
          { error: 'Export period cannot exceed 2 years' },
          { status: 400 }
        );
      }
    }

    // Get transactions based on filters
    const transactionResult = await transactionService.getUserTransactions(userId, {
      limit: options.limit || 10000, // Cap at 10k records for performance
      offset: 0,
      type: filters.type,
      categoryId: filters.categoryId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      search: filters.search,
      sortBy: options.sortBy || 'date',
      sortOrder: options.sortOrder || 'desc',
    });

    if (transactionResult.transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found matching the specified criteria' },
        { status: 404 }
      );
    }

    // Generate export data
    const exportData = await generateExportData(
      transactionResult.transactions,
      format,
      options
    );

    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transactions_export_${timestamp}.${format}`;

    // Log export operation
    await auditService.createAuditLog({
      userId,
      entityType: 'export',
      entityId: 'transactions',
      action: 'export',
      oldValue: null,
      newValue: {
        format,
        filters,
        recordCount: transactionResult.transactions.length,
        filename,
        exportTime: new Date().toISOString(),
      },
      reason: 'User exported transaction data',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Log API access
    await logApiAccess(request, userId, 'export', 'transactions', 'POST', true);

    // Return appropriate response based on format
    if (format === 'json') {
      return NextResponse.json({
        data: JSON.parse(exportData),
        metadata: {
          filename,
          recordCount: transactionResult.transactions.length,
          exportTime: new Date().toISOString(),
          filters,
        }
      });
    } else {
      // For CSV and Excel, return the file content
      const response = new NextResponse(exportData);

      // Set appropriate headers
      if (format === 'csv') {
        response.headers.set('Content-Type', 'text/csv');
      } else if (format === 'xlsx') {
        response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }

      response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      response.headers.set('X-Export-Record-Count', transactionResult.transactions.length.toString());

      return response;
    }

  } catch (error) {
    console.error('Export transactions error:', error);

    // Log failed API access
    try {
      const userId = await validateSession(request);
      if (userId) {
        await logApiAccess(request, userId, 'export', 'transactions', 'POST', false, error instanceof Error ? error.message : 'Unknown error');
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
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate export data in the specified format
 */
async function generateExportData(
  transactions: any[],
  format: string,
  options: any
): Promise<string> {
  switch (format) {
    case 'csv':
      return generateCSV(transactions, options);
    case 'json':
      return generateJSON(transactions, options);
    case 'xlsx':
      return await generateExcel(transactions, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate CSV export
 */
function generateCSV(transactions: any[], options: any): string {
  const includeMetadata = options.includeMetadata !== false; // Default to true
  const headers = [
    'Date',
    'Description',
    'Type',
    'Category',
    'Amount',
    'Currency',
    'Status',
    'Confidence',
    'Needs Review'
  ];

  if (includeMetadata) {
    headers.push('Processed Description', 'Metadata');
  }

  const csvRows = [headers.join(',')];

  transactions.forEach(transaction => {
    const row = [
      formatDateForCSV(transaction.date),
      escapeCSVField(transaction.description),
      transaction.type,
      transaction.category?.name || 'Uncategorized',
      (transaction.amount / 100).toFixed(2), // Convert cents to dollars
      transaction.currency || 'USD',
      transaction.status || 'confirmed',
      transaction.confidence || 100,
      transaction.needsReview ? 'Yes' : 'No'
    ];

    if (includeMetadata) {
      row.push(
        escapeCSVField(transaction.processedDescription || ''),
        escapeCSVField(JSON.stringify(transaction.metadata || {}))
      );
    }

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Generate JSON export
 */
function generateJSON(transactions: any[], options: any): string {
  const includeMetadata = options.includeMetadata !== false; // Default to true

  const exportData = {
    metadata: {
      exportTime: new Date().toISOString(),
      recordCount: transactions.length,
      format: 'json',
      version: '1.0',
    },
    transactions: transactions.map(transaction => {
      const baseData = {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        type: transaction.type,
        amount: {
          value: transaction.amount,
          currency: transaction.currency || 'USD',
          formatted: formatCurrency(transaction.amount, transaction.currency || 'USD'),
        },
        category: transaction.category ? {
          id: transaction.category.id,
          name: transaction.category.name,
          type: transaction.category.type,
          color: transaction.category.color,
        } : null,
        status: transaction.status || 'confirmed',
        confidence: transaction.confidence || 100,
        needsReview: transaction.needsReview || false,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      };

      if (includeMetadata) {
        baseData.processedDescription = transaction.processedDescription;
        baseData.metadata = transaction.metadata;
      }

      return baseData;
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate Excel export (simplified implementation)
 * In production, use a library like xlsx or exceljs
 */
async function generateExcel(transactions: any[], options: any): Promise<string> {
  // This is a mock implementation
  // In production, you would use a proper Excel library
  const csvData = generateCSV(transactions, options);

  // For now, return CSV data (browser can handle CSV download)
  // In a real implementation, you would generate actual XLSX binary data
  return csvData;
}

/**
 * Format date for CSV export
 */
function formatDateForCSV(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Escape CSV field to handle commas and quotes
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100); // Convert cents to dollars
}