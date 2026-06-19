import { Table } from "antd";
import type { TableProps } from "antd";

type VirtualDataTableProps<RecordType extends object> = Omit<TableProps<RecordType>, "pagination" | "scroll" | "virtual"> & {
  height?: number;
  xScroll?: number;
};

// 统一表格型页面的虚拟滚动入口：取消分页，交给 AntD Table 的 virtual + scroll.y 只渲染可视行。
export function VirtualDataTable<RecordType extends object>({
  className,
  height = 620,
  size = "middle",
  xScroll = 960,
  ...tableProps
}: VirtualDataTableProps<RecordType>) {
  return (
    <Table<RecordType>
      {...tableProps}
      className={["virtualDataTable", className].filter(Boolean).join(" ")}
      pagination={false}
      scroll={{ x: xScroll, y: height }}
      size={size}
      virtual
    />
  );
}
