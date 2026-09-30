import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { SEO_CONFIG, getCanonicalUrl } from "../utils/seo/seoConfig";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[] | readonly string[];
  image?: string;
  type?: string;
  noindex?: boolean;
  nofollow?: boolean;
  canonicalUrl?: string;
  structuredData?: object | object[];
}

/** Find-or-create a meta tag and set its content. */
function setMeta(
  attr: "name" | "property",
  value: string,
  content: string
): void {
  let el = document.querySelector(
    `meta[${attr}="${value}"]`
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * useSEO - manages page-level meta tags and JSON-LD structured data.
 *
 * Design:
 * - Meta tags (description, og:*, twitter:*, robots, canonical) are written
 *   on every render; index.html supplies the static fallback values.
 * - JSON-LD <script> elements are tracked per-instance via ref so each page
 *   only removes its own scripts on unmount - no cross-page contamination.
 * - Static infrastructure tags (viewport, theme-color, preconnect) live only
 *   in index.html and are never touched here.
 */
export const useSEO = ({
  title,
  description = SEO_CONFIG.defaultDescription,
  keywords = SEO_CONFIG.defaultKeywords,
  image,
  type = "website",
  noindex = false,
  nofollow = false,
  canonicalUrl,
  structuredData,
}: SEOProps = {}) => {
  const location = useLocation();
  /** Tracks JSON-LD scripts created by THIS hook instance. */
  const ldScriptsRef = useRef<HTMLScriptElement[]>([]);

  useEffect(() => {
    // ── Title ─────────────────────────────────────────────────────────
    const fullTitle = title
      ? SEO_CONFIG.titleTemplate.replace("%s", title)
      : SEO_CONFIG.defaultTitle;
    document.title = fullTitle;

    const pageUrl = canonicalUrl || getCanonicalUrl(location.pathname);
    const ogImage = image
      ? image
      : `${SEO_CONFIG.siteUrl}${SEO_CONFIG.openGraph.images.default}`;

    const robotsContent = [
      noindex ? "noindex" : "index",
      nofollow ? "nofollow" : "follow",
      "max-snippet:-1",
      "max-image-preview:large",
      "max-video-preview:-1",
    ].join(", ");

    // ── Basic meta ────────────────────────────────────────────────────
    setMeta("name", "description", description);
    setMeta("name", "keywords", (keywords as string[]).join(", "));
    setMeta("name", "robots", robotsContent);
    setMeta("name", "googlebot", robotsContent);

    // ── Open Graph ────────────────────────────────────────────────────
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", fullTitle);

    // ── Twitter ───────────────────────────────────────────────────────
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    // ── Canonical link ────────────────────────────────────────────────
    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pageUrl);

    // ── JSON-LD structured data ───────────────────────────────────────
    // Remove this instance's previous scripts (re-run on dep change).
    ldScriptsRef.current.forEach((s) => s.remove());
    ldScriptsRef.current = [];

    if (structuredData) {
      const dataArray = Array.isArray(structuredData)
        ? structuredData
        : [structuredData];
      ldScriptsRef.current = dataArray.map((data) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify(data);
        document.head.appendChild(script);
        return script;
      });
    }

    return () => {
      // On unmount: remove remaining scripts for this instance.
      ldScriptsRef.current.forEach((s) => s.remove());
      ldScriptsRef.current = [];
    };
  }, [
    title,
    description,
    keywords,
    image,
    type,
    noindex,
    nofollow,
    canonicalUrl,
    location.pathname,
    structuredData,
  ]);

  return {
    updateTitle: (newTitle: string) => {
      document.title = SEO_CONFIG.titleTemplate.replace("%s", newTitle);
    },
  };
};

/**
 * Lightweight hook for adding JSON-LD without touching other meta tags.
 * Scripts are removed when the component unmounts.
 */
export const useStructuredData = (data: object | object[]) => {
  useEffect(() => {
    const dataArray = Array.isArray(data) ? data : [data];
    const scripts: HTMLScriptElement[] = [];

    dataArray.forEach((item) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(item);
      document.head.appendChild(script);
      scripts.push(script);
    });

    return () => {
      scripts.forEach((script) => script.remove());
    };
  }, [data]);
};
