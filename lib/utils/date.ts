// Date utility types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangeString {
  start: string;
  end: string;
}

export interface PeriodInfo {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  start: Date;
  end: Date;
  label: string;
  previousStart?: Date;
  previousEnd?: Date;
}

// Timezone utilities
export class TimezoneUtils {
  /**
   * Get user's timezone
   */
  static getUserTimezone(): string {
    // In a browser environment, use Intl API
    if (typeof window !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // In Node.js, use process.env or default to UTC
    return process.env.TZ || 'UTC';
  }

  /**
   * Convert date to timezone
   */
  static convertToTimezone(date: Date, timezone: string): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  }

  /**
   * Format date in timezone
   */
  static formatDateInTimezone(
    date: Date,
    timezone: string,
    format: Intl.DateTimeFormatOptions
  ): string {
    return new Intl.DateTimeFormat('en-US', {
      ...format,
      timeZone: timezone,
    }).format(date);
  }

  /**
   * Get timezone offset
   */
  static getTimezoneOffset(timezone: string): number {
    const now = new Date();
    const utcDate = new Date(now.toISOString());
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  }

  /**
   * Check if timezone is valid
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all available timezones (limited list for practicality)
   */
  static getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
    const timezones = [
      { value: 'UTC', label: 'UTC', offset: '+00:00' },
      { value: 'America/New_York', label: 'Eastern Time', offset: '-05:00' },
      { value: 'America/Chicago', label: 'Central Time', offset: '-06:00' },
      { value: 'America/Denver', label: 'Mountain Time', offset: '-07:00' },
      { value: 'America/Los_Angeles', label: 'Pacific Time', offset: '-08:00' },
      { value: 'America/Anchorage', label: 'Alaska Time', offset: '-09:00' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time', offset: '-10:00' },
      { value: 'Europe/London', label: 'London', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
      { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
      { value: 'Europe/Moscow', label: 'Moscow', offset: '+03:00' },
      { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
      { value: 'Asia/Kolkata', label: 'India', offset: '+05:30' },
      { value: 'Asia/Shanghai', label: 'China', offset: '+08:00' },
      { value: 'Asia/Tokyo', label: 'Japan', offset: '+09:00' },
      { value: 'Asia/Seoul', label: 'Korea', offset: '+09:00' },
      { value: 'Australia/Sydney', label: 'Sydney', offset: '+10:00' },
      { value: 'Australia/Melbourne', label: 'Melbourne', offset: '+10:00' },
      { value: 'Pacific/Auckland', label: 'New Zealand', offset: '+12:00' },
    ];

    const now = new Date();

    return timezones.map(tz => {
      const offset = this.getTimezoneOffset(tz.value);
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetMinutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      const offsetString = `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

      return {
        ...tz,
        offset: offsetString,
      };
    });
  }
}

// Date manipulation utilities
export class DateUtils {
  /**
   * Format date to YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date to YYYY-MM-DDTHH:mm:ss
   */
  static formatDateTime(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date string
   */
  static parseDate(dateString: string): Date {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return parsed;
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Get start of week (Sunday)
   */
  static startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day;
    result.setDate(diff);
    return this.startOfDay(result);
  }

  /**
   * Get end of week (Saturday)
   */
  static endOfWeek(date: Date): Date {
    const start = this.startOfWeek(date);
    const result = new Date(start);
    result.setDate(start.getDate() + 6);
    return this.endOfDay(result);
  }

  /**
   * Get start of month
   */
  static startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    return this.startOfDay(result);
  }

  /**
   * Get end of month
   */
  static endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    return this.endOfDay(result);
  }

  /**
   * Get start of quarter
   */
  static startOfQuarter(date: Date): Date {
    const month = date.getMonth();
    const quarterStart = Math.floor(month / 3) * 3;
    const result = new Date(date);
    result.setMonth(quarterStart, 1);
    return this.startOfDay(result);
  }

  /**
   * Get end of quarter
   */
  static endOfQuarter(date: Date): Date {
    const month = date.getMonth();
    const quarterEnd = Math.floor(month / 3) * 3 + 2;
    const result = new Date(date);
    result.setMonth(quarterEnd + 1, 0);
    return this.endOfDay(result);
  }

  /**
   * Get start of year
   */
  static startOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(0, 1);
    return this.startOfDay(result);
  }

  /**
   * Get end of year
   */
  static endOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(11, 31);
    return this.endOfDay(result);
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add weeks to date
   */
  static addWeeks(date: Date, weeks: number): Date {
    return this.addDays(date, weeks * 7);
  }

  /**
   * Add months to date
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Add years to date
   */
  static addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Subtract days from date
   */
  static subtractDays(date: Date, days: number): Date {
    return this.addDays(date, -days);
  }

  /**
   * Subtract weeks from date
   */
  static subtractWeeks(date: Date, weeks: number): Date {
    return this.addWeeks(date, -weeks);
  }

  /**
   * Subtract months from date
   */
  static subtractMonths(date: Date, months: number): Date {
    return this.addMonths(date, -months);
  }

  /**
   * Subtract years from date
   */
  static subtractYears(date: Date, years: number): Date {
    return this.addYears(date, -years);
  }

  /**
   * Get difference in days between two dates
   */
  static diffInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date1.getTime() - date2.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get difference in weeks between two dates
   */
  static diffInWeeks(date1: Date, date2: Date): number {
    return Math.floor(this.diffInDays(date1, date2) / 7);
  }

  /**
   * Get difference in months between two dates
   */
  static diffInMonths(date1: Date, date2: Date): number {
    const yearDiff = date1.getFullYear() - date2.getFullYear();
    const monthDiff = date1.getMonth() - date2.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Get difference in years between two dates
   */
  static diffInYears(date1: Date, date2: Date): number {
    return date1.getFullYear() - date2.getFullYear();
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return this.formatDate(date) === this.formatDate(today);
  }

  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date): boolean {
    const yesterday = this.subtractDays(new Date(), 1);
    return this.formatDate(date) === this.formatDate(yesterday);
  }

  /**
   * Check if date is tomorrow
   */
  static isTomorrow(date: Date): boolean {
    const tomorrow = this.addDays(new Date(), 1);
    return this.formatDate(date) === this.formatDate(tomorrow);
  }

  /**
   * Check if date is this week
   */
  static isThisWeek(date: Date): boolean {
    const now = new Date();
    const startOfWeek = this.startOfWeek(now);
    const endOfWeek = this.endOfWeek(now);
    return date >= startOfWeek && date <= endOfWeek;
  }

  /**
   * Check if date is this month
   */
  static isThisMonth(date: Date): boolean {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth();
  }

  /**
   * Check if date is this year
   */
  static isThisYear(date: Date): boolean {
    return date.getFullYear() === new Date().getFullYear();
  }

  /**
   * Get relative time string
   */
  static getRelativeTimeString(date: Date, baseDate: Date = new Date()): string {
    const diffInMs = date.getTime() - baseDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (Math.abs(diffInMinutes) < 1) {
      return 'just now';
    } else if (diffInMinutes > 0 && diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 0 && Math.abs(diffInMinutes) < 60) {
      return `in ${Math.abs(diffInMinutes)} minute${Math.abs(diffInMinutes) !== 1 ? 's' : ''}`;
    } else if (diffInHours > 0 && diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 0 && Math.abs(diffInHours) < 24) {
      return `in ${Math.abs(diffInHours)} hour${Math.abs(diffInHours) !== 1 ? 's' : ''}`;
    } else if (diffInDays > 0 && diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 0 && Math.abs(diffInDays) < 7) {
      return `in ${Math.abs(diffInDays)} day${Math.abs(diffInDays) !== 1 ? 's' : ''}`;
    } else {
      return this.formatDate(date);
    }
  }

  /**
   * Get date range for period
   */
  static getDateRangeForPeriod(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    date: Date = new Date()
  ): DateRange {
    switch (period) {
      case 'day':
        return {
          start: this.startOfDay(date),
          end: this.endOfDay(date),
        };
      case 'week':
        return {
          start: this.startOfWeek(date),
          end: this.endOfWeek(date),
        };
      case 'month':
        return {
          start: this.startOfMonth(date),
          end: this.endOfMonth(date),
        };
      case 'quarter':
        return {
          start: this.startOfQuarter(date),
          end: this.endOfQuarter(date),
        };
      case 'year':
        return {
          start: this.startOfYear(date),
          end: this.endOfYear(date),
        };
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  /**
   * Get period info with previous period for comparison
   */
  static getPeriodInfo(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    date: Date = new Date()
  ): PeriodInfo {
    const currentRange = this.getDateRangeForPeriod(period, date);

    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'day':
        previousStart = this.subtractDays(currentRange.start, 1);
        previousEnd = this.subtractDays(currentRange.end, 1);
        break;
      case 'week':
        previousStart = this.subtractWeeks(currentRange.start, 1);
        previousEnd = this.subtractWeeks(currentRange.end, 1);
        break;
      case 'month':
        previousStart = this.subtractMonths(currentRange.start, 1);
        previousEnd = this.subtractMonths(currentRange.end, 1);
        break;
      case 'quarter':
        previousStart = this.subtractMonths(currentRange.start, 3);
        previousEnd = this.subtractMonths(currentRange.end, 3);
        break;
      case 'year':
        previousStart = this.subtractYears(currentRange.start, 1);
        previousEnd = this.subtractYears(currentRange.end, 1);
        break;
    }

    const label = this.getPeriodLabel(period, date);

    return {
      period,
      start: currentRange.start,
      end: currentRange.end,
      label,
      previousStart,
      previousEnd,
    };
  }

  /**
   * Get period label
   */
  static getPeriodLabel(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    date: Date = new Date()
  ): string {
    switch (period) {
      case 'day':
        return this.formatDate(date);
      case 'week':
        const weekStart = this.startOfWeek(date);
        const weekEnd = this.endOfWeek(date);
        return `${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}`;
      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  /**
   * Validate date string
   */
  static isValidDateString(dateString: string): boolean {
    const parsed = new Date(dateString);
    return !isNaN(parsed.getTime());
  }

  /**
   * Validate date range
   */
  static isValidDateRange(start: Date | string, end: Date | string): boolean {
    const startDate = typeof start === 'string' ? this.parseDate(start) : start;
    const endDate = typeof end === 'string' ? this.parseDate(end) : end;

    return startDate <= endDate;
  }

  /**
   * Get overlapping days between two date ranges
   */
  static getOverlappingDays(range1: DateRange, range2: DateRange): number {
    const overlapStart = new Date(Math.max(range1.start.getTime(), range2.start.getTime()));
    const overlapEnd = new Date(Math.min(range1.end.getTime(), range2.end.getTime()));

    if (overlapStart > overlapEnd) {
      return 0;
    }

    return this.diffInDays(overlapEnd, overlapStart) + 1;
  }

  /**
   * Generate date range array
   */
  static generateDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = this.addDays(currentDate, 1);
    }

    return dates;
  }
}

// Date formatting utilities
export class DateFormatUtils {
  /**
   * Format date with locale
   */
  static formatWithLocale(
    date: Date,
    format: Intl.DateTimeFormatOptions,
    locale: string = 'en-US'
  ): string {
    return new Intl.DateTimeFormat(locale, format).format(date);
  }

  /**
   * Format date as short date (e.g., "1/15/2023")
   */
  static formatShort(date: Date, locale: string = 'en-US'): string {
    return this.formatWithLocale(date, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }, locale);
  }

  /**
   * Format date as medium date (e.g., "Jan 15, 2023")
   */
  static formatMedium(date: Date, locale: string = 'en-US'): string {
    return this.formatWithLocale(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }, locale);
  }

  /**
   * Format date as long date (e.g., "January 15, 2023")
   */
  static formatLong(date: Date, locale: string = 'en-US'): string {
    return this.formatWithLocale(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }, locale);
  }

  /**
   * Format date with time (e.g., "Jan 15, 2023, 2:30 PM")
   */
  static formatWithTime(date: Date, locale: string = 'en-US'): string {
    return this.formatWithLocale(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }, locale);
  }

  /**
   * Format time only (e.g., "2:30 PM")
   */
  static formatTimeOnly(date: Date, locale: string = 'en-US'): string {
    return this.formatWithLocale(date, {
      hour: 'numeric',
      minute: '2-digit',
    }, locale);
  }

  /**
   * Format date in ISO format for APIs
   */
  static formatForAPI(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format date for display in user timezone
   */
  static formatInTimezone(
    date: Date,
    timezone: string,
    format: Intl.DateTimeFormatOptions,
    locale: string = 'en-US'
  ): string {
    return new Intl.DateTimeFormat(locale, {
      ...format,
      timeZone: timezone,
    }).format(date);
  }
}

// Export convenience functions
export const formatDate = (date: Date) => DateUtils.formatDate(date);
export const parseDate = (dateString: string) => DateUtils.parseDate(dateString);
export const startOfDay = (date: Date) => DateUtils.startOfDay(date);
export const endOfDay = (date: Date) => DateUtils.endOfDay(date);
export const startOfMonth = (date: Date) => DateUtils.startOfMonth(date);
export const endOfMonth = (date: Date) => DateUtils.endOfMonth(date);
export const addDays = (date: Date, days: number) => DateUtils.addDays(date, days);
export const addMonths = (date: Date, months: number) => DateUtils.addMonths(date, months);
export const diffInDays = (date1: Date, date2: Date) => DateUtils.diffInDays(date1, date2);
export const isToday = (date: Date) => DateUtils.isToday(date);
export const getRelativeTimeString = (date: Date, baseDate?: Date) => DateUtils.getRelativeTimeString(date, baseDate);
export const getDateRangeForPeriod = (period: string, date?: Date) => DateUtils.getDateRangeForPeriod(period as any, date);
export const getUserTimezone = () => TimezoneUtils.getUserTimezone();
export const isValidDateString = (dateString: string) => DateUtils.isValidDateString(dateString);