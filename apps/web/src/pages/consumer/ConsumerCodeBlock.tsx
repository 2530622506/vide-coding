import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import "highlight.js/styles/github-dark.css";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

if (!hljs.getLanguage("cpp")) {
  hljs.registerLanguage("cpp", cpp);
}

export function ConsumerCodeBlock({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const highlightedCode = useMemo(() => {
    return hljs.highlight(code, {
      language: "cpp",
      ignoreIllegals: true
    }).value;
  }, [code]);

  async function handleCopy() {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="consumerCodeBlock">
      <header>
        <span>{filename}</span>
        <button aria-label={copied ? "代码已复制" : "复制代码"} className={copied ? "copied" : ""} onClick={handleCopy} type="button">
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "已复制" : "复制"}
        </button>
      </header>
      <pre>
        <code className="hljs language-cpp" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </section>
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
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("Copy command failed");
  }
}
