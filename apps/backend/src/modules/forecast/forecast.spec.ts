import { computeForecast, type DailySales } from './forecast';

// Flat weekly pattern, 10 weeks ending Tuesday 2026-11-24: Mondays 1000,
// Tuesdays 1100, Wednesdays 1200, Thursdays 1300, Fridays 2000,
// Saturdays 2500, Sundays 1600. Flat data means the backtest error is 0%.
const DAY_MS = 86_400_000;
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const WEEKDAY_SALES = [1600, 1000, 1100, 1200, 1300, 2000, 2500]; // Sun..Sat

function flatHistory(): DailySales[] {
  const daily: DailySales[] = [];
  const start = Date.parse('2026-09-16T00:00:00Z'); // a Wednesday
  for (let i = 0; i < 70; i++) {
    const ms = start + i * DAY_MS;
    const wd = new Date(ms).getUTCDay();
    daily.push({ date: fmt(ms), sales: WEEKDAY_SALES[wd], orders: 10 + wd });
  }
  return daily;
}

function next7(from: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    fmt(Date.parse(`${from}T00:00:00Z`) + i * DAY_MS),
  );
}

describe('computeForecast', () => {
  it('averages the same weekday over the past 8 weeks', () => {
    const r = computeForecast(flatHistory(), next7('2026-11-25'));
    const byDate = Object.fromEntries(r.days.map((d) => [d.date, d]));
    // 2026-11-25 Wed -> 1200, 11-27 Fri -> 2000, 11-28 Sat -> 2500.
    expect(byDate['2026-11-25'].forecastSales).toBe(1200);
    expect(byDate['2026-11-27'].forecastSales).toBe(2000);
    expect(byDate['2026-11-28'].forecastSales).toBe(2500);
    expect(byDate['2026-11-25'].confidence).toBe('good');
    expect(byDate['2026-11-25'].observations).toBe(8);
    expect(r.method).toContain('Same-weekday average');
    expect(r.horizonDays).toBe(7);
    expect(r.from).toBe('2026-11-25');
    expect(r.to).toBe('2026-12-01');
  });

  it('leaves days with no paid orders out of the average instead of zeroing them', () => {
    const daily = flatHistory().filter((d) => d.date !== '2026-11-22'); // a Sunday
    const r = computeForecast(daily, next7('2026-11-25'));
    const sunday = r.days.find((d) => d.date === '2026-11-29')!;
    expect(sunday.forecastSales).toBe(1600);
    expect(sunday.observations).toBe(7);
    expect(sunday.noSalesDays).toBe(1);
    // ...and the missing day shows as zero in the recent-actuals strip.
    expect(r.recentActuals.find((d) => d.date === '2026-11-22')).toEqual({
      date: '2026-11-22',
      sales: 0,
      orders: 0,
    });
    expect(r.recentActuals).toHaveLength(14);
  });

  it('flags thin history as low confidence and explains it', () => {
    const mondays = flatHistory().filter(
      (d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 1,
    );
    const daily = flatHistory().filter(
      (d) => d.date >= '2026-11-09' || !mondays.some((m) => m.date === d.date),
    );
    const r = computeForecast(daily, next7('2026-11-25'));
    const monday = r.days.find((d) => d.date === '2026-11-30')!;
    expect(monday.observations).toBe(3);
    expect(monday.confidence).toBe('low');
    expect(monday.forecastSales).toBe(1000);
  });

  it('falls back to the overall daily average when a weekday has no history', () => {
    const sats = flatHistory().filter(
      (d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 6,
    );
    const r = computeForecast(sats, ['2026-11-25']);
    expect(r.days[0].confidence).toBe('fallback');
    expect(r.days[0].forecastSales).toBe(2500);
    expect(r.days[0].lowSales).toBeNull();
    expect(r.days[0].highSales).toBeNull();
  });

  it('returns nulls, not invented numbers, with no history at all', () => {
    const r = computeForecast([], next7('2026-11-25'));
    expect(r.days).toHaveLength(7);
    for (const d of r.days) {
      expect(d.forecastSales).toBeNull();
      expect(d.confidence).toBe('none');
    }
    expect(r.backtest.meanAbsPctError).toBeNull();
    expect(r.backtest.daysChecked).toBe(0);
  });

  it('reports the min/max band of the observations', () => {
    const varied: DailySales[] = [900, 1000, 1100].map((sales, w) => ({
      date: fmt(Date.parse('2026-11-04T00:00:00Z') + w * 7 * DAY_MS),
      sales,
      orders: 10,
    }));
    const r = computeForecast(varied, ['2026-11-25']);
    expect(r.days[0].forecastSales).toBe(1000);
    expect(r.days[0].lowSales).toBe(900);
    expect(r.days[0].highSales).toBe(1100);
    expect(r.days[0].confidence).toBe('low');
  });

  it('hindcasts the last 14 days and scores the method honestly', () => {
    const r = computeForecast(flatHistory(), next7('2026-11-25'));
    // Flat data: the method reproduces itself exactly.
    expect(r.backtest.meanAbsPctError).toBe(0);
    expect(r.backtest.daysChecked).toBe(14);
    expect(r.limitations.length).toBeGreaterThan(0);
    expect(r.limitations.join(' ')).toContain('not machine learning');
  });
});
