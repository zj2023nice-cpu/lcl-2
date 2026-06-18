import { IsString, IsInt, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsInt()
  parent_id?: number;

  @IsOptional()
  @IsInt()
  reply_to_user_id?: number;
}
