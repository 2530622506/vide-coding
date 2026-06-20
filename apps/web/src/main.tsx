import type { ComponentType, ReactNode } from "react";
import type { Root } from "react-dom/client";

const rootElement = document.getElementById("root") as HTMLElement;
let root: Root | null = null;

async function renderApp(app: ReactNode) {
  const [{ StrictMode, createElement }, { createRoot }] = await Promise.all([
    import("react"),
    import("react-dom/client")
  ]);
  root ||= createRoot(rootElement);
  root.render(
    createElement(StrictMode, null, app)
  );
}

function renderStartupError(error: unknown) {
  console.error("Failed to load web entry", error);
  void import("react").then(({ createElement }) => {
    void renderApp(createElement("div", { role: "alert" }, "页面加载失败，请刷新重试。"));
  });
}

async function renderComponent(Component: ComponentType) {
  const { createElement } = await import("react");
  await renderApp(createElement(Component));
}

if (detectConsumerMobileEntrypoint()) {
  import("./MobileApp")
    .then(({ default: MobileApp }) => renderComponent(MobileApp))
    .catch(renderStartupError);
} else {
  import("./App")
    .then(({ default: App }) => renderComponent(App))
    .catch(renderStartupError);
}

function detectConsumerMobileEntrypoint() {
  if (window.location.pathname.startsWith("/mobile")) {
    return true;
  }
  const coarsePointer = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
  return window.location.pathname === "/" && (window.innerWidth < 768 || coarsePointer);
}
