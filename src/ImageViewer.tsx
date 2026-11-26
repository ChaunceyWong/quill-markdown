import { useEffect, useState } from 'react';
import { resolveAsset } from './api';

interface Props {
  path: string;
}

export function ImageViewer({ path }: Props) {
  const [src, setSrc] = useState('');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    resolveAsset(path).then((data) => { if (!cancelled) setSrc(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  return (
    <div className="image-viewer">
      <div className="image-toolbar">
        <span>{path.split('/').pop()}</span>
        <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>＋</button>
        <button onClick={() => setZoom(1)}>适应</button>
      </div>
      <div className="image-canvas">
        {src ? <img src={src} alt={path} style={{ transform: `scale(${zoom})` }} /> : <div className="image-loading">加载中…</div>}
      </div>
    </div>
  );
}
