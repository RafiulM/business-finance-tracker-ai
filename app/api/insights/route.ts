import { NextRequest, NextResponse } from 'next/server';
import { insightService } from '@/lib/services/insight-service';
import { validateSession } from '@/lib/middleware/auth';

// GET /api/insights - Get user's insights
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
    const options = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      type: searchParams.get('type') as any || undefined,
      impact: searchParams.get('impact') as any || undefined,
      isRead: searchParams.get('isRead') === 'true' ? true :
                   searchParams.get('isRead') === 'false' ? false : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: searchParams.get('sortBy') as any || undefined,
      sortOrder: searchParams.get('sortOrder') as any || undefined,
    };

    const result = await insightService.getUserInsights(userId, options);

    return NextResponse.json({
      insights: result.insights,
      total: result.total,
      hasMore: result.hasMore,
    });

  } catch (error) {
    console.error('Get insights error:', error);

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

// POST /api/insights - Create a new insight (for manual insights)
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

    const insightData = await request.json();

    // Validate required fields
    const requiredFields = ['type', 'title', 'description', 'confidence', 'impact'];
    for (const field of requiredFields) {
      if (!insightData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate insight type
    const validTypes = ['spending_trend', 'anomaly', 'cash_flow', 'recommendation', 'budget_alert', 'goal_progress', 'tax_opportunity'];
    if (!validTypes.includes(insightData.type)) {
      return NextResponse.json(
        { error: 'Invalid insight type' },
        { status: 400 }
      );
    }

    // Validate impact
    const validImpacts = ['high', 'medium', 'low'];
    if (!validImpacts.includes(insightData.impact)) {
      return NextResponse.json(
        { error: 'Invalid impact level' },
        { status: 400}
      );
    }

    // Create insight
    const insight = await insightService.createInsightWithValidation({
      type: insightData.type,
      title: insightData.title,
      description: insightData.description,
      confidence: insightData.confidence,
      impact: insightData.impact,
      userId,
      categoryId: insightData.categoryId,
      timePeriod: insightData.timePeriod,
      data: insightData.data,
      recommendations: insightData.recommendations,
      isRead: false,
    });

    return NextResponse.json({
      insight,
      message: 'Insight created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create insight error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.includes('required') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}