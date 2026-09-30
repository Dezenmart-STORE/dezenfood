import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { HiExclamationTriangle } from "react-icons/hi2";
import { useGetCurrentTermsQuery } from "../store/api";
import type { LegalDocType } from "../utils/types";
import { extractHeadings } from "../utils/markdown";
import { useSEO } from "../hooks/useSEO";
import Container from "../components/common/Container";
import LoadingSpinner from "../components/common/LoadingSpinner";
import MarkdownContent from "../components/common/MarkdownContent";
import TableOfContents from "../components/common/TableOfContents";

// Static SEO/meta per document. Adding a new legal type = add a route + an
// entry here; everything else (fetch, render, format) is driven by `type`.
const META: Record<LegalDocType, { title: string; description: string }> = {
  terms_of_use: {
    title: "Terms of Service",
    description: "The terms governing your use of the DezenFoods platform.",
  },
  privacy_policy: {
    title: "Privacy Policy",
    description: "How DezenFoods collects, uses, and protects your personal information.",
  },
  cookie_policy: {
    title: "Cookie Policy",
    description: "How DezenFoods uses cookies and similar technologies.",
  },
};

interface Props {
  type: LegalDocType;
}

const Legal: React.FC<Props> = ({ type }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError, refetch, isFetching } = useGetCurrentTermsQuery(type);
  const meta = META[type];

  useSEO({
    title: data?.title ?? meta.title,
    description: meta.description,
  });

  const headings = useMemo(
    () => (data?.content ? extractHeadings(data.content) : []),
    [data?.content]
  );

  // Return to wherever we came from. Settings opens legal pages with a
  // returnTo flag so Back lands on the Settings view, not the account overview.
  const handleBack = () => {
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
    if (returnTo === "settings") navigate("/account?view=settings");
    else navigate(-1);
  };

  return (
    <div className="bg-Dark min-h-screen text-white">
      <Container className="max-w-5xl">
        <div className="py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors"
            aria-label="Go back"
          >
            <LiaAngleLeftSolid className="w-5 h-5" />
            Back
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <LoadingSpinner />
          </div>
        ) : isError || !data ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mt-6 text-center">
            <HiExclamationTriangle className="w-8 h-8 mx-auto text-red-400 mb-3" />
            <p className="text-sm text-gray-300 mb-4">
              We couldn't load the {meta.title.toLowerCase()} right now.
            </p>
            <button
              onClick={() => refetch()}
              className="text-red-400 hover:text-red-300 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="lg:flex lg:gap-10 pb-10">
            <aside className="lg:w-60 lg:flex-shrink-0 lg:order-2">
              <TableOfContents headings={headings} />
            </aside>
            <article className={`min-w-0 flex-1 max-w-3xl ${isFetching ? "opacity-70" : ""}`}>
              <MarkdownContent content={data.content} />
            </article>
          </div>
        )}
      </Container>
    </div>
  );
};

export default Legal;
