import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

function flattenValidationErrors(errors: ValidationError[], parent = ''): string[] {
  const out: string[] = [];
  for (const err of errors) {
    const path = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      out.push(...Object.values(err.constraints));
    }
    if (err.children?.length) {
      out.push(...flattenValidationErrors(err.children, path));
    }
  }
  return out;
}

function translateConstraint(msg: string): string {
  if (msg.includes('should not exist')) return '请求包含不允许的字段';
  if (msg.includes('must be a string')) return '字段类型应为文本';
  if (msg.includes('must be an email')) return '邮箱格式不正确';
  if (msg.includes('must be a number')) return '字段类型应为数字';
  if (msg.includes('must be a boolean')) return '字段类型应为布尔值';
  if (msg.includes('must be an array')) return '字段类型应为数组';
  if (msg.includes('must be one of the following values')) {
    return msg.replace(
      'must be one of the following values',
      '取值必须是以下之一',
    );
  }
  if (msg.includes('must be shorter than or equal to')) {
    return msg
      .replace('must be shorter than or equal to', '长度不能超过')
      .replace('characters', '个字符');
  }
  if (msg.includes('should not be empty')) return '字段不能为空';
  if (msg.includes('must be a valid enum value')) return '枚举值不合法';
  return msg;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors).map(translateConstraint);
        return new BadRequestException(
          messages.length ? messages : ['请求参数不合法'],
        );
      },
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Petticoat API http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`Uploads http://localhost:${port}/uploads/`);
}
bootstrap();
