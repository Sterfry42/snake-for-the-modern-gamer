export interface MasonryBlock {
  roomId: string;
  localX: number;
  localY: number;
  createdAt: number;
}

/** FIFO deadlines avoid scanning every placed block on every render frame. */
export class MasonryExpiry {
  private readonly blocks = new Map<string, MasonryBlock>();
  private deadlines: MasonryBlock[] = [];
  private head = 0;

  private key(roomId: string, x: number, y: number): string {
    return `${roomId}:${x},${y}`;
  }

  register(roomId: string, localX: number, localY: number, createdAt: number): void {
    const block = { roomId, localX, localY, createdAt };
    this.blocks.set(this.key(roomId, localX, localY), block);
    this.deadlines.push(block);
  }

  remove(roomId: string, x: number, y: number): void {
    this.blocks.delete(this.key(roomId, x, y));
  }

  age(roomId: string, x: number, y: number, now: number): number | undefined {
    const block = this.blocks.get(this.key(roomId, x, y));
    if (!block || now - block.createdAt >= 4000) return undefined;
    return now - block.createdAt;
  }

  consumeExpired(now: number): MasonryBlock[] {
    const expired: MasonryBlock[] = [];
    while (this.head < this.deadlines.length) {
      const block = this.deadlines[this.head];
      const key = this.key(block.roomId, block.localX, block.localY);
      if (this.blocks.get(key) === block && now - block.createdAt < 4000) break;
      this.head++;
      if (this.blocks.get(key) !== block) continue;
      this.blocks.delete(key);
      expired.push(block);
    }
    if (this.head > 256 && this.head * 2 >= this.deadlines.length) {
      this.deadlines = this.deadlines.slice(this.head);
      this.head = 0;
    }
    return expired;
  }
}
