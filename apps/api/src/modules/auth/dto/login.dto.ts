import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { LoginRequest } from '@chat/types';

export class LoginDto implements LoginRequest {
  @IsEmail()
  @MaxLength(254)
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  readonly password: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  readonly deviceId?: string;
}
