import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string) {
    return this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { nickname: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        phone: true,
        nickname: true,
        role: true,
        createdAt: true,
        _count: {
          select: { wardrobeEntries: true, posts: true },
        },
      },
    });
  }

  async update(id: string, data: { nickname?: string; role?: UserRole }) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          phone: true,
          nickname: true,
          role: true,
          createdAt: true,
        },
      });
    } catch {
      throw new NotFoundException('用户不存在');
    }
  }
}
