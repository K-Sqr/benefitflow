"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "hi", label: "Hindi" },
  { code: "hmn", label: "Hmong" },
  { code: "so", label: "Somali" },
  { code: "ar", label: "Arabic" },
  { code: "vi", label: "Vietnamese" },
] as const;

/** Languages shown on the hero (flags). Labels in each locale for accessibility. */
export const HERO_LANGUAGES = [
  { code: "en" as const, flag: "🇺🇸", labelEn: "English", labelEs: "Inglés", labelHi: "अंग्रेज़ी", labelHmn: "English", labelSo: "English" },
  { code: "es" as const, flag: "🇪🇸", labelEn: "Spanish", labelEs: "Español", labelHi: "Español", labelHmn: "Spanish", labelSo: "Spanish" },
  { code: "hi" as const, flag: "🇮🇳", labelEn: "Hindi", labelEs: "Hindi", labelHi: "हिन्दी", labelHmn: "Hindi", labelSo: "Hindi" },
  { code: "hmn" as const, flag: "🇱🇦", labelEn: "Hmong", labelEs: "Hmong", labelHi: "Hmong", labelHmn: "Hmoob", labelSo: "Hmong" },
  { code: "so" as const, flag: "🇸🇴", labelEn: "Somali", labelEs: "Somali", labelHi: "Somali", labelHmn: "Somali", labelSo: "Soomaali" },
] as const;

/** “Speak in your language” tagline per locale */
export const SPEAK_IN_YOUR_LANGUAGE: Record<string, string> = {
  en: "Speak in your language — English, Spanish, Hmong, Somali",
  es: "Habla en tu idioma — Inglés, Español, Hmong, Somali",
  hi: "अपनी भाषा में बोलें — अंग्रेज़ी, Español, Hmong, Somali",
  hmn: "Sib hais lus koj hais — Hmoob, Soomaali, Spanish",
  so: "Ku hadal luqaddaada — Soomaali, Spanish, Hmong",
  ar: "تحدث بلغتك",
  vi: "Nói bằng ngôn ngữ của bạn",
};

/** Why we offer Spanish, Hmong, and Somali (for hero section). */
export const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  es: "Spanish: The most common non-English language spoken throughout the state.",
  hmn: "Hmong: Minnesota has one of the largest Hmong populations in the country.",
  so: "Somali: Significant population concentrated in the Twin Cities area.",
};

/** All UI copy per locale — use so clicking flags translates the whole page */
export type TranslationKey = keyof typeof TRANSLATIONS_EN;

/** Same keys as English; values are strings so each locale can have its own text. */
export type TranslationSet = { [K in TranslationKey]: string };

const TRANSLATIONS_EN = {
  heroBadge: "Helping 30M Americans Claim $30B",
  heroTitle1: "Stop fighting the forms.",
  heroTitle2: "Just talk to get your SNAP ready.",
  heroSubtitle:
    "No 20-page forms. No complicated legal jargon. A 2nd-grade level conversation in your native language is all it takes.",
  demoModeHint:
    "Demo mode. Add NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID to my-app/.env.local and restart dev server for live calls.",
  btnStartCheckLive: "Start Your 2-Minute Check",
  btnStartCheckDemo: "Check My Eligibility in 2 Minutes",
  endCall: "End call",
  listening: "Listening...",
  resultLiveTitle: "We've got your information",
  resultLiveDesc:
    "Based on our conversation, we'll email you the next steps to finish your application.",
  resultDemoTitle: "$7,200/year",
  resultDemoDesc:
    "Based on your talk, you qualify for full SNAP benefits. We've prepared your application.",
  emailPlaceholder: "Enter your email",
  btnEmailLink: "Email me the link to submit",
  startOver: "Start over",
  footerCopy: "Helping 30M Americans claim $30B.",
  progressAriaLabel: "Eligibility progress",
} as const;

