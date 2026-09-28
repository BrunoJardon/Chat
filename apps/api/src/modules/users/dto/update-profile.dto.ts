import { UpdateProfileRequest } from '@chat/types';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto implements UpdateProfileRequest {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(40)
  readonly name?: string;
}
