import { defaultTipsCollection } from "./content";
import type { Tip, TipsCollection } from "./types";

const STORE_KEY = "heidi_ignored_tips";
const CACHE_KEY = "heidi_live_tips_collection";
const CACHE_FETCHED_AT_KEY = "heidi_live_tips_collection_fetched_at";
const CACHE_STALE_TIME = 1000 * 60 * 60; // 1 hour
const MAX_TIMEOUT = 5000; // 5 seconds

function getKey(collection: string) {
  return `${STORE_KEY}:${collection}`;
}

export const loadLiveTipsCollection = () => {
  // stale while revalidate - we will return the data present in the cache or the default data and fetch updated data to be put into the cache for the next time this function is called without waiting for the promise.
  const cachedData = localStorage.getItem(CACHE_KEY);
  const fetchedAt = localStorage.getItem(CACHE_FETCHED_AT_KEY);

  // Read from local storage if the cachedData is less than CACHE_STALE_TIME milliseconds old
  if (cachedData && fetchedAt && Date.now() - Number.parseInt(fetchedAt) < CACHE_STALE_TIME) {
    return JSON.parse(cachedData);
  }

  const abortController = new AbortController();

  // Abort the request after MAX_TIMEOUT milliseconds to ensure we won't wait for too long, something might be wrong with the network or it could be an air-gapped instance
  const abortTimeout = setTimeout(abortController.abort, MAX_TIMEOUT);

  // Fetch from github raw liveContent.json proxied through the server
  fetch("/heidi-tips", {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (response.ok) {
        const data = await response.json();

        // Cache the fetched content
        localStorage.setItem(CACHE_FETCHED_AT_KEY, String(Date.now()));
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    })
    .catch((e) => {
      console.warn("Failed to load live Heidi tips collection", e);
    })
    .finally(() => {
      // Wait until the content is fetched to clear the abort timeout
      // The abort should consider the entire request not just the headers
      clearTimeout(abortTimeout);
    });

  // Serve possibly stale cached content
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Default local content
  return defaultTipsCollection;
};

export function getRandomTip(collection: keyof TipsCollection): Tip | null {
  const tipsCollection = loadLiveTipsCollection();

  if (isTipDismissed(collection)) return null;

  if (!tipsCollection[collection]) return null;

  const tips = tipsCollection[collection];

  const index = Math.floor(Math.random() * tips.length);

  return tips[index];
}

/**
 * Set a cookie that indicates that a collection of tips is dismissed
 * for 30 days
 */
export function dismissTip(collection: string) {
  // will expire in 30 days
  const cookieExpiryTime = 1000 * 60 * 60 * 24 * 30;
  const cookieExpiryDate = new Date();

  cookieExpiryDate.setTime(cookieExpiryDate.getTime() + cookieExpiryTime);

  const finalKey = getKey(collection);
  const cookieValue = `${finalKey}=true`;
  const cookieExpiry = `expires=${cookieExpiryDate.toUTCString()}`;
  const cookiePath = "path=/";
  const cookieString = [cookieValue, cookieExpiry, cookiePath].join("; ");

  document.cookie = cookieString;
}

export function isTipDismissed(collection: string) {
  const cookies = Object.fromEntries(document.cookie.split(";").map((item) => item.trim().split("=")));
  const finalKey = getKey(collection);

  return cookies[finalKey] === "true";
}

export function createURL(url: string, params?: Record<string, string>): string {
  const base = new URL(url);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    base.searchParams.set(key, value);
  });

  const userID = APP_SETTINGS.user?.id;
  const serverID = APP_SETTINGS.server_id;

  if (serverID) base.searchParams.set("server_id", serverID);
  if (userID) base.searchParams.set("user_id", userID);

  return base.toString();
}
