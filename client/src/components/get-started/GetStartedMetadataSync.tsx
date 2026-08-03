import { useEffect } from "react";

import { GET_STARTED_METADATA } from "@shared/landingMetadata";
import { useLanguage } from "@/context/LanguageContext";

function setMetaContent(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export function GetStartedMetadataSync() {
  const { language } = useLanguage();

  useEffect(() => {
    const metadata = GET_STARTED_METADATA[language];
    const englishMetadata = GET_STARTED_METADATA.en;
    const spanishMetadata = GET_STARTED_METADATA.es;

    document.title = metadata.title;
    document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute("href", metadata.canonicalUrl);
    document.head
      .querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="en"]')
      ?.setAttribute("href", englishMetadata.canonicalUrl);
    document.head
      .querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="es"]')
      ?.setAttribute("href", spanishMetadata.canonicalUrl);
    document.head
      .querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="x-default"]')
      ?.setAttribute("href", englishMetadata.canonicalUrl);

    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[property="og:url"]', metadata.canonicalUrl);
    setMetaContent('meta[property="og:locale"]', metadata.openGraphLocale);
    setMetaContent(
      'meta[property="og:locale:alternate"]',
      metadata.openGraphLocaleAlternate,
    );
    setMetaContent('meta[property="og:image:alt"]', metadata.imageAlt);
    setMetaContent('meta[name="twitter:title"]', metadata.title);
    setMetaContent('meta[name="twitter:description"]', metadata.description);
  }, [language]);

  return null;
}
