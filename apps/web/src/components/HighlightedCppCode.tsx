import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import "highlight.js/styles/github-dark.css";
import { App as AntApp, Button } from "antd";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

if (!hljs.getLanguage("cpp")) {
  hljs.registerLanguage("cpp", cpp);
}

export function HighlightedCppCode({ code }: { code: string }) {
  const { message } = AntApp.useApp();
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(() => {
    return hljs.highlight(code, {
      language: "cpp",
      ignoreIllegals: true
    }).value;
  }, [code]);

  async function copyCode() {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      message.success("代码已复制");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      message.error("复制失败，请手动选择代码");
    }
  }

  return (
    <div className="codeBlockFrame">
      <div className="codeToolbar">
        <Button className="actionButton actionButton--copy" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copyCode} size="small" type="text">
          {copied ? "已复制" : "复制代码"}
        </Button>
      </div>
      <pre className="codeBlock">
        <code className="hljs language-cpp" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("Copy command failed");
  }
}
