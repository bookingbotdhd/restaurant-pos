// Baseline sales forecast — pure arithmetic, no ML and no external service.
//
// Method: for each future date, average the paid sales (excluding tips, the
// same definition as the reports "sales-daily" report) of the same weekday
// over the past HISTORY_WEEKS weeks. A restaurant's week has a shape —
// weekends busier than Mondays — and a same-weekday average captures that
// shape without pretending to know why. Days with no paid orders are treated
// as "no data" (closed day, or a day with no sales), not as zero: averaging
// in a closed Monday would drag every future Monday down for a reason that
// has nothing to do with demand.
//
// This file is deliberately free of Nest/Prisma imports so the maths can be
// unit-tested on its own (see forecast.spec.ts).

export const HISTORY_WEEKS = 8;
export const BACKTEST_DAYS = 14;

export interface DailySales {
  /** Local calendar date, YYYY-MM-DD. Only days with >= 1 paid order. */
  date: string;
  /** Paid sales excluding tips. */
  sales: number;
  orders: number;
}

export type ForecastConfidence = 'good' | 'low' | 'fallback' | 'none';

export interface ForecastDay {
  date: string;
  /** 0 = Sunday, as in Date#getUTCDay on the YYYY-MM-DD string. */
  weekday: number;
  /** Null when there is no sales history at all to base anything on. */
  forecastSales: number | null;
  forecastOrders: number | null;
  /** Min / max of the same-weekday observations; null when there are none. */
  lowSales: number | null;
  highSales: number | null;
  /** Same-weekday days with sales that went into the average. */
  observations: number;
  /** Same-weekday days in the window with no paid orders (closed / no sales). */
  noSalesDays: number;
  confidence: ForecastConfidence;
  /** One line saying what this day's number is based on. */
  basis: string;
}

export interface ForecastBacktest {
  /** Days in the last BACKTEST_DAYS with sales that could be hindcast. */
  daysChecked: number;
  /** Mean absolute % error of the hindcast, or null when nothing to check. */
  meanAbsPctError: number | null;
  note: string;
}

export interface ForecastResult {
  method: string;
  historyWeeks: number;
  horizonDays: number;
  /** First forecast date (today, local) and last forecast date. */
  from: string;
  to: string;
  days: ForecastDay[];
  /** Every calendar day of the last BACKTEST_DAYS, zero where no paid orders. */
  recentActuals: DailySales[];
  backtest: ForecastBacktest;
  limitations: string[];
}

export const FORECAST_LIMITATIONS = [
  'Baseline only, not machine learning: it repeats the recent same-weekday pattern and knows nothing about holidays, festivals, events, weather, menu or price changes.',
  'Days with no paid orders are left out of the average instead of counting as zero, so a regularly closed weekday has no forecast of its own.',
  'One unusual week (a party booking, a closure, a festival) moves the average for its weekday until it ages out of the 8-week window.',
  'With fewer than 4 same-weekday observations the estimate is shaky — see the confidence on each day.',
] as const;

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function parseDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return formatDay(parseDay(date) + days * DAY_MS);
}

