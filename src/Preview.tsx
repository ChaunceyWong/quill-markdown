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
    render(source, docPath).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [source, docPath]);

  return (
    <div className="preview-host">
      <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
