import { IsInt, IsNotEmpty } from 'class-validator';

export class CompareVersionsDto {
  @IsInt()
  @IsNotEmpty()
  from_version_id: number;

  @IsInt()
  @IsNotEmpty()
  to_version_id: number;
}
