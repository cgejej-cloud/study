function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMarkdown(md: string): string {
  const escaped = escapeHtml(md);

  const lines = escaped.split("\n");
  const result: string[] = [];
  let inUl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^### /.test(line)) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      result.push(`<h3 style="font-size:1rem;font-weight:700;margin:1em 0 .25em">${applyInline(line.slice(4))}</h3>`);
    } else if (/^## /.test(line)) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      result.push(`<h2 style="font-size:1.15rem;font-weight:800;margin:1.25em 0 .25em">${applyInline(line.slice(3))}</h2>`);
    } else if (/^# /.test(line)) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      result.push(`<h1 style="font-size:1.35rem;font-weight:800;margin:1.5em 0 .25em">${applyInline(line.slice(2))}</h1>`);
    } else if (/^- /.test(line)) {
      if (!inUl) { result.push("<ul style=\"padding-left:1.5em;margin:.5em 0\">"); inUl = true; }
      result.push(`<li>${applyInline(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      if (inUl) { result.push("</ul>"); inUl = false; }
      result.push("");
    } else {
      if (inUl) { result.push("</ul>"); inUl = false; }
      result.push(applyInline(line));
    }
  }

  if (inUl) result.push("</ul>");

  const joined = result.join("\n");
  const paragraphed = joined
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-3]|ul|li|ol)/.test(trimmed)) return trimmed;
      return `<p style="margin:.5em 0">${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return paragraphed;
}

function isSafeUrl(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  // 허용: 절대 http(s), 프로토콜 없는 상대 경로(/, ./, #, mailto:), 그 외(javascript:, data:, vbscript: 등) 차단
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return true;
  return false;
}

function applyInline(str: string): string {
  return str
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code style=\"background:rgba(0,0,0,0.08);padding:0 4px;border-radius:3px;font-size:.9em\">$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_m, label: string, href: string) => {
      if (!isSafeUrl(href)) return label;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:var(--jade-600);text-decoration:underline">${label}</a>`;
    });
}
