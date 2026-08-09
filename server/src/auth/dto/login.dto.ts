import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;
}

export class SendCodeDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
