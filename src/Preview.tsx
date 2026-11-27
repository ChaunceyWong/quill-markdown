import { useEffect, useState } from 'react';
import { render } from './render';

interface Props {
  source: string;
  docPath: string | null;
}

export function Preview({ source, docPath }: Props) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Debounce so fast typing does not trigger a full markdown render — and a
    // disk read for every image — on each keystroke.
    const timer = window.setTimeout(() => {
      render(source, docPath).then((result) => {
        if (!cancelled) setHtml(result);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, docPath]);

  return (
    <div className="preview-host">
      <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
