import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, subWeeks, isWithinInterval, format } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export const getDateRangeForPeriod = (period: 'week' | 'month' | 'semester' | 'year', referenceDate: Date = new Date()): DateRange => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'week':
      return {
        start: startOfWeek(today, { weekStartsOn: 0 }),
        end: endOfWeek(today, { weekStartsOn: 0 })
      };
    
    case 'month':
      return {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };
    
    case 'semester':
      // 6 months period
      const semesterStart = startOfMonth(addMonths(today, -5));
      return {
        start: semesterStart,
        end: endOfMonth(today)
      };
    
    case 'year':
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return {
        start: yearStart,
        end: endOfMonth(today)
      };
    
    default:
      return {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };
  }
};

export const getPreviousPeriodRange = (period: 'week' | 'month' | 'semester' | 'year', referenceDate: Date = new Date()): DateRange => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'week':
      const prevWeekDate = subWeeks(today, 1);
      return {
        start: startOfWeek(prevWeekDate, { weekStartsOn: 0 }),
        end: endOfWeek(prevWeekDate, { weekStartsOn: 0 })
      };
    
    case 'month':
      const prevMonthDate = subMonths(today, 1);
      return {
        start: startOfMonth(prevMonthDate),
        end: endOfMonth(prevMonthDate)
      };
    
    case 'semester':
      const prevSemesterEnd = addMonths(startOfMonth(today), -6);
      const prevSemesterStart = addMonths(prevSemesterEnd, -5);
      return {
        start: startOfMonth(prevSemesterStart),
        end: endOfMonth(prevSemesterEnd)
      };
    
    case 'year':
      const prevYear = today.getFullYear() - 1;
      return {
        start: new Date(prevYear, 0, 1),
        end: new Date(prevYear, 11, 31)
      };
    
    default:
      const defaultPrevMonth = subMonths(today, 1);
      return {
        start: startOfMonth(defaultPrevMonth),
        end: endOfMonth(defaultPrevMonth)
      };
  }
};

export const isDateInRange = (date: string | Date, range: DateRange): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  dateObj.setHours(0, 0, 0, 0);
  
  return isWithinInterval(dateObj, { start: range.start, end: range.end });
};

export const formatDateRange = (range: DateRange): string => {
  return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d, yyyy')}`;
};

export const calculatePercentageChange = (current: number, previous: number): { value: number; text: string; type: 'positive' | 'negative' | 'neutral' } => {
  if (previous === 0) {
    if (current === 0) {
      return { value: 0, text: 'No change', type: 'neutral' };
    }
    return { value: 100, text: '+100%', type: 'positive' };
  }

  const percentChange = ((current - previous) / previous) * 100;
  const roundedChange = Math.round(percentChange * 10) / 10;
  
  if (Math.abs(roundedChange) < 0.1) {
    return { value: 0, text: 'No change', type: 'neutral' };
  }

  const sign = roundedChange > 0 ? '+' : '';
  return {
    value: roundedChange,
    text: `${sign}${roundedChange}%`,
    type: roundedChange > 0 ? 'positive' : 'negative'
  };
};

export const getCustomDateRange = (from: Date, to: Date): DateRange => {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};
