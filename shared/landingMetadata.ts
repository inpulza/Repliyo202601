export type LandingLanguage = "en" | "es";

export const LANDING_METADATA = {
  en: {
    title: "Repliyo - Smart social media inbox",
    description:
      "Unify Instagram, TikTok and Facebook DMs and comments. Automate replies with AI, manage contacts in the built-in CRM and never miss a follow-up.",
    canonicalUrl: "https://repliyo.com/",
    openGraphLocale: "en_US",
    openGraphLocaleAlternate: "es_ES",
    imageAlt:
      "Repliyo - Respond in seconds. Sell more with AI. Instagram, TikTok, Facebook, YouTube, LinkedIn, Google Business.",
  },
  es: {
    title: "Repliyo - Inbox inteligente para redes sociales",
    description:
      "Unifica DMs y comentarios de Instagram, TikTok y Facebook. Automatiza respuestas con IA, gestiona contactos en el CRM integrado y no pierdas ningún seguimiento.",
    canonicalUrl: "https://repliyo.com/?lang=es",
    openGraphLocale: "es_ES",
    openGraphLocaleAlternate: "en_US",
    imageAlt:
      "Repliyo - Responde en segundos. Vende más con IA. Instagram, TikTok, Facebook, YouTube, LinkedIn y Google Business.",
  },
} as const satisfies Record<
  LandingLanguage,
  {
    title: string;
    description: string;
    canonicalUrl: string;
    openGraphLocale: string;
    openGraphLocaleAlternate: string;
    imageAlt: string;
  }
>;

export const LANDING_STRUCTURED_DESCRIPTIONS = {
  en: "Smart social media inbox that unifies Instagram, TikTok and Facebook DMs and comments with AI-powered replies, an integrated CRM and intelligent follow-ups.",
  es: "Inbox inteligente para redes sociales que unifica DMs y comentarios de Instagram, TikTok y Facebook con respuestas mediante IA, CRM integrado y seguimientos inteligentes.",
} as const satisfies Record<LandingLanguage, string>;
