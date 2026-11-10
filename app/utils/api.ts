
export type ActivityType =
  | "Notebook"
  | "Dataset"
  | "Model"
  | "Competition"
  | "Discussion";

export interface KaggleActivity {
  id: string;
  type: ActivityType;
  title: string;
  date: string | null;
  url: string;
  description?: string;
  votes?: number;
  views?: number;
  downloads?: number;
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface KaggleStats {
  total: number;
  notebooks: number;
  datasets: number;
  models: number;
  competitions: number;
  discussions: number;
}

export interface KaggleUserData {
  username: string;
  profileUrl: string;
  activities: KaggleActivity[];
  stats: KaggleStats;
}

export interface KaggleOptions {
  username?: string;
  startDate?: string;
  endDate?: string;
  types?: ActivityType[];
  limit?: number;
  sort?: "asc" | "desc";
  includeStats?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<
  Pick<KaggleOptions, "sort" | "includeStats">
> = {
  sort: "desc",
  includeStats: true,
};

const API_BASE = "/api/kaggle/activity";

const isValidDate = (value: string): boolean =>
  !Number.isNaN(Date.parse(value));

const filterActivities = (
  activities: KaggleActivity[],
  options: KaggleOptions
): KaggleActivity[] => {
  const start = options.startDate
    ? new Date(options.startDate).getTime()
    : -Infinity;

  const end = options.endDate
    ? new Date(`${options.endDate.slice(0, 10)}T23:59:59.999`)
        .getTime()
    : Infinity;

  return activities
    .filter(activity => {
      if (!activity.date) {
        return !options.startDate && !options.endDate;
      }

      const timestamp = Date.parse(activity.date);

      if (Number.isNaN(timestamp)) return false;
      if (timestamp < start || timestamp > end) return false;

      if (
        options.types?.length &&
        !options.types.includes(activity.type)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;

      const difference =
        Date.parse(a.date!) - Date.parse(b.date!);

      return options.sort === "asc" ? difference : -difference;
    })
    .slice(0, options.limit ?? Infinity);
};

const calculateStats = (
  activities: KaggleActivity[]
): KaggleStats => ({
  total: activities.length,
  notebooks: activities.filter(a => a.type === "Notebook").length,
  datasets: activities.filter(a => a.type === "Dataset").length,
  models: activities.filter(a => a.type === "Model").length,
  competitions: activities.filter(a => a.type === "Competition").length,
  discussions: activities.filter(a => a.type === "Discussion").length,
});

export const getUserData = async (
  options: KaggleOptions = {}
): Promise<KaggleUserData> => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { username, ...fetchOptions } = config;

  const url = new URL(API_BASE, window.location.origin);
  if (username) {
    url.searchParams.set("username", username);
  }

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: options.signal,
    }
  );

  if (!response.ok) {
    let message = `Kaggle request failed: ${response.status} ${response.statusText}`;

    if (response.headers.get("content-type")?.includes("application/json")) {
      const body: unknown = await response.json();

      if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    }

    throw new Error(message);
  }

  const result: KaggleUserData = await response.json();

  const activities = filterActivities(
    result.activities,
    config
  );

  return {
    ...result,
    activities,
    stats: config.includeStats
      ? calculateStats(activities)
      : result.stats,
  };
};
