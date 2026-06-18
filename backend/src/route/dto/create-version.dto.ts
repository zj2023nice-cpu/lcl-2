import { IsOptional, IsString, Length, IsEnum, IsArray } from 'class-validator';
import { RouteVersionChangeType } from '../../entities/route-version.entity';

export class CreateVersionDto {
  @IsEnum(RouteVersionChangeType)
  change_type: RouteVersionChangeType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  change_description?: string;

  @IsOptional()
  @IsArray()
  changed_fields?: string[];
}
