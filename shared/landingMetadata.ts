export type LandingLanguage = "en" | "es";

export type PublicPageMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  openGraphLocale: string;
  openGraphLocaleAlternate: string;
  imageAlt: string;
};

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
} as const satisfies Record<LandingLanguage, PublicPageMetadata>;

export const LANDING_STRUCTURED_DESCRIPTIONS = {
  en: "Smart social media inbox that unifies Instagram, TikTok and Facebook DMs and comments with AI-powered replies, an integrated CRM and intelligent follow-ups.",
  es: "Inbox inteligente para redes sociales que unifica DMs y comentarios de Instagram, TikTok y Facebook con respuestas mediante IA, CRM integrado y seguimientos inteligentes.",
} as const satisfies Record<LandingLanguage, string>;

export const GET_STARTED_METADATA = {
  en: {
    title: "Request access to Repliyo",
    description:
      "Tell us about your team and social media workflow. The Repliyo team will review your request and contact you within 24-48 hours.",
    canonicalUrl: "https://repliyo.com/get-started",
    openGraphLocale: "en_US",
    openGraphLocaleAlternate: "es_ES",
    imageAlt: "Request access to Repliyo's smart social media inbox.",
  },
  es: {
    title: "Solicita acceso a Repliyo",
    description:
      "Cuéntanos sobre tu equipo y cómo gestionas tus redes sociales. El equipo de Repliyo revisará tu solicitud y te contactará en 24-48 horas.",
    canonicalUrl: "https://repliyo.com/get-started?lang=es",
    openGraphLocale: "es_ES",
    openGraphLocaleAlternate: "en_US",
    imageAlt: "Solicita acceso al inbox inteligente para redes sociales de Repliyo.",
  },
} as const satisfies Record<LandingLanguage, PublicPageMetadata>;
