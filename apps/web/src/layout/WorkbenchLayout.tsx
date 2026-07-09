import { Layout, Menu, Space, Typography } from "antd"
import type { MenuProps } from "antd"
import {
  BookOpenCheck,
  Boxes,
  Code2,
  Database,
  FileSearch,
  Layers3,
  LayoutDashboard,
  ShieldCheck,
  Trophy,
} from "lucide-react"
import type { ReactNode } from "react"
import type { Navigate } from "../navigation"

const { Content, Sider } = Layout

type Props = {
  children: ReactNode
  routePath: string
  onNavigate: Navigate
}

const menuItems: MenuProps["items"] = [
  {
    key: "gesp",
    label: "GESP 练习",
    type: "group",
    children: [
      { key: "/", icon: <LayoutDashboard size={17} />, label: "练习工作台" },
      { key: "/gesp/selection", icon: <Boxes size={17} />, label: "选择题" },
      {
        key: "/gesp/judgment",
        icon: <BookOpenCheck size={17} />,
        label: "判断题",
      },
      { key: "/coverage", icon: <ShieldCheck size={17} />, label: "知识覆盖" },
      { key: "/sources", icon: <FileSearch size={17} />, label: "来源证据" },
      { key: "/maintenance", icon: <Database size={17} />, label: "题目维护" },
    ],
  },
  {
    key: "atcoder",
    label: "AtCoder 算法题库",
    type: "group",
    children: [
      { key: "/atcoder", icon: <Trophy size={17} />, label: "题库列表" },
      {
        key: "/atcoder/maintenance",
        icon: <Code2 size={17} />,
        label: "题库维护",
      },
    ],
  },
]

// 测试
export function WorkbenchLayout({ children, routePath, onNavigate }: Props) {
  const selectedKey = resolveSelectedKey(routePath)

  return (
    <Layout className="workbenchShell">
      <Sider className="workbenchSider" width={248}>
        <div className="brandBlock">
          <div className="brandMark">
            <Layers3 size={22} />
          </div>
          <div>
            <Typography.Text className="brandEyebrow">
              Practice Lab
            </Typography.Text>
            <Typography.Title level={1}>算法练习工作台</Typography.Title>
          </div>
        </div>
        <Menu
          className="workbenchMenu"
          items={menuItems}
          mode="inline"
          onClick={event => onNavigate(event.key)}
          selectedKeys={[selectedKey]}
        />
        <div className="siderFootnote">
          <Space direction="vertical" size={4}>
            <Typography.Text strong>
              <BookOpenCheck size={15} /> B 端练习查看
            </Typography.Text>
            <Typography.Text type="secondary">
              统一题库、证据、维护和 IDE 链路。
            </Typography.Text>
          </Space>
        </div>
      </Sider>
      <Layout className="workbenchMain">
        <Content>{children}</Content>
      </Layout>
    </Layout>
  )
}

function resolveSelectedKey(routePath: string) {
  if (routePath.startsWith("/atcoder/maintenance")) {
    return "/atcoder/maintenance"
  }
  if (routePath.startsWith("/atcoder")) {
    return "/atcoder"
  }
  if (routePath.startsWith("/coverage")) {
    return "/coverage"
  }
  if (routePath.startsWith("/gesp/selection")) {
    return "/gesp/selection"
  }
  if (routePath.startsWith("/gesp/judgment")) {
    return "/gesp/judgment"
  }
  if (routePath.startsWith("/sources")) {
    return "/sources"
  }
  if (routePath.startsWith("/maintenance")) {
    return "/maintenance"
  }
  return "/"
}
