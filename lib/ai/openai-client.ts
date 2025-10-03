import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000, // 30 seconds
});

// Default model for transaction processing
export const TRANSACTION_MODEL = 'gpt-4o-mini';

// Model for insight generation
export const INSIGHT_MODEL = 'gpt-4o';

// Model for complex analysis
export const ANALYSIS_MODEL = 'gpt-4o';

export const openaiConfig = {
    maxTokens: 1000,
    temperature: 0.1, // Low temperature for consistent categorization
    presencePenalty: 0,
    frequencyPenalty: 0,
};

// Health check function
export async function checkOpenAIHealth(): Promise<boolean> {
    try {
        const response = await openai.models.list();
        return response.data.length > 0;
    } catch (error) {
        console.error('OpenAI health check failed:', error);
        return false;
    }
}