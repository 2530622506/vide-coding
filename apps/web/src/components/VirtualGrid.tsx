import type { CSSProperties, Key, ReactNode, UIEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type VirtualGridProps<T> = {
  className?: string;
  empty?: ReactNode;
  gap?: number;
  getKey: (item: T) => Key;
  itemHeight?: number;
  items: T[];
  maxHeight?: number;
  minItemWidth?: number;
  overscanRows?: number;
  renderItem: (item: T) => ReactNode;
  selectedKey?: Key | null;
  threshold?: number;
};

const DEFAULT_GAP = 10;
const DEFAULT_ITEM_HEIGHT = 178;
const DEFAULT_MAX_HEIGHT = 640;
const DEFAULT_MIN_ITEM_WIDTH = 184;
const DEFAULT_OVERSCAN_ROWS = 8;
const DEFAULT_THRESHOLD = 36;

// 固定高度虚拟网格，适合题卡这类高度可控的卡片列表。
// 这里不依赖第三方虚拟列表库，避免额外依赖和卡片网格布局适配成本。
export function VirtualGrid<T>({
  className,
  empty = null,
  gap = DEFAULT_GAP,
  getKey,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  items,
  maxHeight = DEFAULT_MAX_HEIGHT,
  minItemWidth = DEFAULT_MIN_ITEM_WIDTH,
  overscanRows = DEFAULT_OVERSCAN_ROWS,
  renderItem,
  selectedKey = null,
  threshold = DEFAULT_THRESHOLD
}: VirtualGridProps<T>) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const latestScrollTopRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  // 数据源切换后重置滚动位置。只取首尾 key 和长度，避免大列表每次渲染都拼完整 key 列表。
  const itemSignature = useMemo(() => {
    if (!items.length) {
      return "empty";
    }
    return `${items.length}:${String(getKey(items[0]))}:${String(getKey(items[items.length - 1]))}`;
  }, [getKey, items]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => setViewportWidth(element.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    element.scrollTop = 0;
    latestScrollTopRef.current = 0;
    setScrollTop(0);
  }, [itemSignature]);

  // 容器宽度决定列数，卡片最小宽度和 gap 要与 CSS 网格保持一致。
  const columns = Math.max(1, Math.floor(((viewportWidth || minItemWidth) + gap) / (minItemWidth + gap)));

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || items.length <= threshold || selectedKey === null) {
      return;
    }

    const selectedIndex = items.findIndex((item) => getKey(item) === selectedKey);
    if (selectedIndex < 0) {
      return;
    }

    const selectedRowTop = Math.floor(selectedIndex / columns) * itemHeight;
    const selectedRowBottom = selectedRowTop + itemHeight;
    const visibleTop = element.scrollTop;
    const visibleBottom = visibleTop + element.clientHeight;
    if (selectedRowTop >= visibleTop && selectedRowBottom <= visibleBottom) {
      return;
    }

    // 从详情页/IDE 返回时，虚拟列表里目标卡片可能还没渲染，先滚到所在行再让高亮出现。
    element.scrollTop = selectedRowTop;
    latestScrollTopRef.current = selectedRowTop;
    setScrollTop(selectedRowTop);
  }, [columns, getKey, itemHeight, items, selectedKey, threshold]);

  const styleVars = {
    "--virtual-grid-gap": `${gap}px`,
    // 虚拟行高包含行间距，卡片本体高度需要扣掉 gap，避免下一行被遮挡。
    "--virtual-grid-item-height": `${itemHeight - gap}px`,
    "--virtual-grid-min": `${minItemWidth}px`
  } as CSSProperties;

  if (!items.length) {
    return <>{empty}</>;
  }

  if (items.length <= threshold) {
    return (
      <div className={["virtualGridPlain", className].filter(Boolean).join(" ")} style={styleVars}>
        {items.map((item) => (
          <div className="virtualGridItem" key={getKey(item)}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    );
  }

  const rowCount = Math.ceil(items.length / columns);
  const viewportHeight = Math.min(rowCount * itemHeight, maxHeight);
  const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanRows);
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscanRows);
  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length, endRow * columns);
  const visibleItems = items.slice(startIndex, endIndex);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    latestScrollTopRef.current = event.currentTarget.scrollTop;
    if (animationFrameRef.current !== null) {
      return;
    }
    // 滚动事件非常密集，使用 requestAnimationFrame 合并更新，减少快速滑动时的卡顿和白屏。
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setScrollTop(latestScrollTopRef.current);
    });
  }

  return (
    <div
      className={["virtualGridViewport", className].filter(Boolean).join(" ")}
      onScroll={handleScroll}
      ref={viewportRef}
      style={{ ...styleVars, height: viewportHeight }}
    >
      <div className="virtualGridInner" style={{ height: rowCount * itemHeight }}>
        <div
          className="virtualGridWindow"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            transform: `translate3d(0, ${startRow * itemHeight}px, 0)`
          }}
        >
          {visibleItems.map((item) => (
            <div className="virtualGridItem" key={getKey(item)}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
