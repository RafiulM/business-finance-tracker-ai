import { openai, TRANSACTION_MODEL, openaiConfig } from './openai-client';
import type { Category, TransactionType } from '@/db';

export interface TransactionParseRequest {
    description: string;
    amount: number;
    currency: string;
    userCategories?: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    recentTransactions?: Array<{
        description: string;
        category: string;
        amount: number;
    }>;
}

export interface TransactionParseResponse {
    category: {
        id: string;
        name: string;
        type: TransactionType;
    };
    confidence: number;
    processedDescription: string;
    extractedMetadata: {
        vendor?: string;
        location?: string;
        tags: string[];
    };
    suggestions: Array<{
        type: string;
        value: string;
        confidence: number;
    }>;
    type: TransactionType;
}

export async function parseTransactionWithAI(
    request: TransactionParseRequest
): Promise<TransactionParseResponse> {
    const systemPrompt = `You are a financial transaction categorization expert. Analyze the transaction description and extract relevant information.

Rules:
1. Categorize the transaction into one of these types: expense, income, asset_purchase, asset_sale
2. Extract vendor name if mentioned
3. Identify location if specified
4. Generate relevant tags
5. Clean up the description to be concise and standardized
6. Provide confidence score (0-100) based on clarity of information

Available categories:
${request.userCategories?.map(cat => `- ${cat.name} (${cat.type})`).join('\n') || 'No custom categories provided'}

Return a JSON response with the following structure:
{
  "category": {
    "id": "category_id",
    "name": "category_name",
    "type": "expense|income|asset_purchase|asset_sale"
  },
  "confidence": 95,
  "processedDescription": "Clean description",
  "extractedMetadata": {
    "vendor": "vendor_name",
    "location": "location_name",
    "tags": ["tag1", "tag2"]
  },
  "suggestions": [
    {
      "type": "category",
      "value": "Alternative category",
      "confidence": 70
    }
  ],
  "type": "expense|income|asset_purchase|asset_sale"
}`;

    const userPrompt = `Transaction Details:
- Description: "${request.description}"
- Amount: ${request.amount / 100} ${request.currency}
- Recent transactions for context: ${request.recentTransactions?.map(t =>
    `"${t.description}" - ${t.category} - ${t.amount / 100}`
).join(', ') || 'No recent transactions'}

Please categorize this transaction and extract relevant information.`;

    try {
        const response = await openai.chat.completions.create({
            model: TRANSACTION_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            ...openaiConfig,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(content) as TransactionParseResponse;

        // Validate response structure
        if (!parsed.category || !parsed.processedDescription || parsed.confidence === undefined) {
            throw new Error('Invalid response structure from OpenAI');
        }

        return parsed;
    } catch (error) {
        console.error('Error parsing transaction with AI:', error);

        // Return a fallback response
        return {
            category: {
                id: 'fallback',
                name: 'Uncategorized',
                type: 'expense' as TransactionType
            },
            confidence: 0,
            processedDescription: request.description,
            extractedMetadata: {
                tags: []
            },
            suggestions: [],
            type: 'expense' as TransactionType
        };
    }
}