function weekdayOf(date: string): number {
  return new Date(parseDay(date)).getUTCDay();
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Same-weekday observations for `refDate`: entries in `byDate` on the same
 * weekday, strictly before `refDate`, going back `weeks` weeks. `end` caps
 * the window (the history window ends yesterday; a forecast 10 days out
 * must not "learn" from days that have not happened yet).
 */
function sameWeekdayObservations(
  byDate: Map<string, DailySales>,
  refDate: string,
  weeks: number,
  end: string,
): { sales: DailySales[]; noSalesDays: number } {
  const weekday = weekdayOf(refDate);
  const sales: DailySales[] = [];
  let noSalesDays = 0;
  // Walk back week by week from the most recent same weekday <= end.
  const endMs = parseDay(end);
  // Most recent date <= end with this weekday.
  const offset = (new Date(endMs).getUTCDay() - weekday + 7) % 7;
  for (let w = 0; w < weeks; w++) {
    const d = formatDay(endMs - (offset + w * 7) * DAY_MS);
    if (d >= refDate) continue;
    const entry = byDate.get(d);
    if (entry) sales.push(entry);
    else noSalesDays++;
  }
  return { sales, noSalesDays };
}

function forecastOne(
  byDate: Map<string, DailySales>,
  date: string,
  historyEnd: string,
  weeks: number,
  overallMean: number | null,
  overallMeanOrders: number | null,
): ForecastDay {
  const weekday = weekdayOf(date);
  const { sales: obs, noSalesDays } = sameWeekdayObservations(
    byDate,
    date,
    weeks,
    historyEnd,
  );
  const base = {
    date,
    weekday,
    observations: obs.length,
    noSalesDays,
  };
  if (obs.length > 0) {
    const values = obs.map((o) => o.sales);
    const orders = obs.map((o) => o.orders);
    return {
      ...base,
      forecastSales: round2(mean(values)),
      forecastOrders: Math.round(mean(orders)),
      lowSales: round2(Math.min(...values)),
      highSales: round2(Math.max(...values)),
      confidence: obs.length >= 4 ? 'good' : 'low',
      basis:
        obs.length === 1
          ? `Only one ${WEEKDAYS[weekday]} with sales in the last ${weeks} weeks — treat as a rough guide.`
          : `Average of ${obs.length} ${WEEKDAYS[weekday]}s with sales in the last ${weeks} weeks.`,
    };
  }
  if (overallMean !== null) {
    return {
      ...base,
      forecastSales: round2(overallMean),
      forecastOrders:
        overallMeanOrders !== null ? Math.round(overallMeanOrders) : null,
      lowSales: null,
      highSales: null,
      confidence: 'fallback',
      basis: `No ${WEEKDAYS[weekday]} with sales in the last ${weeks} weeks — fell back to the overall daily average.`,
    };
  }
  return {
    ...base,
    forecastSales: null,
    forecastOrders: null,
    lowSales: null,
    highSales: null,
    confidence: 'none',
    basis: 'No sales history at all yet.',
  };
}

/**
 * Compute the forecast. `daily` holds only days with >= 1 paid order;
 * `forecastDates` are the local dates to predict, ascending, starting today.
 * The history window ends the day before the first forecast date.
 */
export function computeForecast(
  daily: DailySales[],
  forecastDates: string[],
  weeks: number = HISTORY_WEEKS,
): ForecastResult {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const historyEnd =
    forecastDates.length > 0 ? addDays(forecastDates[0], -1) : '';
  const allSales = daily.map((d) => d.sales);
  const overallMean = allSales.length > 0 ? mean(allSales) : null;
  const overallMeanOrders =
    daily.length > 0 ? mean(daily.map((d) => d.orders)) : null;

  const days = forecastDates.map((date) =>
    forecastOne(byDate, date, historyEnd, weeks, overallMean, overallMeanOrders),
  );

  // Recent actuals: every calendar day of the last BACKTEST_DAYS, zero
  // where the branch took no paid orders — the chart needs a continuous line.
  const recentActuals: DailySales[] = [];
  for (let i = BACKTEST_DAYS - 1; i >= 0; i--) {
    const date = addDays(historyEnd, -i);
    const entry = byDate.get(date);
    recentActuals.push({
      date,
      sales: entry ? round2(entry.sales) : 0,
      orders: entry ? entry.orders : 0,
    });
  }

  // Backtest: hindcast each of the last BACKTEST_DAYS that had sales, using
  // only same-weekday data from before that day, and score the error. This
  // says how far off this exact method has been lately — nothing more.
  const errors: number[] = [];
  let daysChecked = 0;
  for (const actual of recentActuals) {
    const entry = byDate.get(actual.date);
    if (!entry || entry.sales <= 0) continue;
    const { sales: obs } = sameWeekdayObservations(
      byDate,
      actual.date,
      weeks,
      addDays(actual.date, -1),
    );
    if (obs.length === 0) continue;
    daysChecked++;
    errors.push(Math.abs(mean(obs.map((o) => o.sales)) - entry.sales) / entry.sales);
  }
  const meanAbsPctError =
    errors.length > 0 ? Math.round(mean(errors) * 1000) / 10 : null;
  const backtest: ForecastBacktest = {
    daysChecked,
    meanAbsPctError,
    note:
      errors.length > 0
        ? `Hindcast over the last ${BACKTEST_DAYS} days: this method was off by ${meanAbsPctError}% on average across ${daysChecked} day${daysChecked === 1 ? '' : 's'} with sales.`
        : `Not enough history to check accuracy yet — need at least one past day with sales and an earlier same weekday to compare against.`,
  };

  return {
    method: `Same-weekday average of paid sales (excluding tips) over the past ${weeks} weeks`,
    historyWeeks: weeks,
    horizonDays: forecastDates.length,
    from: forecastDates[0] ?? '',
    to: forecastDates[forecastDates.length - 1] ?? '',
    days,
    recentActuals,
    backtest,
    limitations: [...FORECAST_LIMITATIONS],
  };
}
