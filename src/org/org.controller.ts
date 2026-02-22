import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { randomUUID } from 'crypto';

const DEV_FALLBACK_ORG_ID = process.env.DEFAULT_ORG_ID ?? randomUUID();

@ApiTags('org')
@Controller('org')
export class OrgController {
  @Get('default')
  @ApiOperation({ summary: 'Get the default org ID for this deployment' })
  getDefault(): { orgId: string } {
    const orgId = process.env.DEFAULT_ORG_ID ?? DEV_FALLBACK_ORG_ID;
    if (!orgId) {
      throw new InternalServerErrorException(
        'DEFAULT_ORG_ID is not set. Set it in your .env file.',
      );
    }
    return { orgId };
  }
}
