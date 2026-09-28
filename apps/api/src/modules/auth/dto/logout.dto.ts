import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { LogoutRequest } from '@chat/types';

export class LogoutDto implements LogoutRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly refreshToken: string;
}
