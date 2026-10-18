import type { SaveLoadBackend } from '../ui/saveLoadMenu.js';
import type { SceneGameClient } from './SceneGameClient.js';

/** Supplies the normal save browser with durable server records; loading remains a command. */
export class RemoteCheckpointBrowser implements SaveLoadBackend {
  constructor(private readonly client: SceneGameClient) {}
  async listSessions() {
    const persistence = this.client.getSnapshot().persistence;
    const data = persistence?.checkpoint;
    return data && persistence
      ? [
          {
            sessionId: persistence.slotId,
            createdAt: data.timestamp,
            lastSavedAt: data.timestamp,
            saveCount: 1,
            seed: data.worldGeneration?.seed,
          },
        ]
      : [];
  }
  async listSessionSaves(sessionId: string) {
    const persistence = this.client.getSnapshot().persistence;
    return persistence?.slotId === sessionId && persistence.checkpoint
      ? [{ timestamp: persistence.checkpoint.timestamp, data: persistence.checkpoint }]
      : [];
  }
  async deleteSession(sessionId: string) {
    if (sessionId !== this.client.getSnapshot().persistence?.slotId) return;
    const result = await this.client.send({
      type: 'clearSave',
      playerId: this.client.getLocalPlayerId(),
    });
    if (!result.ok) throw new Error(result.reason ?? 'Could not delete checkpoint');
  }
  async deleteSave(sessionId: string, timestamp: number) {
    if (this.client.getSnapshot().persistence?.checkpoint?.timestamp === timestamp)
      await this.deleteSession(sessionId);
  }
  async deleteSessions(ids: string[]) {
    for (const id of ids) await this.deleteSession(id);
  }
  async deleteSaves(sessionId: string, timestamps: number[]) {
    for (const timestamp of timestamps) await this.deleteSave(sessionId, timestamp);
  }
}