const TRANSLATIONS_ES = {
  heroBadge: "Ayudando a 30 millones de estadounidenses a reclamar $30B",
  heroTitle1: "Deja de pelear con los formularios.",
  heroTitle2: "Solo habla para tener tu SNAP listo.",
  heroSubtitle:
    "Sin formularios de 20 páginas. Sin jerga legal complicada. Solo hace falta una conversación en tu idioma.",
  demoModeHint:
    "Modo demo. Añade NEXT_PUBLIC_VAPI_PUBLIC_KEY y NEXT_PUBLIC_VAPI_ASSISTANT_ID en my-app/.env.local y reinicia el servidor.",
  btnStartCheckLive: "Inicia tu verificación de 2 minutos",
  btnStartCheckDemo: "Verificar mi elegibilidad en 2 minutos",
  endCall: "Terminar llamada",
  listening: "Escuchando...",
  resultLiveTitle: "Tenemos tu información",
  resultLiveDesc:
    "Según nuestra conversación, te enviaremos un correo con los siguientes pasos para completar tu solicitud.",
  resultDemoTitle: "$7,200/año",
  resultDemoDesc:
    "Según lo que platicamos, calificas para beneficios completos de SNAP. Preparamos tu solicitud.",
  emailPlaceholder: "Ingresa tu correo electrónico",
  btnEmailLink: "Envíame el enlace por correo",
  startOver: "Empezar de nuevo",
  footerCopy: "Ayudando a 30 millones de estadounidenses a reclamar $30B.",
  progressAriaLabel: "Progreso de elegibilidad",
} as const;

const TRANSLATIONS_HI = {
  heroBadge: "30M अमेरिकियों को $30B दिलाने में मदद",
  heroTitle1: "फ़ॉर्म से लड़ना बंद करें।",
  heroTitle2: "बस बात करके अपना SNAP तैयार करें।",
  heroSubtitle:
    "20 पन्नों के फ़ॉर्म नहीं। कोई पेचीदा कानूनी शब्दजाल नहीं। बस अपनी भाषा में बातचीत।",
  demoModeHint:
    "डेमो मोड। my-app/.env.local में NEXT_PUBLIC_VAPI_PUBLIC_KEY और NEXT_PUBLIC_VAPI_ASSISTANT_ID जोड़ें और सर्वर रीस्टार्ट करें।",
  btnStartCheckLive: "2-मिनट की जाँच शुरू करें",
  btnStartCheckDemo: "2 मिनट में अपनी पात्रता जाँचें",
  endCall: "कॉल समाप्त करें",
  listening: "सुन रहे हैं...",
  resultLiveTitle: "हमें आपकी जानकारी मिल गई",
  resultLiveDesc:
    "बातचीत के आधार पर, आवेदन पूरा करने के अगले कदम हम आपको ईमेल करेंगे।",
  resultDemoTitle: "$7,200/वर्ष",
  resultDemoDesc:
    "आपकी बातचीत के आधार पर आप पूर्ण SNAP लाभ के पात्र हैं। हमने आपका आवेदन तैयार कर दिया है।",
  emailPlaceholder: "अपना ईमेल दर्ज करें",
  btnEmailLink: "जमा करने का लिंक मुझे ईमेल करें",
  startOver: "फिर से शुरू करें",
  footerCopy: "30M अमेरिकियों को $30B दिलाने में मदद।",
  progressAriaLabel: "पात्रता की प्रगति",
} as const;

