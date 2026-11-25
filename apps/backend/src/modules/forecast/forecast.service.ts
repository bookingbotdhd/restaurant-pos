import { BadRequestException, Injectable } from '@nestjs/common';
import { BranchTimeService } from '../../common/services/branch-time.service';
import {
  addDaysToDate,
  localDate,
  zonedRange,
} from '../../common/time';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BACKTEST_DAYS,
  computeForecast,
  HISTORY_WEEKS,
  type DailySales,
  type ForecastResult,
} from './forecast';

export const FORECAST_HORIZONS = [7, 14] as const;

export interface SalesForecastResponse extends ForecastResult {
  branchId: string;
  timezone: string;
  generatedAt: string;
}

/**
 * Baseline sales forecast. Reads only paid orders — the same source as the
 * "sales-daily" report — and hands the daily totals to the pure
 * computeForecast() in forecast.ts. No ML, no external service.
 */
@Injectable()
export class ForecastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: BranchTimeService,
  ) {}

  async getForecast(
    branchId: string,
    horizonDays = 7,
  ): Promise<SalesForecastResponse> {
    if (!(FORECAST_HORIZONS as readonly number[]).includes(horizonDays)) {
      throw new BadRequestException(
        `days must be one of ${FORECAST_HORIZONS.join(', ')}`,
      );
    }

    const tz = await this.time.tzForBranch(branchId);
    const today = localDate(new Date(), tz);
    // History must cover the 8-week same-weekday window plus the 14-day
    // backtest window behind it; it ends yesterday, so today's partial
    // sales never leak into an average.
    const historyStart = addDaysToDate(
      today,
      -(HISTORY_WEEKS * 7 + BACKTEST_DAYS),
    );
    const historyEnd = addDaysToDate(today, -1);
    const range = zonedRange(historyStart, historyEnd, tz);

    const orders = await this.prisma.order.findMany({
      where: { branchId, status: 'PAID', billedAt: range },
      select: { billedAt: true, totalAmount: true, tipAmount: true },
    });
    // Same sales definition as reports "sales-daily": total less tips.
    const byDay = new Map<string, DailySales>();
    for (const o of orders) {
      if (!o.billedAt) continue;
      const d = localDate(o.billedAt, tz);
      const row = byDay.get(d) ?? { date: d, sales: 0, orders: 0 };
      row.sales += Number(o.totalAmount) - Number(o.tipAmount);
      row.orders++;
      byDay.set(d, row);
    }
    const daily = [...byDay.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const forecastDates: string[] = [];
    for (let i = 0; i < horizonDays; i++) {
      forecastDates.push(addDaysToDate(today, i));
    }

    const result = computeForecast(daily, forecastDates);
    return {
      branchId,
      timezone: tz,
      generatedAt: new Date().toISOString(),
      ...result,
    };
  }
}
