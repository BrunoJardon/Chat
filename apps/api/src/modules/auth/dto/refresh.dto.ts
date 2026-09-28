import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { RefreshRequest } from '@chat/types';

export class RefreshDto implements RefreshRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly refreshToken: string;
}
