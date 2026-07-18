import { useEffect } from "react";

import { useLanguage } from "../../context/LanguageContext";
import { LANDING_METADATA } from "@shared/landingMetadata";

function setMetaContent(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export function LandingMetadataSync() {
  const { language } = useLanguage();

  useEffect(() => {
    const metadata = LANDING_METADATA[language];
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    document.title = metadata.title;
    canonical?.setAttribute("href", metadata.canonicalUrl);
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

    const url = new URL(window.location.href);
    if (language === "es") {
      url.searchParams.set("lang", "es");
    } else {
      url.searchParams.delete("lang");
    }

    const nextLocation = `${url.pathname}${url.search}${url.hash}`;
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextLocation !== currentLocation) {
      window.history.replaceState(window.history.state, "", nextLocation);
    }
  }, [language]);

  return null;
}
