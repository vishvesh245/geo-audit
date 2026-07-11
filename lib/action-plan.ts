// URL builders for the /report/[id] action cards. Kept as pure functions so
// they can be used both server-side (email templates) and client-side (action UI).

export function redditHomeUrl(subreddit: string): string {
  const clean = subreddit.replace(/^\/?r\//i, "").trim();
  return `https://www.reddit.com/r/${clean}`;
}

export function redditSubmitUrl(subreddit: string): string {
  const clean = subreddit.replace(/^\/?r\//i, "").trim();
  return `https://www.reddit.com/r/${clean}/submit`;
}

export function wikipediaSearchUrl(articleTitle: string): string {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(articleTitle)}`;
}

export function wikipediaSandboxUrl(): string {
  return "https://en.wikipedia.org/wiki/Wikipedia:Sandbox";
}

export function googleScholarUrl(query: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function docsNewUrl(): string {
  return "https://docs.new";
}

export function notionNewUrl(): string {
  return "https://notion.new";
}
