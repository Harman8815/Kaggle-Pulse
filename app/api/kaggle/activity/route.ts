import { NextRequest, NextResponse } from "next/server";

const KAGGLE_API = "https://www.kaggle.com/api/v1";
const KAGGLE_PAGE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

class KaggleApiError extends Error {
  constructor(readonly status: number) {
    super(`Kaggle API returned ${status}`);
    this.name = "KaggleApiError";
  }
}

interface KaggleItem {
  ref?: string;
  title?: string;
  description?: string;
  lastRunTime?: string;
  lastUpdated?: string;
  totalVotes?: number;
  totalViews?: number;
  downloadCount?: number;
  language?: string;
  [key: string]: unknown;
}

function getCredentials() {
  const token = process.env.KAGGLE_API_TOKEN;
  const username = process.env.KAGGLE_USERNAME;

  if (!token) {
    throw new Error(
      "KAGGLE_API_TOKEN is missing; set it to a current API token from your Kaggle account's API settings"
    );
  }

  if (!username) {
    throw new Error(
      "KAGGLE_USERNAME is missing; set it to your Kaggle username"
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

async function fetchKaggle(endpoint: string, cacheKey: string) {
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetch(`${KAGGLE_API}/${endpoint}`, {
    headers: getCredentials(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new KaggleApiError(response.status);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: now });
  return data;
}

function normalizeActivities(
  items: KaggleItem[],
  type: "Notebook" | "Dataset"
) {
  return items.map((item) => {
    const ref = item.ref ?? "";

    return {
      id: `${type}-${ref}`,
      type,
      title: item.title ?? "Untitled",
      date:
        type === "Notebook"
          ? item.lastRunTime ?? null
          : item.lastUpdated ?? null,
      url: ref
        ? type === "Notebook"
          ? `https://www.kaggle.com/code/${ref}`
          : `https://www.kaggle.com/datasets/${ref}`
        : "",
      description: item.description ?? "",
      votes: item.totalVotes ?? 0,
      views: item.totalViews,
      downloads: item.downloadCount,
      language: item.language,
      metadata: item,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || process.env.KAGGLE_USERNAME!;

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const cacheKey = `kaggle-${username}`;

    const [notebooks, datasets] = await Promise.all([
      fetchKaggle(
        `kernels/list?user=${encodeURIComponent(username)}&pageSize=${KAGGLE_PAGE_SIZE}`,
        `${cacheKey}-notebooks`
      ),
      fetchKaggle(
        `datasets/list?user=${encodeURIComponent(username)}&pageSize=${KAGGLE_PAGE_SIZE}`,
        `${cacheKey}-datasets`
      ),
    ]);

    const activities = [
      ...normalizeActivities(notebooks, "Notebook"),
      ...normalizeActivities(datasets, "Dataset"),
    ];

    const stats = {
      total: activities.length,
      notebooks: activities.filter((a) => a.type === "Notebook").length,
      datasets: activities.filter((a) => a.type === "Dataset").length,
      models: 0,
      competitions: 0,
      discussions: 0,
    };

    return NextResponse.json({
      username,
      profileUrl: `https://www.kaggle.com/${username}`,
      activities,
      stats,
      cached: false,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Kaggle API error:", error);

    if (error instanceof KaggleApiError && error.status === 401) {
      return NextResponse.json(
        {
          error:
            "Kaggle rejected the configured credentials. Set KAGGLE_API_TOKEN to a current API token from your Kaggle account's API settings, then restart the server.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to fetch Kaggle data",
      },
      { status: 500 }
    );
  }
}