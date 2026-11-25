import { Module } from '@nestjs/common';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { BranchTimeService } from '../../common/services/branch-time.service';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';

@Module({
  controllers: [ForecastController],
  providers: [ForecastService, BranchAccessService, BranchTimeService],
  exports: [ForecastService],
})
export class ForecastModule {}
