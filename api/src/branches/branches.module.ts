import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [MetricsModule],
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
