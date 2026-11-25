import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  activateLicenceSchema,
  issueLicenceSchema,
  type SessionUser,
} from '@restroos/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LicenceService } from './licence.service';

@ApiTags('licence')
@Controller('v1/licence')
export class LicenceController {
  constructor(private readonly licenceService: LicenceService) {}

  @Auth('settings.manage')
  @Get()
  async listIssued() {
    return this.licenceService.listIssued();
  }

  @Auth('settings.manage')
  @Get('status')
  async getStatus(@CurrentUser() user: SessionUser) {
    return this.licenceService.getStatus(user);
  }

  @Auth('settings.manage')
  @Post('issue')
  @UsePipes(new ZodValidationPipe(issueLicenceSchema))
  async issue(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.licenceService.issue(user, body as never);
  }

  @Auth('settings.manage')
  @Post('activate')
  @UsePipes(new ZodValidationPipe(activateLicenceSchema))
  async activate(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.licenceService.activate(user, body as never);
  }

  @Auth('settings.manage')
  @Post('deactivate')
  async deactivate(@CurrentUser() user: SessionUser) {
    return this.licenceService.deactivate(user);
  }

  // Defined after the static POST routes above so 'issue' / 'activate' /
  // 'deactivate' are never captured as an :id.
  @Auth('settings.manage')
  @Post(':id/revoke')
  async revoke(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.licenceService.revoke(user, id);
  }
}
