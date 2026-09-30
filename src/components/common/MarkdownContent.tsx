import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/**
 * Renders trusted markdown (e.g. legal documents from the backend) with the
 * app's dark theme. Raw HTML is intentionally NOT enabled (react-markdown's
 * default), so DB-served content can't inject scripts.
 */
const components: Components = {
  h1: (props) => (
    <h1 className="text-2xl font-bold text-white mt-8 mb-4 first:mt-0" {...props} />
  ),
  h2: (props) => (
    <h2
      className="text-lg font-semibold text-white mt-8 mb-3 pb-2 border-b border-white/10 scroll-mt-24"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="text-base font-semibold text-gray-100 mt-6 mb-2 scroll-mt-24" {...props} />
  ),
  h4: (props) => (
    <h4 className="text-sm font-semibold text-gray-200 mt-4 mb-2" {...props} />
  ),
  p: (props) => <p className="text-sm leading-relaxed text-gray-300 mb-4" {...props} />,
  ul: (props) => (
    <ul
      className="list-disc pl-5 space-y-1.5 mb-4 text-sm text-gray-300 marker:text-red-500"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="list-decimal pl-5 space-y-1.5 mb-4 text-sm text-gray-300 marker:text-gray-500"
      {...props}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  a: (props) => (
    <a
      className="text-red-400 hover:text-red-300 underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold text-white" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  hr: () => <hr className="my-8 border-white/10" />,
  blockquote: (props) => (
    <blockquote
      className="border-l-2 border-red-500/50 pl-4 italic text-gray-400 my-4"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-gray-200"
      {...props}
    />
  ),
  table: (props) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm text-left border-collapse" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border border-white/10 px-3 py-2 font-semibold text-white bg-white/5"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border border-white/10 px-3 py-2 text-gray-300 align-top" {...props} />
  ),
};

interface Props {
  content: string;
  className?: string;
}

const MarkdownContent = memo(({ content, className = "" }: Props) => (
  <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  </div>
));

MarkdownContent.displayName = "MarkdownContent";

export default MarkdownContent;
