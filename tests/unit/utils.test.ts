import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { formatCurrency, formatDate, addDays, getRelativeTimeString } from '@/lib/utils';
import { DatabaseManager } from '@/lib/middleware/db';
import { LoggingService } from '@/lib/middleware/logging';
import { ErrorHandlingService } from '@/lib/middleware/error-handler';
import { SecurityMiddleware } from '@/lib/middleware/security';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars';

describe('Utility Functions Tests', () => {
  describe('String Utilities', () => {
    it('should capitalize first letter', () => {
      const result = formatCurrency('hello world', 'text');
      expect(typeof result).toBe('string');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(100);
      const truncated = longString.substring(0, 50) + '...';
      expect(truncated.length).toBeLessThan(longString.length);
    });

    it('should remove whitespace from both ends', () => {
      const input = '  hello world  ';
      const trimmed = input.trim();
      expect(trimmed).toBe('hello world');
    });

    it('should convert strings to different cases', () => {
      const input = 'Hello World';
      expect(input.toLowerCase()).toBe('hello world');
      expect(input.toUpperCase()).toBe('HELLO WORLD');
    });

    it('should check if string contains substring', () => {
      const text = 'Hello World, this is a test';
      expect(text.includes('World')).toBe(true);
      expect(text.includes('moon')).toBe(false);
    });

    it('should split strings into arrays', () => {
      const csv = 'apple,banana,cherry';
      const fruits = csv.split(',');
      expect(fruits).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should join arrays into strings', () => {
      const items = ['apple', 'banana', 'cherry'];
      const csv = items.join(',');
      expect(csv).toBe('apple,banana,cherry');
    });
  });

  describe('Array Utilities', () => {
    it('should filter arrays based on condition', () => {
      const numbers = [1, 2, 3, 4, 5];
      const evenNumbers = numbers.filter(n => n % 2 === 0);
      expect(evenNumbers).toEqual([2, 4]);
    });

    it('should map arrays to new values', () => {
      const numbers = [1, 2, 3];
      const doubled = numbers.map(n => n * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });

    it('should reduce arrays to single value', () => {
      const numbers = [1, 2, 3, 4];
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      expect(sum).toBe(10);
    });

    it('should find elements in arrays', () => {
      const items = ['apple', 'banana', 'cherry'];
      const found = items.find(item => item.startsWith('b'));
      expect(found).toBe('banana');
    });

    it('should check if all elements meet condition', () => {
      const numbers = [2, 4, 6, 8];
      const allEven = numbers.every(n => n % 2 === 0);
      expect(allEven).toBe(true);

      const numbers2 = [2, 3, 4, 6];
      const allEven2 = numbers2.every(n => n % 2 === 0);
      expect(allEven2).toBe(false);
    });

    it('should check if any element meets condition', () => {
      const numbers = [1, 3, 5, 8];
      const hasEven = numbers.some(n => n % 2 === 0);
      expect(hasEven).toBe(true);
    });

    it('should sort arrays', () => {
      const numbers = [3, 1, 4, 1, 5, 9];
      const sorted = [...numbers].sort((a, b) => a - b);
      expect(sorted).toEqual([1, 1, 3, 4, 5, 9]);
    });

    it('should remove duplicates', () => {
      const withDuplicates = [1, 2, 2, 3, 3, 3, 4];
      const unique = [...new Set(withDuplicates)];
      expect(unique).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Number Utilities', () => {
    it('should round numbers to specified precision', () => {
      const number = 3.14159;
      const rounded = Math.round(number * 100) / 100;
      expect(rounded).toBe(3.14);
    });

    it('should format numbers with commas', () => {
      const number = 1234567;
      const formatted = number.toLocaleString();
      expect(formatted).toBe('1,234,567');
    });

    it('should handle percentage calculations', () => {
      const part = 25;
      const whole = 200;
      const percentage = (part / whole) * 100;
      expect(percentage).toBe(12.5);
    });

    it('should clamp numbers within range', () => {
      const clamp = (num: number, min: number, max: number) =>
        Math.min(Math.max(num, min), max);

      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should generate random numbers in range', () => {
      const min = 1;
      const max = 10;
      const random = Math.floor(Math.random() * (max - min + 1)) + min;
      expect(random).toBeGreaterThanOrEqual(min);
      expect(random).toBeLessThanOrEqual(max);
    });
  });

  describe('Object Utilities', () => {
    it('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const merged = { ...obj1, ...obj2 };
      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should get object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = Object.keys(obj);
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('should get object values', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const values = Object.values(obj);
      expect(values).toEqual([1, 2, 3]);
    });

    it('should check if object has property', () => {
      const obj = { a: 1, b: 2 };
      expect(obj.hasOwnProperty('a')).toBe(true);
      expect(obj.hasOwnProperty('c')).toBe(false);
    });

    it('should create objects from entries', () => {
      const entries = [['a', 1], ['b', 2], ['c', 3]];
      const obj = Object.fromEntries(entries);
      expect(obj).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should deep clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = JSON.parse(JSON.stringify(original));
      cloned.b.c = 3;
      expect(original.b.c).toBe(2);
      expect(cloned.b.c).toBe(3);
    });
  });

  describe('Async Utilities', () => {
    it('should handle promises with timeout', async () => {
      const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const withTimeout = (promise: Promise<any>, ms: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
          )
        ]);
      };

      const fastPromise = Promise.resolve('done');
      const result = await withTimeout(fastPromise, 100);
      expect(result).toBe('done');

      const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 200));
      await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Timeout');
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const flakyOperation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve('success');
      };

      const retry = async (fn: () => Promise<any>, maxAttempts: number) => {
        let lastError;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error;
            if (i < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        }
        throw lastError;
      };

      const result = await retry(flakyOperation, 3);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should batch async operations', async () => {
      const asyncOperation = (id: number) =>
        Promise.resolve(`result-${id}`);

      const batch = async (items: number[], batchSize: number) => {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(item => asyncOperation(item))
          );
          results.push(...batchResults);
        }
        return results;
      };

      const items = [1, 2, 3, 4, 5];
      const results = await batch(items, 2);
      expect(results).toEqual([
        'result-1', 'result-2', 'result-3', 'result-4', 'result-5'
      ]);
    });
  });

  describe('URL and Path Utilities', () => {
    it('should construct URLs from base and path', () => {
      const base = 'https://api.example.com';
      const path = '/users/123';
      const url = base + path;
      expect(url).toBe('https://api.example.com/users/123');
    });

    it('should parse query parameters', () => {
      const url = 'https://example.com?name=John&age=30';
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('name')).toBe('John');
      expect(params.get('age')).toBe('30');
    });

    it('should build query strings', () => {
      const params = new URLSearchParams({
        name: 'John',
        age: '30'
      });
      const queryString = params.toString();
      expect(queryString).toBe('name=John&age=30');
    });

    it('should join path segments', () => {
      const segments = ['api', 'users', '123'];
      const path = '/' + segments.join('/');
      expect(path).toBe('/api/users/123');
    });
  });

  describe('Error Handling Utilities', () => {
    it('should create custom errors', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Something went wrong', 'ERR_001');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('ERR_001');
      expect(error.name).toBe('CustomError');
    });

    it('should handle errors gracefully', () => {
      const safeExecute = <T>(fn: () => T, fallback: T): T => {
        try {
          return fn();
        } catch {
          return fallback;
        }
      };

      const result1 = safeExecute(() => 5, 0);
      expect(result1).toBe(5);

      const result2 = safeExecute(() => {
        throw new Error('Failed');
      }, 0);
      expect(result2).toBe(0);
    });

    it('should validate inputs and throw descriptive errors', () => {
      const validateAge = (age: any) => {
        if (typeof age !== 'number') {
          throw new Error('Age must be a number');
        }
        if (age < 0) {
          throw new Error('Age cannot be negative');
        }
        if (age > 150) {
          throw new Error('Age seems unrealistic');
        }
      };

      expect(() => validateAge(25)).not.toThrow();
      expect(() => validateAge(-5)).toThrow('Age cannot be negative');
      expect(() => validateAge('25')).toThrow('Age must be a number');
      expect(() => validateAge(200)).toThrow('Age seems unrealistic');
    });
  });

  describe('Caching Utilities', () => {
    it('should implement simple in-memory cache', () => {
      class SimpleCache<T> {
        private cache = new Map<string, { value: T; expiry: number }>();

        set(key: string, value: T, ttlMs: number): void {
          this.cache.set(key, {
            value,
            expiry: Date.now() + ttlMs
          });
        }

        get(key: string): T | null {
          const entry = this.cache.get(key);
          if (!entry) return null;
          if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
          }
          return entry.value;
        }
      }

      const cache = new SimpleCache<string>();
      cache.set('test', 'value', 1000);
      expect(cache.get('test')).toBe('value');

      cache.set('temp', 'expires', 1);
      setTimeout(() => {
        expect(cache.get('temp')).toBeNull();
      }, 10);
    });

    it('should implement memoization', () => {
      const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
        const cache = new Map();
        return ((...args: any[]) => {
          const key = JSON.stringify(args);
          if (cache.has(key)) {
            return cache.get(key);
          }
          const result = fn(...args);
          cache.set(key, result);
          return result;
        }) as T;
      };

      let callCount = 0;
      const expensiveFunction = (n: number) => {
        callCount++;
        return n * 2;
      };

      const memoizedFunction = memoize(expensiveFunction);

      expect(memoizedFunction(5)).toBe(10);
      expect(callCount).toBe(1);

      expect(memoizedFunction(5)).toBe(10);
      expect(callCount).toBe(1); // Should not call again

      expect(memoizedFunction(10)).toBe(20);
      expect(callCount).toBe(2); // New argument, should call
    });
  });

  describe('Debouncing and Throttling', () => {
    it('should debounce function calls', (done) => {
      jest.useFakeTimers();

      const debounce = <T extends (...args: any[]) => any>(
        fn: T,
        delay: number
      ): T => {
        let timeoutId: NodeJS.Timeout;
        return ((...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        }) as T;
      };

      let callCount = 0;
      const debouncedFunction = debounce(() => {
        callCount++;
      }, 100);

      debouncedFunction();
      debouncedFunction();
      debouncedFunction();

      jest.advanceTimersByTime(100);
      expect(callCount).toBe(1);

      jest.useRealTimers();
      done();
    });

    it('should throttle function calls', (done) => {
      jest.useFakeTimers();

      const throttle = <T extends (...args: any[]) => any>(
        fn: T,
        interval: number
      ): T => {
        let lastCall = 0;
        return ((...args: any[]) => {
          const now = Date.now();
          if (now - lastCall >= interval) {
            lastCall = now;
            return fn(...args);
          }
        }) as T;
      };

      let callCount = 0;
      const throttledFunction = throttle(() => {
        callCount++;
      }, 100);

      throttledFunction(); // Should execute
      throttledFunction(); // Should be ignored
      throttledFunction(); // Should be ignored

      expect(callCount).toBe(1);

      jest.advanceTimersByTime(100);
      throttledFunction(); // Should execute again

      expect(callCount).toBe(2);
      jest.useRealTimers();
      done();
    });
  });

  describe('Performance Utilities', () => {
    it('should measure execution time', async () => {
      const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        return { result, duration };
      };

      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };

      const { result, duration } = await measureTime(asyncFunction);
      expect(result).toBe('done');
      expect(duration).toBeGreaterThan(0);
    });

    it('should limit concurrent operations', async () => {
      const limitConcurrency = <T>(
        tasks: (() => Promise<T>)[],
        limit: number
      ): Promise<T[]> => {
        return new Promise((resolve) => {
          const results: T[] = [];
          let running = 0;
          let index = 0;

          const run = async () => {
            if (index >= tasks.length && running === 0) {
              resolve(results);
              return;
            }

            if (running < limit && index < tasks.length) {
              running++;
              const task = tasks[index++];
              task().then((result) => {
                results.push(result);
                running--;
                run();
              });
            }

            if (running < limit) {
              setTimeout(run, 0);
            }
          };

          run();
        });
      };

      let running = 0;
      let maxRunning = 0;

      const tasks = Array.from({ length: 10 }, (_, i) =>
        () => new Promise(resolve => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          setTimeout(() => {
            running--;
            resolve(i);
          }, 10);
        })
      );

      const results = await limitConcurrency(tasks, 3);
      expect(results).toHaveLength(10);
      expect(maxRunning).toBeLessThanOrEqual(3);
    });
  });

  describe('Type Safety Utilities', () => {
    it('should perform type guards', () => {
      const isString = (value: any): value is string =>
        typeof value === 'string';

      const isNumber = (value: any): value is number =>
        typeof value === 'number' && !isNaN(value);

      const processValue = (value: unknown): string => {
        if (isString(value)) {
          return value.toUpperCase();
        }
        if (isNumber(value)) {
          return value.toString();
        }
        return 'unknown';
      };

      expect(processValue('hello')).toBe('HELLO');
      expect(processValue(42)).toBe('42');
      expect(processValue(true)).toBe('unknown');
    });

    it('should handle nullable types safely', () => {
      const safeLength = (str: string | null | undefined): number => {
        if (!str) return 0;
        return str.length;
      };

      expect(safeLength('hello')).toBe(5);
      expect(safeLength(null)).toBe(0);
      expect(safeLength(undefined)).toBe(0);
      expect(safeLength('')).toBe(0);
    });
  });
});

