import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessService } from '../common/access.service';
import { resolvePeriod } from '../common/period';
import { PeriodQueryDto } from '../common/scope-query.dto';
import { BranchesService } from './branches.service';

@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branches: BranchesService,
    private readonly access: AccessService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: PeriodQueryDto) {
    const scope = await this.access.resolveScope(user, query);
    return this.branches.listWithStats(scope, resolvePeriod(query.from, query.to));
  }

  @Get(':id')
  async getOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.access.assertBranchAccess(user, id);
    return this.branches.getOne(id);
  }
}
