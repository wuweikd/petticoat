import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './auth.decorators';
import { AuthUser } from './auth-user';
import { LoginDto, SendCodeDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendCode(dto.phone);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone, dto.code, false);
  }

  @Public()
  @Post('admin/login')
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone, dto.code, true);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
