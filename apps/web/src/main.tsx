import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root") as HTMLElement);

function renderApp(app: ReactNode) {
  root.render(
    <StrictMode>
      {app}
    </StrictMode>
  );
}

function renderStartupError(error: unknown) {
  console.error("Failed to load web entry", error);
  renderApp(<div role="alert">页面加载失败，请刷新重试。</div>);
}

if (detectConsumerMobileEntrypoint()) {
  import("./MobileApp")
    .then(({ default: MobileApp }) => renderApp(<MobileApp />))
    .catch(renderStartupError);
} else {
  import("./App")
    .then(({ default: App }) => renderApp(<App />))
    .catch(renderStartupError);
}

function detectConsumerMobileEntrypoint() {
  if (window.location.pathname.startsWith("/mobile")) {
    return true;
  }
  const coarsePointer = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
  return window.location.pathname === "/" && (window.innerWidth < 768 || coarsePointer);
}
