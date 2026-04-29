const allowedLanguages = ["typescript", "javascript", "css", "json", "markdown"] as const;

export type AllowedLanguage = (typeof allowedLanguages)[number];

export function inferLanguageFromFileName(fileName: string): AllowedLanguage {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".mts") ||
    lower.endsWith(".cts")
  )
    return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
    return "javascript";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return "markdown";
  return "typescript";
}

export function joinPath(dir: string, name: string): string {
  if (!dir) return name;
  return `${dir}/${name}`;
}
