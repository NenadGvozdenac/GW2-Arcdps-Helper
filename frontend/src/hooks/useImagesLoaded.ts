import { useEffect, useState } from "react";

/** One load per URL for the whole app; resolves on error too, so a broken image never blocks the page. */
const loading = new Map<string, Promise<void>>();
const loaded = new Set<string>();

function preloadImage(url: string): Promise<void> {
  let promise = loading.get(url);
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded.add(url);
        resolve();
      };
      img.src = url;
    });
    loading.set(url, promise);
  }
  return promise;
}

/** Starts loading images now (e.g. icons of a tab that isn't open yet) so they are cached when they're shown. */
export function preloadImages(urls: readonly string[]): Promise<void> {
  return Promise.all(urls.map(preloadImage)).then(() => undefined);
}

/** True once every image has loaded (or failed); already-loaded images are ready right away, without a flash. */
export function useImagesLoaded(urls: readonly string[]): boolean {
  const key = urls.join("|");
  const allLoaded = urls.every((u) => loaded.has(u));
  const [readyKey, setReadyKey] = useState<string | null>(null);
  useEffect(() => {
    if (allLoaded) return;
    let cancelled = false;
    preloadImages(urls).then(() => !cancelled && setReadyKey(key));
    return () => {
      cancelled = true;
    };
    // `key` stands for `urls`.
  }, [key]);
  return allLoaded || readyKey === key;
}
