import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

// ALL note/sheet markdown must render through this component. Never dangerously
// SetInnerHTML raw markdown anywhere else — this is the one sanctioned path.
//
// react-markdown already avoids raw HTML injection by default (it doesn't
// render arbitrary <script> etc.), but we still run DOMPurify as
// defense-in-depth on any component that intentionally allows raw HTML nodes.
export function MarkdownRenderer({ content }) {
  const safe = DOMPurify.sanitize(content ?? '', { USE_PROFILES: { html: false } });
  return (
    <div className="av-markdown">
      <ReactMarkdown>{safe}</ReactMarkdown>
    </div>
  );
}
