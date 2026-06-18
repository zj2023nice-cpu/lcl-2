import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ReportReason } from '../../entities/comment-report.entity';

export class ReportCommentDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
