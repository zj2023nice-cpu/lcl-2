import { IsInt, IsPositive } from 'class-validator';

export class FollowUserDto {
  @IsInt()
  @IsPositive()
  followingId: number;
}
