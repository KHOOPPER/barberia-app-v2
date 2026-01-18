import { useEffect } from "react";

const DEFAULT_TITLE = "Khoopper BarberShop | Barbería premium, cortes y barba";
const DEFAULT_DESCRIPTION = "Khoopper BarberShop es una barbería premium especializada en cortes modernos, fades, corte de cabello para hombre y definición de barba en un ambiente exclusivo.";
const DEFAULT_KEYWORDS = "barbería premium, corte de cabello para hombre, corte + barba, fades modernos, diseño de cejas, barberos profesionales, agenda tu cita";

export default function usePageSEO({
  title,
  description,
  keywords,
  path,
} = {}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousTitle = document.title;
    document.title = title || DEFAULT_TITLE;

    const setMeta = (name, content) => {
      if (!content) return;
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("description", description || DEFAULT_DESCRIPTION);
    setMeta("keywords", keywords || DEFAULT_KEYWORDS);

    if (path && typeof window !== "undefined") {
      const base = window.location.origin;
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", `${base}${path}`);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
    };
  }, [title, description, keywords, path]);
}
