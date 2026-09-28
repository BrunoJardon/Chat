import { IsEmail, MinLength, IsString, MaxLength } from 'class-validator';
import type { RegisterRequest } from '@chat/types';

export class RegisterDto implements RegisterRequest {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  readonly name: string;

  @IsEmail()
  @MaxLength(254)
  readonly email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password: string;
}
