import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { LicenceController } from './licence.controller';
import { LicenceService } from './licence.service';

@Module({
  imports: [AuditModule],
  controllers: [LicenceController],
  providers: [LicenceService],
})
export class LicenceModule {}
