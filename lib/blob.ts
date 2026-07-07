import { put, list, del } from "@vercel/blob";

// Add a query-string cache-buster so Vercel's public CDN treats each read
// as a distinct resource. Without this, the CDN can serve a pre-overwrite copy
// of a blob for up to the cacheControlMaxAge (default 1 month).
function bustCache(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
}

export async function putJSON(
  pathname: string,
  data: unknown
): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return { url: blob.url, pathname: blob.pathname };
}

export async function getJSON<T>(pathname: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: pathname });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (!blob) return null;
    const res = await fetch(bustCache(blob.url), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listByPrefix(
  prefix: string
): Promise<Array<{ url: string; pathname: string }>> {
  const { blobs } = await list({ prefix });
  return blobs.map((b) => ({ url: b.url, pathname: b.pathname }));
}

export async function deleteByUrl(url: string): Promise<void> {
  await del(url);
}
