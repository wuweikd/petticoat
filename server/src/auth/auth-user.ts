import { UserRole } from '@prisma/client';

/** Concrete class so Nest emitDecoratorMetadata works with isolatedModules */
export class AuthUser {
  id!: string;
  phone!: string | null;
  nickname!: string;
  role!: UserRole;
}
