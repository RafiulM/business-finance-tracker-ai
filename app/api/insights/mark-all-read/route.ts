import { NextRequest, NextResponse } from 'next/server';
import { insightService } from '@/lib/services/insight-service';
import { validateSession } from '@/lib/middleware/auth';

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

    // Mark all insights as read for the user
    const markedCount = await insightService.markAllInsightsAsRead(userId);

    return NextResponse.json({
      message: `Marked ${markedCount} insights as read`,
      count: markedCount,
    });

  } catch (error) {
    console.error('Mark all insights as read error:', error);

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