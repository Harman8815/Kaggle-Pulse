import type {
	DataFreshness,
	KaggleActivityRecord,
	KaggleUserProfile,
	RawKaggleResponse,
	Snapshot,
} from "./schemas";

export interface KaggleRepository {
	saveRawResponse(response: RawKaggleResponse): Promise<void>;
	getRawResponses(
		username: string,
		endpoint?: string
	): Promise<RawKaggleResponse[]>;
	saveUserProfile(profile: KaggleUserProfile): Promise<void>;
	getUserProfile(username: string): Promise<KaggleUserProfile | null>;
	saveActivities(
		username: string,
		activities: KaggleActivityRecord[]
	): Promise<void>;
	getActivities(username: string): Promise<KaggleActivityRecord[]>;
	saveSnapshot(snapshot: Snapshot): Promise<void>;
	getSnapshotForDay(username: string, day: string): Promise<Snapshot | null>;
	getSnapshots(username: string): Promise<Snapshot[]>;
	saveFreshness(freshness: DataFreshness): Promise<void>;
	getFreshness(username: string): Promise<DataFreshness | null>;
}
