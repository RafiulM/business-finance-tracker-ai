import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: 'not_tested',
          message: 'Database connection temporarily disabled for Edge Runtime compatibility'
        },
        server: {
          status: 'healthy',
          message: 'Server is running'
        }
      },
      metrics: {
        responseTime: 0,
        memoryUsage: process.memoryUsage(),
      },
    };

    return NextResponse.json(healthStatus, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });

  // Add health status headers
  response.headers.set('X-Health-Status', 'healthy');
  response.headers.set('X-Health-Timestamp', new Date().toISOString());
  response.headers.set('X-Health-Uptime', process.uptime().toString());

  return response;
}