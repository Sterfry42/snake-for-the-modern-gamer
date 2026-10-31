import { Quest, crossedRoomFastEnough } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

const MIN_DISTANCE = 26;
const MAX_TRAVEL_MS = 1500;

class RoomDasherQuest extends Quest {
  constructor() {
    super('room-dasher', 'Room Dasher', 'Cross a room in under 1.5s');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (
      this.progressSinceAccept(runtime, 'roomsVisited') >= 1 &&
      crossedRoomFastEnough(runtime, MIN_DISTANCE, MAX_TRAVEL_MS)
    );
  }

  protected override baselineKeys(): readonly string[] {
    return ['roomsVisited'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(35);
  }
}

export default new RoomDasherQuest();
