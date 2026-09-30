import { useEffect, useState } from "react";
import { HiChevronDown } from "react-icons/hi";
import type { Heading } from "../../utils/markdown";

interface Props {
  headings: Heading[];
}

// Smoothly scroll to a heading and reflect it in the URL hash without a jump.
const scrollToHeading = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
};

// Highlights the section currently in view.
function useActiveHeading(headings: Heading[]): string {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // Trigger while a heading sits in the upper part of the viewport.
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  return activeId;
}

const TocLinks = ({
  headings,
  activeId,
  onNavigate,
}: {
  headings: Heading[];
  activeId: string;
  onNavigate?: () => void;
}) => (
  <ul className="space-y-0.5">
    {headings.map((h) => (
      <li key={h.id}>
        <a
          href={`#${h.id}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToHeading(h.id);
            onNavigate?.();
          }}
          className={`block rounded-md px-2 py-1.5 text-xs leading-snug transition-colors ${
            activeId === h.id
              ? "bg-brand/15 text-red-400 font-medium"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {h.text}
        </a>
      </li>
    ))}
  </ul>
);

const TableOfContents: React.FC<Props> = ({ headings }) => {
  const activeId = useActiveHeading(headings);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (headings.length < 2) return null;

  return (
    <>
      {/* Mobile: collapsible "On this page" */}
      <div className="lg:hidden mb-4 bg-[#292B30] rounded-xl border border-[#3A3A3C]">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-white"
          aria-expanded={mobileOpen}
        >
          On this page
          <HiChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileOpen && (
          <div className="px-2 pb-2 max-h-72 overflow-y-auto">
            <TocLinks
              headings={headings}
              activeId={activeId}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-2 mb-2">
          On this page
        </p>
        <TocLinks headings={headings} activeId={activeId} />
      </nav>
    </>
  );
};

export default TableOfContents;
