import { openai, INSIGHT_MODEL, openaiConfig } from './openai-client';
import type { Transaction, Category } from '@/db';

export interface InsightGenerationRequest {
    transactions: Transaction[];
    categories: Category[];
    timePeriod: {
        startDate: Date;
        endDate: Date;
    };
    focusAreas: Array<
        'spending_trends' | 'anomalies' | 'cash_flow' | 'category_analysis' | 'recommendations'
    >;
}

export interface GeneratedInsight {
    type: string;
    title: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    category?: string;
    data: {
        metrics: object;
        trends: Array<{ date: string; value: number }>;
        comparisons: object;
        visualizations: object;
    };
    actions: Array<{
        id: string;
        description: string;
        type: string;
    }>;
}

export async function generateInsights(
    request: InsightGenerationRequest
): Promise<GeneratedInsight[]> {
    const systemPrompt = `You are a financial analysis expert specializing in small business finance. Analyze the provided transaction data and generate actionable insights.

Your analysis should focus on:
1. Spending trends and patterns
2. Unusual transactions or anomalies
3. Cash flow analysis
4. Category-specific insights
5. Cost-saving recommendations

For each insight, provide:
- A clear, actionable title
- Detailed explanation
- Confidence score (0-100)
- Impact level (high/medium/low)
- Supporting data and metrics
- Specific recommended actions

Categories available:
${request.categories.map(cat => `- ${cat.name} (${cat.type})`).join('\n')}

Focus areas: ${request.focusAreas.join(', ')}

Return a JSON array of insights with the following structure:
[
  {
    "type": "spending_trend|anomaly_detection|cash_flow_analysis|category_insight|recommendation",
    "title": "Clear, actionable title",
    "description": "Detailed explanation of the insight",
    "confidence": 85,
    "impact": "high|medium|low",
    "category": "relevant_category_name",
    "data": {
      "metrics": { "total": 1234, "average": 567 },
      "trends": [{ "date": "2025-10-01", "value": 1234 }],
      "comparisons": { "vs_last_period": "+15%" },
      "visualizations": { "chart_type": "line", "data": [...] }
    },
    "actions": [
      {
        "id": "action_1",
        "description": "Specific action to take",
        "type": "categorize|review|investigate|adjust_budget|export_report"
      }
    ]
  }
]`;

    // Prepare transaction data for analysis
    const transactionSummary = request.transactions.map(t => ({
        description: t.description,
        amount: t.amount / 100, // Convert to dollars
        category: request.categories.find(c => c.id === t.categoryId)?.name || 'Unknown',
        type: t.type,
        date: t.date.toISOString().split('T')[0],
        processedDescription: t.processedDescription
    }));

    const userPrompt = `Financial Data Analysis Request:
- Time Period: ${request.timePeriod.startDate.toISOString().split('T')[0]} to ${request.timePeriod.endDate.toISOString().split('T')[0]}
- Total Transactions: ${transactionSummary.length}
- Categories: ${request.categories.length}

Transaction Summary:
${transactionSummary.slice(0, 100).map(t =>
    `${t.date}: ${t.description} - ${t.category} - $${t.amount} (${t.type})`
).join('\n')}

${transactionSummary.length > 100 ? `... and ${transactionSummary.length - 100} more transactions` : ''}

Please analyze this data and generate actionable financial insights focusing on: ${request.focusAreas.join(', ')}`;

    try {
        const response = await openai.chat.completions.create({
            model: INSIGHT_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            ...openaiConfig,
            response_format: { type: 'json_object' },
            maxTokens: 2000 // Increased for detailed insights
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const insights = JSON.parse(content) as GeneratedInsight[];

        // Validate and clean insights
        return insights.filter(insight =>
            insight.title &&
            insight.description &&
            insight.confidence >= 0 &&
            insight.confidence <= 100
        );
    } catch (error) {
        console.error('Error generating insights with AI:', error);

        // Return empty array on error
        return [];
    }
}