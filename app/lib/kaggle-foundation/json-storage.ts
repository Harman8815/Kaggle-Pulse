import fs from "fs/promises";
import path from "path";
import os from "os";
import type {
	DataFreshness,
	ActivityObservation,
	NetworkRelationship,
	KaggleActivityRecord,
	KaggleUserProfile,
	RawKaggleResponse,
	Snapshot,
} from "./schemas";
import { KaggleRepository } from "./repository";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data", "kaggle-foundation");
const DATA_DIR = process.env.KAGGLE_DATA_DIR?.trim() || DEFAULT_DATA_DIR;

const FILES = {
	raw: "raw-responses.json",
	profiles: "user-profiles.json",
	activities: "activities.json",
	snapshots: "snapshots.json",
	freshness: "freshness.json",
	observations: "activity-observations.json",
	relationships: "network-relationships.json",
} as const;

type FileKey = keyof typeof FILES;
const memoryStore = new Map<FileKey, unknown>();
let persistenceDisabled = false;

function isReadOnlyFsError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: string }).code;
	return code === "EROFS" || code === "EACCES" || code === "EPERM" || code === "ENOENT";
}

async function ensureDir(): Promise<boolean> {
	if (persistenceDisabled) return false;
	try {
		await fs.mkdir(DATA_DIR, { recursive: true });
		return true;
	} catch (error) {
		if (isReadOnlyFsError(error)) {
			persistenceDisabled = true;
			return false;
		}
		throw error;
	}
}

async function readJsonFile<T>(fileKey: FileKey, fallback: T): Promise<T> {
	if (memoryStore.has(fileKey)) {
		return memoryStore.get(fileKey) as T;
	}
	try {
		const text = await fs.readFile(path.join(DATA_DIR, FILES[fileKey]), "utf8");
		const parsed = JSON.parse(text) as T;
		memoryStore.set(fileKey, parsed);
		return parsed;
	} catch {
		return fallback;
	}
}

async function writeJsonFile<T>(fileKey: FileKey, data: T): Promise<void> {
	memoryStore.set(fileKey, data);
	const canWrite = await ensureDir();
	if (!canWrite) return;
	try {
		await fs.writeFile(
			path.join(DATA_DIR, FILES[fileKey]),
			JSON.stringify(data, null, 2),
			"utf8"
		);
	} catch (error) {
		if (isReadOnlyFsError(error)) {
			persistenceDisabled = true;
			return;
		}
		throw error;
	}
}

const nowIso = (): string => new Date().toISOString();

export class JsonKaggleRepository implements KaggleRepository {
	async saveRawResponse(response: RawKaggleResponse): Promise<void> {
		const items = await readJsonFile<RawKaggleResponse[]>("raw", []);
		items.push(response);
		await writeJsonFile("raw", items);
	}

	async getRawResponses(username: string, endpoint?: string): Promise<RawKaggleResponse[]> {
		const items = await readJsonFile<RawKaggleResponse[]>("raw", []);
		return items.filter(
			(item) => item.username === username && (!endpoint || item.endpoint === endpoint)
		);
	}

	async saveUserProfile(profile: KaggleUserProfile): Promise<void> {
		const items = await readJsonFile<KaggleUserProfile[]>("profiles", []);
		const index = items.findIndex((p) => p.username === profile.username);
		if (index === -1) items.push(profile);
		else items[index] = { ...items[index], ...profile };
		await writeJsonFile("profiles", items);
	}

	async getUserProfile(username: string): Promise<KaggleUserProfile | null> {
		const items = await readJsonFile<KaggleUserProfile[]>("profiles", []);
		return items.find((p) => p.username === username) ?? null;
	}

	async getUserProfiles(): Promise<KaggleUserProfile[]> {
		return readJsonFile<KaggleUserProfile[]>("profiles", []);
	}

	async saveActivityObservations(observations: ActivityObservation[]): Promise<void> {
		const existing = await readJsonFile<ActivityObservation[]>("observations", []);
		const byId = new Map(existing.map((observation) => [observation.id, observation]));
		for (const observation of observations) {
			byId.set(observation.id, observation);
		}
		const retentionCutoff = Date.now() - 730 * 24 * 60 * 60 * 1000;
		const retained = [...byId.values()].filter(
			(observation) => Date.parse(observation.observedAt) >= retentionCutoff
		);
		await writeJsonFile("observations", retained);
	}

	async getActivityObservations(usernames: string[]): Promise<ActivityObservation[]> {
		const included = new Set(usernames.map((username) => username.toLowerCase()));
		const observations = await readJsonFile<ActivityObservation[]>("observations", []);
		return observations.filter((observation) =>
			included.has(observation.username.toLowerCase())
		);
	}

	async saveNetworkRelationships(relationships: NetworkRelationship[]): Promise<void> {
		const existing = await readJsonFile<NetworkRelationship[]>("relationships", []);
		const byId = new Map(existing.map((relationship) => [relationship.id, relationship]));
		for (const relationship of relationships) {
			byId.set(relationship.id, relationship);
		}
		await writeJsonFile("relationships", [...byId.values()]);
	}

	async getAllNetworkRelationships(): Promise<NetworkRelationship[]> {
		return readJsonFile<NetworkRelationship[]>("relationships", []);
	}

	async saveActivities(username: string, activities: KaggleActivityRecord[]): Promise<void> {
		const items = await readJsonFile<KaggleActivityRecord[]>("activities", []);
		const existing = items.filter((a) => a.username !== username);
		const tagged = activities.map((a) => ({ ...a, username }));
		await writeJsonFile("activities", [...existing, ...tagged]);
	}

	async getActivities(username: string): Promise<KaggleActivityRecord[]> {
		const items = await readJsonFile<KaggleActivityRecord[]>("activities", []);
		return items.filter((a) => a.username === username);
	}

	async saveSnapshot(snapshot: Snapshot): Promise<void> {
		const items = await readJsonFile<Snapshot[]>("snapshots", []);
		const index = items.findIndex((s) => s.id === snapshot.id);
		if (index === -1) items.push(snapshot);
		else items[index] = snapshot;
		await writeJsonFile("snapshots", items);
	}

	async getSnapshotForDay(username: string, day: string): Promise<Snapshot | null> {
		const items = await readJsonFile<Snapshot[]>("snapshots", []);
		return items.find((s) => s.username === username && s.day === day) ?? null;
	}

	async getSnapshots(username: string): Promise<Snapshot[]> {
		const items = await readJsonFile<Snapshot[]>("snapshots", []);
		return items.filter((s) => s.username === username);
	}

	async saveFreshness(freshness: DataFreshness): Promise<void> {
		const items = await readJsonFile<DataFreshness[]>("freshness", []);
		const index = items.findIndex((f) => f.username === freshness.username);
		if (index === -1) items.push(freshness);
		else items[index] = freshness;
		await writeJsonFile("freshness", items);
	}

	async getFreshness(username: string): Promise<DataFreshness | null> {
		const items = await readJsonFile<DataFreshness[]>("freshness", []);
		return items.find((f) => f.username === username) ?? null;
	}
}

export { nowIso };
