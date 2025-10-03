import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/schema/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert financial assistant. Your task is to extract structured financial data from user text. The user will provide a description of a transaction or an asset. You must return a single JSON object with the extracted information.

- For transactions, identify the 'type' ('income' or 'expense'), 'amount', 'description', 'category', and 'transaction_date'.
- For assets, identify the 'name', 'type', 'initial_value', and 'acquisition_date'.
- Today's date is ${new Date().toISOString().split('T')[0]}. Use this if the user says "today" or does not specify a date.
- Infer a likely category from the description. Common expense categories include: 'Office Supplies', 'Marketing', 'Software', 'Travel', 'Meals & Entertainment', 'Utilities', 'Rent', 'Salaries'. Common income categories include: 'Client Payment', 'Sales', 'Refunds'.
- If you cannot determine a field, return null for its value.
- Do not add any commentary. Only return the JSON object.

Example Transaction Input: "bought a new chair for the office for 250 dollars yesterday"
Example Transaction Output:
{
  "entry_type": "transaction",
  "data": {
    "type": "expense",
    "amount": 250.00,
    "description": "new chair for the office",
    "category": "Office Supplies",
    "transaction_date": "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}"
  }
}

Example Asset Input: "we just purchased a new delivery van for $35,000 on October 1st"
Example Asset Output:
{
  "entry_type": "asset",
  "data": {
    "name": "new delivery van",
    "type": "Equipment",
    "initial_value": 35000.00,
    "acquisition_date": "2025-10-01"
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ],
      temperature: 0.1,
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json({ error: 'Failed to parse text' }, { status: 500 });
    }

    try {
      const parsedData = JSON.parse(responseContent);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

  } catch (error) {
    console.error('AI parsing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}