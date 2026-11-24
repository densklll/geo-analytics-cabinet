import { Controller, Get } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { DatabaseService } from '../db/database.service';
import { AccessService } from '../common/access.service';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly db: DatabaseService,
    private readonly access: AccessService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    const companyId = this.access.resolveCompany(user);
    return this.db.query(
      `SELECT c.id, c.name, count(b.id)::int AS "branchesCount"
         FROM companies c
         LEFT JOIN branches b ON b.company_id = c.id
        WHERE $1::int IS NULL OR c.id = $1
        GROUP BY c.id
        ORDER BY c.name`,
      [companyId],
    );
  }
}
