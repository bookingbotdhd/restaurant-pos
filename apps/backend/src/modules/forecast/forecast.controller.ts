import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@restroos/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { FORECAST_HORIZONS, ForecastService } from './forecast.service';

@ApiTags('forecast')
@Controller('v1/forecast')
export class ForecastController {
  constructor(
    private readonly forecast: ForecastService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  // Sales figures, so the same dashboard.sales.view gate as the dashboard
  // summary and the sales reports — not just reports.access.
  @Auth('dashboard.sales.view')
  @Get()
  async getForecast(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Query('days') days?: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    const n = days === undefined ? 7 : Number(days);
    if (!(FORECAST_HORIZONS as readonly number[]).includes(n)) {
      throw new BadRequestException(
        `days must be one of ${FORECAST_HORIZONS.join(', ')}`,
      );
    }
    return this.forecast.getForecast(branchId, n);
  }
}
