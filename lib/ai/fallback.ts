import type { Category, TransactionType } from '@/db';
import type { TransactionParseResponse } from './transaction-parser';

export function getFallbackTransactionParseResponse(
    description: string,
    categories: Category[] = []
): TransactionParseResponse {
    // Simple rule-based categorization as fallback
    const lowerDesc = description.toLowerCase();

    // Basic transaction type detection
    let type: TransactionType = 'expense';
    if (lowerDesc.includes('income') || lowerDesc.includes('revenue') || lowerDesc.includes('payment from') || lowerDesc.includes('client')) {
        type = 'income';
    } else if (lowerDesc.includes('asset') || lowerDesc.includes('equipment') || lowerDesc.includes('purchase')) {
        type = 'asset_purchase';
    } else if (lowerDesc.includes('sold') || lowerDesc.includes('sale')) {
        type = 'asset_sale';
    }

    // Basic category detection
    let detectedCategory = categories.find(cat =>
        cat.name.toLowerCase() === 'other expenses' ||
        cat.name.toLowerCase() === 'uncategorized'
    );

    if (!detectedCategory) {
        // Try to match common expense patterns
        const expensePatterns = [
            { keywords: ['office', 'supply', 'pen', 'paper'], category: 'Office Supplies' },
            { keywords: ['software', 'subscription', 'saas'], category: 'Software & Subscriptions' },
            { keywords: ['marketing', 'advertising', 'ads'], category: 'Marketing & Advertising' },
            { keywords: ['travel', 'flight', 'hotel', 'meal'], category: 'Travel & Meals' },
            { keywords: ['insurance', 'premium'], category: 'Insurance' },
            { keywords: ['rent', 'lease', 'utility'], category: 'Rent & Utilities' },
            { keywords: ['tax', 'license'], category: 'Taxes & Licenses' },
            { keywords: ['bank', 'fee'], category: 'Bank Fees' },
        ];

        const incomePatterns = [
            { keywords: ['sales', 'revenue'], category: 'Sales Revenue' },
            { keywords: ['service', 'consulting'], category: 'Service Revenue' },
            { keywords: ['consulting', 'advisory'], category: 'Consulting Fees' },
            { keywords: ['interest'], category: 'Interest Income' },
        ];

        const patterns = type === 'income' ? incomePatterns : expensePatterns;

        for (const pattern of patterns) {
            if (pattern.keywords.some(keyword => lowerDesc.includes(keyword))) {
                detectedCategory = categories.find(cat =>
                    cat.name.toLowerCase() === pattern.category.toLowerCase()
                );
                if (detectedCategory) break;
            }
        }
    }

    // Extract basic metadata
    const metadata = {
        vendor: extractVendor(description),
        location: extractLocation(description),
        tags: extractBasicTags(description, type),
    };

    return {
        category: detectedCategory ? {
            id: detectedCategory.id,
            name: detectedCategory.name,
            type: detectedCategory.type as TransactionType
        } : {
            id: 'fallback',
            name: type === 'income' ? 'Other Income' : 'Other Expenses',
            type
        },
        confidence: 50, // Low confidence for fallback
        processedDescription: cleanDescription(description),
        extractedMetadata: metadata,
        suggestions: [],
        type
    };
}

function extractVendor(description: string): string | undefined {
    // Look for common vendor patterns
    const patterns = [
        /(?:from|at|@)\s+([A-Z][a-zA-Z\s&]+)(?:\s+for|\s+on|\s*$)/,
        /([A-Z][a-zA-Z\s&]+)(?:\s+for|\s+on|\s*$)/,
    ];

    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1] && match[1].length > 2) {
            return match[1].trim();
        }
    }

    return undefined;
}

function extractLocation(description: string): string | undefined {
    // Look for location patterns
    const patterns = [
        /(?:in|at)\s+([A-Z][a-zA-Z\s]+)(?:\s*,|\s+for|\s*$)/,
        /(?:,\s*)([A-Z][a-zA-Z\s]+)(?:\s+for|\s*$)/,
    ];

    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1] && match[1].length > 2) {
            return match[1].trim();
        }
    }

    return undefined;
}

function extractBasicTags(description: string, type: TransactionType): string[] {
    const tags: string[] = [];
    const lowerDesc = description.toLowerCase();

    if (type === 'expense') {
        if (lowerDesc.includes('urgent') || lowerDesc.includes('emergency')) {
            tags.push('urgent');
        }
        if (lowerDesc.includes('recurring') || lowerDesc.includes('monthly')) {
            tags.push('recurring');
        }
        if (lowerDesc.includes('business') || lowerDesc.includes('company')) {
            tags.push('business');
        }
    } else if (type === 'income') {
        if (lowerDesc.includes('client') || lowerDesc.includes('customer')) {
            tags.push('client');
        }
        if (lowerDesc.includes('project') || lowerDesc.includes('contract')) {
            tags.push('project');
        }
    }

    return tags;
}

function cleanDescription(description: string): string {
    // Basic cleanup: remove extra whitespace and normalize case
    return description
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase());
}

export function getFallbackInsights() {
    return [];
}

export function isAIServiceAvailable(): boolean {
    // Check if OpenAI is configured and available
    return !!process.env.OPENAI_API_KEY;
}