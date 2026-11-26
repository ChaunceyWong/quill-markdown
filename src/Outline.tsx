import type { OutlineItem } from './outlineParser';

interface Props {
  items: OutlineItem[];
  onJump: (item: OutlineItem) => void;
}

export function OutlinePanel({ items, onJump }: Props) {
  return (
    <aside className="outline-panel">
      <div className="outline-title">大纲</div>
      <div className="outline-list">
        {items.length === 0 ? (
          <div className="outline-empty">使用 # 标题生成大纲</div>
        ) : items.map((item, i) => (
          <button
            key={`${item.slug}-${i}`}
            className={`outline-item level-${item.level}`}
            style={{ paddingLeft: 10 + (item.level - 1) * 12 }}
            onClick={() => onJump(item)}
            title={item.text}
          >
            {item.text}
          </button>
        ))}
      </div>
    </aside>
  );
}
