import { I18nService } from 'nestjs-i18n';
import { snakeToCamelCase } from '../util/helper-util';

export function phraseToKey(phrase: string): string {
  return phrase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function translatePhrase(
  i18n: I18nService,
  phrase: string,
  lang: string,
): string {
  if (!phrase) return phrase;
  const key = `notifications.phrases.${phraseToKey(phrase)}`;
  const translated = i18n.translate(key, { lang });
  return translated !== key ? (translated as string) : phrase;
}

export function translateModuleLabel(
  i18n: I18nService,
  subject: string,
  fallback: string,
  lang: string,
): string {
  const key = `module-labels.${subject}`;
  const translated = i18n.translate(key, { lang });
  return translated !== key ? (translated as string) : fallback;
}

export function buildNotificationMessage(
  i18n: I18nService,
  params: {
    actorName: string;
    actionName?: string;
    action?: string;
    moduleLabel: string;
  },
  lang: string,
): string {
  const { actorName, actionName, action, moduleLabel } = params;
  if (actionName) {
    const translatedPhrase = translatePhrase(i18n, actionName, lang);
    return i18n.translate('notifications.handler.messageWithAction', {
      lang,
      args: { userName: actorName, actionPhrase: translatedPhrase },
    }) as string;
  }
  return i18n.translate('notifications.handler.messageFallback', {
    lang,
    args: {
      userName: actorName,
      actionVerb: snakeToCamelCase(action ?? ''),
      moduleLabel,
    },
  }) as string;
}

export function buildNotificationTitle(
  i18n: I18nService,
  moduleLabel: string,
  lang: string,
  customTitle?: string,
): string {
  if (customTitle) {
    return translatePhrase(i18n, customTitle, lang);
  }
  return i18n.translate('notifications.handler.inAppTitle', {
    lang,
    args: { moduleLabel },
  }) as string;
}

export function buildNotificationEmailSubject(
  i18n: I18nService,
  moduleLabel: string,
  lang: string,
): string {
  return i18n.translate('notifications.handler.emailSubject', {
    lang,
    args: { moduleLabel },
  }) as string;
}

export function localizeNotificationData(
  i18n: I18nService,
  data: Record<string, any>,
  lang: string,
): Record<string, any> {
  if (!data?.subject && !data?.actorName) {
    return data;
  }
  const moduleLabelLoc = data.subject
    ? translateModuleLabel(
        i18n,
        data.subject,
        data.label ?? data.moduleLabel ?? '',
        lang,
      )
    : (data.moduleLabel ?? data.label ?? '');
  const message =
    data.isExtraUser && data.extraMessage
      ? translatePhrase(i18n, data.extraMessage, lang)
      : buildNotificationMessage(
          i18n,
          {
            actorName: data.actorName,
            actionName: data.actionName,
            action: data.action,
            moduleLabel: moduleLabelLoc,
          },
          lang,
        );
  const title = buildNotificationTitle(
    i18n,
    moduleLabelLoc,
    lang,
    data.titlePhrase,
  );
  return { ...data, message, title, moduleLabel: moduleLabelLoc };
}
