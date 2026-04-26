import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

const MIN_DISTANCE = 24;
const MAX_TRAVEL_MS = 1800;

class RoomSprintQuest extends Quest {
  constructor() {
    super("room-sprint", "Room Sprint", "Cross a room in under 1.8s");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const distance = Number(runtime.getFlag<number>("roomTravelDistance") ?? 0);
    const travelMs = Number(runtime.getFlag<number>("roomTravelMs") ?? Number.POSITIVE_INFINITY);
    return this.progressSinceAccept(runtime, "roomsVisited") >= 1 && distance >= MIN_DISTANCE && travelMs <= MAX_TRAVEL_MS;
  }

  protected override baselineKeys(): readonly string[] {
    return ["roomsVisited"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(30);
  }
}

export default new RoomSprintQuest();
