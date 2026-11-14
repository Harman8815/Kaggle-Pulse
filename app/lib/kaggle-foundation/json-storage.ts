import fs from "fs/promises";
import path from "path";
import type {
	DataFreshness,
	ActivityObservation,
	KaggleActivityRecord,
	KaggleUserProfile,
	RawKaggleResponse,
	Snapshot,
} from "./schemas";
import { KaggleRepository } from "./repository";

const DATA_DIR = path.join(process.cwd(), "data", "kaggle-foundation");

const FILES = {
	raw: "raw-responses.json",
	profiles: "user-profiles.json",
	activities: "activities.json",
	snapshots: "snapshots.json",
	freshness: "freshness.json",
	observations: "activity-observations.json",
} as const;

async function ensureDir(): Promise<void> {
	await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
	try {
		const text = await fs.readFile(path.join(DATA_DIR, file), "utf8");
		return JSON.parse(text) as T;
	} catch {
		return fallback;
	}
}

async function writeJsonFile<T>(file: string, data: T): Promise<void> {
	await ensureDir();
	await fs.writeFile(
		path.join(DATA_DIR, file),
		JSON.stringify(data, null, 2),
		"utf8"
	);
}

const nowIso = (): string => new Date().toISOString();

export class JsonKaggleRepository implements KaggleRepository {
	async saveRawResponse(response: RawKaggleResponse): Promise<void> {
		const items = (await readJsonFile<RawKaggleResponse[]>(
			FILES.raw,
			[]
		)) as RawKaggleResponse[];
		items.push(response);
		await writeJsonFile(FILES.raw, items);
	}

	async getRawResponses(
		username: string,
		endpoint?: string
	): Promise<RawKaggleResponse[]> {
		const items = (await readJsonFile<RawKaggleResponse[]>(
			FILES.raw,
			[]
		)) as RawKaggleResponse[];
		return items.filter(
			(item) =>
				item.username === username &&
				(!endpoint || item.endpoint === endpoint)
		);
	}

	async saveUserProfile(profile: KaggleUserProfile): Promise<void> {
		const items = (await readJsonFile<KaggleUserProfile[]>(
			FILES.profiles,
			[]
		)) as KaggleUserProfile[];
		const index = items.findIndex((p) => p.username === profile.username);
		if (index === -1) items.push(profile);
		else items[index] = { ...items[index], ...profile };
		await writeJsonFile(FILES.profiles, items);
	}

	async getUserProfile(
		username: string
	): Promise<KaggleUserProfile | null> {
		const items = (await readJsonFile<KaggleUserProfile[]>(
			FILES.profiles,
			[]
		)) as KaggleUserProfile[];
		return items.find((p) => p.username === username) ?? null;
	}

	async getUserProfiles(): Promise<KaggleUserProfile[]> {
		return readJsonFile<KaggleUserProfile[]>(FILES.profiles, []);
	}

	async saveActivityObservations(
		observations: ActivityObservation[]
	): Promise<void> {
		const existing = await readJsonFile<ActivityObservation[]>(
			FILES.observations,
			[]
		);
		const byId = new Map(existing.map((observation) => [observation.id, observation]));
		for (const observation of observations) {
			byId.set(observation.id, observation);
		}
		const retentionCutoff = Date.now() - 730 * 24 * 60 * 60 * 1000;
		const retained = [...byId.values()].filter(
			(observation) => Date.parse(observation.observedAt) >= retentionCutoff
		);
		await writeJsonFile(FILES.observations, retained);
	}

	async getActivityObservations(
		usernames: string[]
	): Promise<ActivityObservation[]> {
		const included = new Set(usernames.map((username) => username.toLowerCase()));
		const observations = await readJsonFile<ActivityObservation[]>(
			FILES.observations,
			[]
		);
		return observations.filter((observation) =>
			included.has(observation.username.toLowerCase())
		);
	}

	async saveActivities(
		username: string,
		activities: KaggleActivityRecord[]
	): Promise<void> {
		const items = (await readJsonFile<KaggleActivityRecord[]>(
			FILES.activities,
			[]
		)) as KaggleActivityRecord[];
		const existing = items.filter((a) => a.username !== username);
		const tagged = activities.map((a) => ({ ...a, username }));
		await writeJsonFile(FILES.activities, [...existing, ...tagged]);
	}

	async getActivities(
		username: string
	): Promise<KaggleActivityRecord[]> {
		const items = (await readJsonFile<KaggleActivityRecord[]>(
			FILES.activities,
			[]
		)) as KaggleActivityRecord[];
		return items.filter((a) => a.username === username);
	}

	async saveSnapshot(snapshot: Snapshot): Promise<void> {
		const items = (await readJsonFile<Snapshot[]>(
			FILES.snapshots,
			[]
		)) as Snapshot[];
		const index = items.findIndex((s) => s.id === snapshot.id);
		if (index === -1) items.push(snapshot);
		else items[index] = snapshot;
		await writeJsonFile(FILES.snapshots, items);
	}

	async getSnapshotForDay(
		username: string,
		day: string
	): Promise<Snapshot | null> {
		const items = (await readJsonFile<Snapshot[]>(
			FILES.snapshots,
			[]
		)) as Snapshot[];
		return (
			items.find((s) => s.username === username && s.day === day) ??
			null
		);
	}

	async getSnapshots(username: string): Promise<Snapshot[]> {
		const items = (await readJsonFile<Snapshot[]>(
			FILES.snapshots,
			[]
		)) as Snapshot[];
		return items.filter((s) => s.username === username);
	}

	async saveFreshness(freshness: DataFreshness): Promise<void> {
		const items = (await readJsonFile<DataFreshness[]>(
			FILES.freshness,
			[]
		)) as DataFreshness[];
		const index = items.findIndex((f) => f.username === freshness.username);
		if (index === -1) items.push(freshness);
		else items[index] = freshness;
		await writeJsonFile(FILES.freshness, items);
	}

	async getFreshness(username: string): Promise<DataFreshness | null> {
		const items = (await readJsonFile<DataFreshness[]>(
			FILES.freshness,
			[]
		)) as DataFreshness[];
		return items.find((f) => f.username === username) ?? null;
	}
}

export { nowIso };
