import { Injectable, ExecutionContext } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';

export const SUPPORTED_LOCALES = ['en', 'ar', 'fr']  as const;

export function resolveLocale(locale?: string): string {
  if (locale && SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    return locale;
  }
  return 'en';
}

@Injectable()
export class HeaderLocaleResolver implements I18nResolver {
  resolve(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    return resolveLocale(request?.headers?.['x-locale']);
  }
}
