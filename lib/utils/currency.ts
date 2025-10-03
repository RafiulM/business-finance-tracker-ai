// Exchange rate cache
interface ExchangeRateCache {
  rates: Record<string, number>;
  timestamp: number;
  baseCurrency: string;
}

// Currency information
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
  thousandsSeparator: string;
  decimalSeparator: string;
}

// Conversion result
export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  timestamp: Date;
}

// Currency configuration
export const CURRENCY_CONFIG: Record<string, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    symbolPosition: 'after',
    thousandsSeparator: "'",
    decimalSeparator: '.',
  },
  SEK: {
    code: 'SEK',
    name: 'Swedish Krona',
    symbol: 'kr',
    decimalPlaces: 2,
    symbolPosition: 'after',
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: 'MX$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  NOK: {
    code: 'NOK',
    name: 'Norwegian Krone',
    symbol: 'kr',
    decimalPlaces: 2,
    symbolPosition: 'after',
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  KRW: {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    decimalPlaces: 0,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  TRY: {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  RUB: {
    code: 'RUB',
    name: 'Russian Ruble',
    symbol: '₽',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ' ',
    decimalSeparator: ',',
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ' ',
    decimalSeparator: '.',
  },
};

// Currency utility class
export class CurrencyUtils {
  private static exchangeRateCache: ExchangeRateCache | null = null;
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private static readonly API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

  /**
   * Get currency information
   */
  static getCurrencyInfo(currencyCode: string): CurrencyInfo | null {
    return CURRENCY_CONFIG[currencyCode.toUpperCase()] || null;
  }

  /**
   * Get all supported currencies
   */
  static getAllCurrencies(): CurrencyInfo[] {
    return Object.values(CURRENCY_CONFIG);
  }

  /**
   * Check if currency is supported
   */
  static isSupportedCurrency(currencyCode: string): boolean {
    return currencyCode.toUpperCase() in CURRENCY_CONFIG;
  }

  /**
   * Format currency amount according to locale
   */
  static formatCurrency(
    amount: number,
    currencyCode: string,
    locale?: string
  ): string {
    const currencyInfo = this.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    // If locale is provided, use Intl.NumberFormat
    if (locale) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: currencyInfo.decimalPlaces,
          maximumFractionDigits: currencyInfo.decimalPlaces,
        }).format(amount);
      } catch (error) {
        // Fallback to manual formatting if Intl fails
      }
    }

    // Manual formatting
    const roundedAmount = amount.toFixed(currencyInfo.decimalPlaces);
    const parts = roundedAmount.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '';

    // Add thousands separator
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, currencyInfo.thousandsSeparator);

    // Combine parts
    let formatted = integerPart;
    if (currencyInfo.decimalPlaces > 0) {
      formatted += currencyInfo.decimalSeparator + decimalPart;
    }

    // Add symbol
    if (currencyInfo.symbolPosition === 'before') {
      formatted = currencyInfo.symbol + formatted;
    } else {
      formatted = formatted + ' ' + currencyInfo.symbol;
    }

    return formatted;
  }

  /**
   * Parse currency string to number
   */
  static parseCurrencyString(
    amountString: string,
    currencyCode: string
  ): number {
    const currencyInfo = this.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    // Remove currency symbol and thousands separators
    let cleanString = amountString.trim();

    // Remove symbol
    cleanString = cleanString.replace(new RegExp(`\\${currencyInfo.symbol}`, 'g'), '').trim();

    // Replace thousands separators
    cleanString = cleanString.replace(
      new RegExp(`\\${currencyInfo.thousandsSeparator}`, 'g'),
      ''
    );

    // Replace decimal separator with standard decimal point
    if (currencyInfo.decimalSeparator !== '.') {
      cleanString = cleanString.replace(
        new RegExp(`\\${currencyInfo.decimalSeparator}`, 'g'),
        '.'
      );
    }

    // Parse as number
    const parsed = parseFloat(cleanString);
    if (isNaN(parsed)) {
      throw new Error(`Invalid currency amount: ${amountString}`);
    }

    return parsed;
  }

  /**
   * Get exchange rates from API or cache
   */
  static async getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    // Check cache first
    if (this.exchangeRateCache &&
        this.exchangeRateCache.baseCurrency === baseCurrency &&
        Date.now() - this.exchangeRateCache.timestamp < this.CACHE_TTL) {
      return this.exchangeRateCache.rates;
    }

    try {
      // Fetch from API
      const response = await fetch(`${this.API_BASE_URL}/${baseCurrency}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }

      const data = await response.json();

      // Update cache
      this.exchangeRateCache = {
        rates: data.rates,
        timestamp: Date.now(),
        baseCurrency,
      };

      return data.rates;

    } catch (error) {
      // If cache exists but is expired, use it as fallback
      if (this.exchangeRateCache && this.exchangeRateCache.baseCurrency === baseCurrency) {
        console.warn('Using expired exchange rate cache due to API error');
        return this.exchangeRateCache.rates;
      }

      throw new Error(`Failed to get exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert currency amount
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: amount,
        rate: 1,
        timestamp: new Date(),
      };
    }

    if (!this.isSupportedCurrency(fromCurrency)) {
      throw new Error(`Unsupported currency: ${fromCurrency}`);
    }

    if (!this.isSupportedCurrency(toCurrency)) {
      throw new Error(`Unsupported currency: ${toCurrency}`);
    }

    try {
      // Get exchange rates with fromCurrency as base
      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }

      const toAmount = amount * rate;

      return {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount,
        rate,
        timestamp: new Date(),
      };

    } catch (error) {
      throw new Error(`Currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert multiple amounts at once
   */
  static async convertMultipleAmounts(
    conversions: Array<{
      amount: number;
      fromCurrency: string;
      toCurrency: string;
    }>
  ): Promise<ConversionResult[]> {
    // Group by base currency to minimize API calls
    const baseCurrencies = [...new Set(conversions.map(c => c.fromCurrency))];
    const allRates: Record<string, Record<string, number>> = {};

    // Fetch rates for each base currency
    for (const baseCurrency of baseCurrencies) {
      allRates[baseCurrency] = await this.getExchangeRates(baseCurrency);
    }

    // Perform conversions
    return conversions.map(conversion => {
      const { amount, fromCurrency, toCurrency } = conversion;

      if (fromCurrency === toCurrency) {
        return {
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: amount,
          rate: 1,
          timestamp: new Date(),
        };
      }

      const rates = allRates[fromCurrency];
      const rate = rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }

      return {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: amount * rate,
        rate,
        timestamp: new Date(),
      };
    });
  }

  /**
   * Get historical exchange rate (mock implementation)
   * In production, this would use a paid API service
   */
  static async getHistoricalExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<number> {
    // This is a mock implementation
    // In production, you would use a service like Fixer.io, Open Exchange Rates, etc.

    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 365) {
      throw new Error('Historical rates only available for the last year');
    }

    // Mock: get current rate and apply a small random variation
    const currentRates = await this.getExchangeRates(fromCurrency);
    const currentRate = currentRates[toCurrency];

    if (!currentRate) {
      throw new Error(`Exchange rate not available for ${toCurrency}`);
    }

    // Simulate historical variation (±2% max)
    const variation = 1 + (Math.random() - 0.5) * 0.04;
    return currentRate * variation;
  }

  /**
   * Clear exchange rate cache
   */
  static clearCache(): void {
    this.exchangeRateCache = null;
  }

  /**
   * Get cache status
   */
  static getCacheStatus(): {
    exists: boolean;
    baseCurrency?: string;
    age?: number;
    ttl?: number;
  } {
    if (!this.exchangeRateCache) {
      return { exists: false };
    }

    const age = Date.now() - this.exchangeRateCache.timestamp;

    return {
      exists: true,
      baseCurrency: this.exchangeRateCache.baseCurrency,
      age,
      ttl: Math.max(0, this.CACHE_TTL - age),
    };
  }

  /**
   * Round amount to currency precision
   */
  static roundToCurrencyPrecision(amount: number, currencyCode: string): number {
    const currencyInfo = this.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      throw new Error(`Unsupported currency: ${currencyCode}`);
    }

    const factor = Math.pow(10, currencyInfo.decimalPlaces);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Convert and round currency amount
   */
  static async convertAndRound(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const result = await this.convertCurrency(amount, fromCurrency, toCurrency);
    return this.roundToCurrencyPrecision(result.toAmount, toCurrency);
  }

  /**
   * Calculate exchange rate change percentage
   */
  static calculateRateChange(oldRate: number, newRate: number): number {
    if (oldRate === 0) {
      throw new Error('Old rate cannot be zero');
    }
    return ((newRate - oldRate) / oldRate) * 100;
  }

  /**
   * Validate currency amount
   */
  static validateAmount(amount: number, currencyCode: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const currencyInfo = this.getCurrencyInfo(currencyCode);

    if (!currencyInfo) {
      errors.push(`Unsupported currency: ${currencyCode}`);
      return { isValid: false, errors };
    }

    if (isNaN(amount)) {
      errors.push('Amount must be a number');
    }

    if (!isFinite(amount)) {
      errors.push('Amount must be finite');
    }

    if (amount < 0) {
      errors.push('Amount cannot be negative');
    }

    if (amount > 999999999999.99) {
      errors.push('Amount is too large');
    }

    // Check decimal places
    const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > currencyInfo.decimalPlaces) {
      errors.push(`Amount cannot have more than ${currencyInfo.decimalPlaces} decimal places`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get currency symbol display
   */
  static getCurrencySymbol(currencyCode: string, useISOCode: boolean = false): string {
    const currencyInfo = this.getCurrencyInfo(currencyCode);
    if (!currencyInfo) {
      return currencyCode.toUpperCase();
    }

    return useISOCode ? currencyInfo.code : currencyInfo.symbol;
  }
}

// Export convenience functions
export const formatCurrency = (amount: number, currencyCode: string, locale?: string) =>
  CurrencyUtils.formatCurrency(amount, currencyCode, locale);

export const parseCurrencyString = (amountString: string, currencyCode: string) =>
  CurrencyUtils.parseCurrencyString(amountString, currencyCode);

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) =>
  CurrencyUtils.convertCurrency(amount, fromCurrency, toCurrency);

export const validateAmount = (amount: number, currencyCode: string) =>
  CurrencyUtils.validateAmount(amount, currencyCode);

export const getCurrencyInfo = (currencyCode: string) =>
  CurrencyUtils.getCurrencyInfo(currencyCode);

export const getAllCurrencies = () =>
  CurrencyUtils.getAllCurrencies();

export const isSupportedCurrency = (currencyCode: string) =>
  CurrencyUtils.isSupportedCurrency(currencyCode);