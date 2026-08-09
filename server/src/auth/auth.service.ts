import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CodeEntry = { code: string; expiresAt: number };

@Injectable()
export class AuthService {
  /** 本地验证码表（不接短信）；进程内有效 */
  private readonly codes = new Map<string, CodeEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async sendCode(phone: string) {
    const normalized = phone.trim();
    if (!/^\d{6,15}$/.test(normalized)) {
      throw new UnauthorizedException('手机号格式不正确');
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    this.codes.set(normalized, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    // eslint-disable-next-line no-console
    console.log(`[auth] send-code phone=${normalized} code=${code}`);
    return {
      ok: true,
      stub: true,
      /** 开发环境回显，便于模拟器测试；未接真实短信 */
      hint: `开发验证码：${code}（5 分钟内有效）`,
      devCode: code,
    };
  }

  async login(phone: string, code: string, requireStaff = false) {
    const normalized = phone.trim();
    const trimmed = code.trim();
    if (!/^\d{6,15}$/.test(normalized)) {
      throw new UnauthorizedException('手机号格式不正确');
    }
    if (!/^\d{4,8}$/.test(trimmed)) {
      throw new UnauthorizedException('验证码无效');
    }

    const entry = this.codes.get(normalized);
    const ok =
      entry &&
      entry.expiresAt >= Date.now() &&
      entry.code === trimmed;
    // 固定测试号保留 0000，方便本地回归（仍须先 send-code 或直接用 0000）
    const fixedOk = normalized === '13800138000' && trimmed === '0000';
    if (!ok && !fixedOk) {
      throw new UnauthorizedException('验证码错误或已过期，请重新获取');
    }
    if (ok) this.codes.delete(normalized);

    let user = await this.prisma.user.findUnique({
      where: { phone: normalized },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalized,
          nickname: `用户${normalized.slice(-4)}`,
          role: UserRole.USER,
        },
      });
    }

    if (
      requireStaff &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.EDITOR
    ) {
      throw new ForbiddenException('需要编辑或管理员账号');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }

  me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        role: true,
        bio: true,
        avatarUri: true,
        wardrobeVisibility: true,
      },
    });
  }
}