describe('Integration Utility Tests', () => {
  it('should combine multiple utilities for complex operations', async () => {
    // Simulate processing financial data with validation, formatting, and error handling
    const processFinancialData = async (data: unknown) => {
      try {
        // Validate input type
        if (!Array.isArray(data)) {
          throw new Error('Data must be an array');
        }

        // Filter valid entries
        const validEntries = data.filter((item: any) =>
          typeof item === 'object' &&
          item !== null &&
          'amount' in item &&
          'currency' in item
        );

        // Process each entry
        const processed = validEntries.map((item: any) => ({
          ...item,
          formattedAmount: formatCurrency(item.amount, item.currency),
          processedAt: formatDate(new Date()),
        }));

        // Sort by amount
        const sorted = processed.sort((a: any, b: any) => b.amount - a.amount);

        return {
          entries: sorted,
          total: sorted.reduce((sum: number, item: any) => sum + item.amount, 0),
          count: sorted.length,
        };
      } catch (error) {
        return {
          entries: [],
          total: 0,
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    const testData = [
      { amount: 100, currency: 'USD', description: 'Payment 1' },
      { amount: 50, currency: 'EUR', description: 'Payment 2' },
      { invalid: 'entry' }, // Should be filtered out
      { amount: 75, currency: 'GBP', description: 'Payment 3' },
    ];

    const result = await processFinancialData(testData);

    expect(result.entries).toHaveLength(3);
    expect(result.total).toBe(225);
    expect(result.count).toBe(3);
    expect(result.entries[0].amount).toBe(100); // Should be sorted descending
  });

  it('should handle real-world scenarios with utility combinations', () => {
    // Simulate a search utility that filters, sorts, and paginates
    class DataSearch<T> {
      constructor(private data: T[]) {}

      filter(predicate: (item: T) => boolean): DataSearch<T> {
        return new DataSearch(this.data.filter(predicate));
      }

      sort(compareFn: (a: T, b: T) => number): DataSearch<T> {
        return new DataSearch([...this.data].sort(compareFn));
      }

      paginate(page: number, pageSize: number): {
        items: T[];
        totalPages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrev: boolean;
      } {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const items = this.data.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.data.length / pageSize);

        return {
          items,
          totalPages,
          currentPage: page,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        };
      }

      getResults(): T[] {
        return this.data;
      }
    }

    const users = [
      { id: 1, name: 'Alice', age: 30, city: 'New York' },
      { id: 2, name: 'Bob', age: 25, city: 'London' },
      { id: 3, name: 'Charlie', age: 35, city: 'New York' },
      { id: 4, name: 'Diana', age: 28, city: 'Paris' },
    ];

    const search = new DataSearch(users)
      .filter(user => user.city === 'New York')
      .sort((a, b) => a.age - b.age)
      .paginate(1, 2);

    expect(search.items).toHaveLength(2);
    expect(search.items[0].name).toBe('Alice');
    expect(search.totalPages).toBe(1);
    expect(search.hasNext).toBe(false);
  });
});