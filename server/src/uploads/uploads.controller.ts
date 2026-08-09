import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { Roles } from '../auth/auth.decorators';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const ALLOWED = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
]);

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('uploads')
@Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir();
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
          const safe = ALLOWED.has(ext) ? ext : '.jpg';
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase();
        const mimeOk = (file.mimetype || '').startsWith('image/');
        if (mimeOk || ALLOWED.has(ext)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            '仅支持图片文件（jpg / jpeg / png / webp / heic）。请换一张图再试。',
          ) as unknown as Error,
          false,
        );
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException(
        '未收到图片文件。请确认已选择图片，且字段名为 file，再重新上传。',
      );
    }
    const publicPath = `/uploads/${file.filename}`;
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const absolute = host ? `${proto}://${host}${publicPath}` : publicPath;
    return {
      uri: publicPath,
      url: absolute,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
