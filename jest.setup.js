import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({ testIdAttribute: 'data-testid' });

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                category: { id: 'test', name: 'Test Category', type: 'expense' },
                confidence: 95,
                processedDescription: 'Test description',
                extractedMetadata: { vendor: 'Test Vendor', location: 'Test Location', tags: ['test'] },
                suggestions: [],
                type: 'expense'
              })
            }
          }]
        }),
      },
    },
    models: {
      list: jest.fn().mockResolvedValue({ data: [{ id: 'gpt-4' }] })
    }
  }));
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};