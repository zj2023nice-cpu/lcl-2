import {
  IsArray,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  Matches,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeSegment } from '../../entities/gym-business-hours.entity';

export class TimeSegmentDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'open 必须为 HH:mm 格式' })
  open: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'close 必须为 HH:mm 格式' })
  close: string;
}

export class SpecialDateSegmentDto extends TimeSegmentDto {}

export class SpecialDateDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date 必须为 YYYY-MM-DD 格式' })
  date: string;

  @IsBoolean()
  is_closed: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecialDateSegmentDto)
  segments: SpecialDateSegmentDto[];

  @IsOptional()
  @IsString()
  @Length(0, 100)
  note?: string;
}

export class TemporaryClosureDto {
  @IsString()
  id: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'start_date 必须为 YYYY-MM-DD 格式' })
  start_date: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'end_date 必须为 YYYY-MM-DD 格式' })
  end_date: string;

  @IsString()
  @Length(1, 100)
  reason: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  message?: string;

  @IsOptional()
  @IsString()
  created_at?: string;
}

export class UpdateBusinessHoursDto {
  @IsOptional()
  @IsArray()
  @IsArray({ each: true })
  weekly_schedule?: TimeSegment[][];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecialDateDto)
  special_dates?: SpecialDateDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemporaryClosureDto)
  temporary_closures?: TemporaryClosureDto[];

  @IsOptional()
  @IsString()
  @Length(1, 50)
  timezone?: string;
}
