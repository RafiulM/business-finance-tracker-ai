import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateFinancialInsights } from '@/lib/ai-insights';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate new insights
    const insights = await generateFinancialInsights(session.user.id);

    return NextResponse.json({
      success: true,
      insights: insights.length,
      message: `Generated ${insights.length} new insights`,
    });

  } catch (error) {
    console.error('Failed to generate insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}