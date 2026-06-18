import { IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class BanUserDto {
  @IsBoolean()
  banned: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_hours?: number;
}
