export type Portal = {
  x: number;
  y: number;
  destRoomId: string;
  destX: number;
  destY: number;
};

export type Room = {
  id: string;
  layout: string[]; // Grid of characters: '#' for wall, '.' for floor, 'H' for ladder
  portals: Portal[];
  apple?: Phaser.Math.Vector2;
  backgroundColor: number;
};

export type World = {
  [key: string]: Room;
};

const world: World = {};

function generateRoom(roomId: string, grid: {cols: number, rows: number}): Room {
  const layout = Array(grid.rows).fill(0).map(() => Array(grid.cols).fill('.'));
  const portals: Portal[] = [];

  const backgroundColors = [0x0b0f14, 0x140b0b, 0x0b140b, 0x0b0b14, 0x14140b, 0x140b14];
  const backgroundColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];

  // Randomly add a few bigger obstacles
  const numObstacles = Math.floor(Math.random() * 4) + 2; // 2 to 5 obstacles

  for (let i = 0; i < numObstacles; i++) {
    const obstacleWidth = Math.floor(Math.random() * 6) + 3; // width from 3 to 8
    const obstacleHeight = Math.floor(Math.random() * 4) + 2; // height from 2 to 5
    
    // Ensure obstacles are not placed at the very edge of the room
    const x = Math.floor(Math.random() * (grid.cols - obstacleWidth - 4)) + 2;
    const y = Math.floor(Math.random() * (grid.rows - obstacleHeight - 4)) + 2;

    for (let row = y; row < y + obstacleHeight; row++) {
      for (let col = x; col < x + obstacleWidth; col++) {
        layout[row][col] = '#';
      }
    }
  }

  // Randomly add a ladder
  if (Math.random() < 0.3) {
    let ladderX, ladderY;
    do {
        ladderX = Math.floor(Math.random() * (grid.cols - 4)) + 2;
        ladderY = Math.floor(Math.random() * (grid.rows - 4)) + 2;
    } while (layout[ladderY][ladderX] === '#'); // Ensure ladder is not inside an obstacle
    layout[ladderY][ladderX] = 'H';
    
    const [roomX, roomY, roomZ = 0] = roomId.split(',').map(Number);
    const destZ = roomZ + (Math.random() < 0.5 ? 1 : -1);
    portals.push({
      x: ladderX,
      y: ladderY,
      destRoomId: `${roomX},${roomY},${destZ}`,
      destX: ladderX,
      destY: ladderY,
    });
  }

  return {
    id: roomId,
    layout: layout.map(row => row.join('')),
    portals,
    backgroundColor,
  };
}

export function getRoom(roomId: string, grid: {cols: number, rows: number}): Room {
  if (!world[roomId]) {
    console.log(`Generating new room: ${roomId}`);
    world[roomId] = generateRoom(roomId, grid);
  }
  return world[roomId];
}

export function clearWorld() {
  // Using a for...in loop with delete is a robust way to clear a module-level object
  for (const key in world) {
    delete world[key];
  }
  console.log("World cache cleared.");
}