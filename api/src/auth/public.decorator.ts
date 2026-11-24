import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Помечает эндпоинт, доступный без токена (логин, healthcheck) */
export const Public = () => SetMetadata(IS_PUBLIC, true);
