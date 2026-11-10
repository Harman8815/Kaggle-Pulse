
import { NextRequest, NextResponse } from "next/server";

const KAGGLE_API = "https://www.kaggle.com/api/v1";
const KAGGLE_PAGE_SIZE = 100;

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
  const key = process.env.KAGGLE_KEY;

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  }

  if (!username || !key) {
    throw new Error(
      "Kaggle credentials are missing; set KAGGLE_API_TOKEN or both KAGGLE_USERNAME and KAGGLE_KEY"
    );
  }

  return {
    Authorization: `Basic ${Buffer.from(
      `${username}:${key}`
    ).toString("base64")}`,
    Accept: "application/json",
  };
}

async function fetchKaggle(endpoint: string) {
  const response = await fetch(`${KAGGLE_API}/${endpoint}`, {
    headers: getCredentials(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new KaggleApiError(response.status);
  }

  return response.json();
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const [notebooks, datasets] = await Promise.all([
      fetchKaggle(
        `kernels/list?user=${encodeURIComponent(username)}&pageSize=${KAGGLE_PAGE_SIZE}`
      ),
      fetchKaggle(
        `datasets/list?user=${encodeURIComponent(username)}&pageSize=${KAGGLE_PAGE_SIZE}`
      ),
    ]);

    const activities = [
      ...normalizeActivities(notebooks, "Notebook"),
      ...normalizeActivities(datasets, "Dataset"),
    ];

    const stats = {
      total: activities.length,
      notebooks: activities.filter(a => a.type === "Notebook").length,
      datasets: activities.filter(a => a.type === "Dataset").length,
      models: 0,
      competitions: 0,
      discussions: 0,
    };

    return NextResponse.json({
      username,
      profileUrl: `https://www.kaggle.com/${username}`,
      activities,
      stats,
    });

  } catch (error) {
    console.error("Kaggle API error:", error);

    if (error instanceof KaggleApiError && error.status === 401) {
      return NextResponse.json(
        {
          error:
            "Kaggle rejected the configured credentials. Set KAGGLE_API_TOKEN to a current API token from your Kaggle account's API settings, or verify your legacy KAGGLE_USERNAME and KAGGLE_KEY values, then restart the server.",
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
