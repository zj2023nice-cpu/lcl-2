import { IsString, Length } from 'class-validator';

export class ArchiveRouteDto {
  @IsString()
  @Length(1, 1000)
  reason: string;
}
