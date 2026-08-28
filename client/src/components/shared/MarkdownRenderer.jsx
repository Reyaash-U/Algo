import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

// ALL note/sheet markdown must render through this component. Never dangerously
// SetInnerHTML raw markdown anywhere else — this is the one sanctioned path.
//
// react-markdown already avoids raw HTML injection by default (it doesn't
// render arbitrary <script> etc.), but we still run DOMPurify as
// defense-in-depth on any component that intentionally allows raw HTML nodes.
export function MarkdownRenderer({ content }) {
  const safe = DOMPurify.sanitize(content ?? '', { USE_PROFILES: { html: false } });
  const rootRef = useRef(null);

  useEffect(() => {
    if (rootRef.current) {
      Prism.highlightAllUnder(rootRef.current);
    }
  }, [safe]);

  return (
    <div className="av-markdown" ref={rootRef}>
      <ReactMarkdown>{safe}</ReactMarkdown>
    </div>
  );
}