/** Hmong (RPA - Romanized Popular Alphabet) */
const TRANSLATIONS_HMN = {
  heroBadge: "Pab 30M Asmesliskas sawv daws $30B",
  heroTitle1: "Tsis txhob sib ntaus daim fom.",
  heroTitle2: "Sib hais nkaus xwb kom koj SNAP npaj.",
  heroSubtitle:
    "Tsis muaj daim fom 20 nplooj. Tsis muaj lus lag luam. Ib cov lus sib tham hauv koj lus xwb.",
  demoModeHint:
    "Demo. Ntxiv NEXT_PUBLIC_VAPI_PUBLIC_KEY thiab NEXT_PUBLIC_VAPI_ASSISTANT_ID rau my-app/.env.local thiab tawm server dua.",
  btnStartCheckLive: "Pib koj 2 feeb xyuas",
  btnStartCheckDemo: "Xyuas kuv txoj kev tsim nyog hauv 2 feeb",
  endCall: "Kaw tus cu",
  listening: "Nyeem...",
  resultLiveTitle: "Peb muaj koj cov ntaub ntawv",
  resultLiveDesc:
    "Raws li peb sib tham, peb yuav xa email rau koj cov kauj ruam mus rau koj daim ntawv thov.",
  resultDemoTitle: "$7,200/xyoo",
  resultDemoDesc:
    "Raws li koj sib tham, koj tsim nyog rau SNAP. Peb tau npaj koj daim ntawv thov.",
  emailPlaceholder: "Sau koj email",
  btnEmailLink: "Xa link rau kuv email",
  startOver: "Pib dua",
  footerCopy: "Pab 30M Asmesliskas sawv daws $30B.",
  progressAriaLabel: "Kev tsim nyog",
} as const;

/** Somali */
const TRANSLATIONS_SO = {
  heroBadge: "Caawinta 30M Maraykanka inay helaan $30B",
  heroTitle1: "Jooji dagaalanka foomarka.",
  heroTitle2: "Hadal oo diyaar u noqo SNAP-kaaga.",
  heroSubtitle:
    "Ma jiraan foomar 20 bog. Erayada sharciga adag ma jiraan. Waa wada hadal luqaddaada oo kaliya.",
  demoModeHint:
    "Demo. Ku dar NEXT_PUBLIC_VAPI_PUBLIC_KEY iyo NEXT_PUBLIC_VAPI_ASSISTANT_ID my-app/.env.local oo dib u bilow serverka.",
  btnStartCheckLive: "Bilow baadhitaanka 2 daqiiqo",
  btnStartCheckDemo: "Baadh u qalantaada 2 daqiiqo",
  endCall: "Xir wada hadalka",
  listening: "Ma dhegaysanayaa...",
  resultLiveTitle: "Waxaan haynaa macluumaadkaaga",
  resultLiveDesc:
    "Ku salaysan wada hadalkeena, waxaan kuu soo diri doonaa iimaylka talaabooyinka soo socda ee aad ku dhamaystirto codsigaaga.",
  resultDemoTitle: "$7,200/sano",
  resultDemoDesc:
    "Ku salaysan hadalkaaga, waxaad u qalantay faa'iidooyinka SNAP buuxa. Waxaan diyaar u saarnay codsigaaga.",
  emailPlaceholder: "Geli iimaylkaaga",
  btnEmailLink: "I soo dir linkga iimaylka",
  startOver: "Bilow mar kale",
  footerCopy: "Caawinta 30M Maraykanka inay helaan $30B.",
  progressAriaLabel: "Horumarinta u qalanta",
} as const;

export const TRANSLATIONS: Record<string, TranslationSet> = {
  en: TRANSLATIONS_EN,
  es: TRANSLATIONS_ES,
  hi: TRANSLATIONS_HI,
  hmn: TRANSLATIONS_HMN,
  so: TRANSLATIONS_SO,
  ar: TRANSLATIONS_EN,
  vi: TRANSLATIONS_EN,
};

/** Get translations for a locale; falls back to English for missing keys or locale. */
export function getTranslations(code: string): TranslationSet {
  return TRANSLATIONS[code] ?? TRANSLATIONS_EN;
}

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

interface LanguageContextValue {
  language: (typeof LANGUAGES)[number];
  setLanguage: (lang: (typeof LANGUAGES)[number]) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  defaultLanguage = LANGUAGES[0],
}: {
  children: React.ReactNode;
  defaultLanguage?: (typeof LANGUAGES)[number];
}) {
  const [language, setLanguageState] = useState(defaultLanguage);
  const setLanguage = useCallback((lang: (typeof LANGUAGES)[number]) => {
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
