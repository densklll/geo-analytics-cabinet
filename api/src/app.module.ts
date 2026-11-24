import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { CommonModule } from './common/common.module';
import { CompaniesModule } from './companies/companies.module';
import { DatabaseModule } from './db/database.module';
import { HealthController } from './health.controller';
import { MetricsModule } from './metrics/metrics.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [DatabaseModule, CommonModule, AuthModule, CompaniesModule, BranchesModule, MetricsModule, ReviewsModule],
  controllers: [HealthController],
})
export class AppModule {}
