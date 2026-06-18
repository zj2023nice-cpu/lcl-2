import {
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsString,
  IsBoolean,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteType, RouteStatus } from '../../entities/route.entity';

export class RouteBatchFiltersDto {
  @IsOptional()
  @IsEnum(RouteType)
  type?: RouteType;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  wall_id?: number;
}

export class BatchUpdateRouteStatusDto {
  @IsEnum(RouteStatus)
  status: RouteStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  route_ids?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RouteBatchFiltersDto)
  filters?: RouteBatchFiltersDto;

  @IsOptional()
  @IsBoolean()
  include_archived?: boolean;
}
