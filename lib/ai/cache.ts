interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

class SimpleCache<T> {
    private cache = new Map<string, CacheEntry<T>>();

    set(key: string, data: T, ttl: number = 300000): void { // Default 5 minutes
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Clean up expired entries
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Cache instances for different types of data
export const transactionCache = new SimpleCache<any>();
export const insightCache = new SimpleCache<any>();
export const categoryCache = new SimpleCache<any>();

// Clean up cache every 10 minutes
setInterval(() => {
    transactionCache.cleanup();
    insightCache.cleanup();
    categoryCache.cleanup();
}, 600000);

// Cache key generators
export const cacheKeys = {
    transactionParse: (description: string, amount: number, currency: string) =>
        `transaction_parse:${description.toLowerCase()}:${amount}:${currency}`,

    insights: (userId: string, timePeriod: { startDate: Date; endDate: Date }, focusAreas: string[]) =>
        `insights:${userId}:${timePeriod.startDate.toISOString()}:${timePeriod.endDate.toISOString()}:${focusAreas.join(',')}`,

    categories: (userId: string) => `categories:${userId}`,
};