import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  // Varsayılan ve hedef dil çeviri dosyalarını yükle
  const defaultMessages = (await import(`../../messages/tr.json`)).default;
  let localeMessages = {};
  try {
    localeMessages = (await import(`../../messages/${locale}.json`)).default;
  } catch (err) {
    console.error(`Failed to load messages for locale: ${locale}`, err);
  }

  // Derinlemesine merge (birleştirme) fonksiyonu
  const mergeDeep = (target: any, source: any) => {
    const output = Object.assign({}, target);
    if (source && typeof source === "object") {
      Object.keys(source).forEach((key) => {
        if (source[key] && typeof source[key] === "object") {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  };

  const messages = mergeDeep(defaultMessages, localeMessages);

  return {
    locale,
    messages,
  };
});
