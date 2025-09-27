// AI Generated - replace

import Phaser from "phaser";
import { callFeatureHooks, registerBuiltInFeatures } from "../systems/features.js";
import { getAvailableQuests, type Quest } from "../../quests.js";
import { registerBuiltInQuests } from "../systems/quests.js";
import { getRoom, type Room } from "../systems/world.js";

export default class SnakeScene extends Phaser.Scene {
graphics!: Phaser.GameObjects.Graphics;
  grid = { cols: 32, rows: 24, cell: 24 };
  snake: Phaser.Math.Vector2[] = [];
  dir = new Phaser.Math.Vector2(1, 0);
  nextDir = new Phaser.Math.Vector2(1, 0);
  score = 0;
  paused = true;
  isDirty = true;
  teleport = false; // We are no longer wrapping, so this is false.
  currentRoomId = "0,0,0";
  activeQuests: Quest[] = [];
  completedQuests: string[] = [];
  questText!: Phaser.GameObjects.Text;
  scoreText!: Phaser.GameObjects.Text;
  questPopupContainer!: Phaser.GameObjects.Container;
  offeredQuest: Quest | null = null;
  flags: Record<string, unknown> = {};

  constructor(){ super("SnakeScene"); }

  async create(){
    this.graphics = this.add.graphics();
    this.input.keyboard!.on("keydown", (e: KeyboardEvent)=>{
      const k = e.key.toLowerCase();
      if (k === " ") {
        // Don't allow unpausing via spacebar if a quest pop-up is active
        if (this.offeredQuest) return;
        this.paused = !this.paused;
      }
      if (["arrowup","w"].includes(k)) this.setDir(0,-1);
      if (["arrowdown","s"].includes(k)) this.setDir(0, 1);
      if (["arrowleft","a"].includes(k)) this.setDir(-1,0);
      if (["arrowright","d"].includes(k)) this.setDir(1, 0);
    });

    // Create all game objects before any async operations
    this.questText = this.add.text(0, 0, '', { fontFamily: "monospace", fontSize: "14px", color: "#e6e6e6", align: 'right', lineSpacing: 4 }).setOrigin(1, 0);
    this.createQuestPopup();

    // Ensure the main graphics are at the bottom. Other UI elements will render on top by default or with their own depth settings.
    this.graphics.setDepth(0);

    // Now perform async setup
    await registerBuiltInFeatures(this);
    registerBuiltInQuests();
    callFeatureHooks("onRegister", this);

    // Initialize game state and trigger the first draw
    this.initGame();
    this.time.addEvent({ loop: true, delay: 100, callback: ()=>{ if(!this.paused) this.step(); }});

    // Setup camera
    this.cameras.main.setBounds(0, 0, this.grid.cols * this.grid.cell, this.grid.rows * this.grid.cell);
  }

  initGame(){
    this.snake = [new Phaser.Math.Vector2(5,12), new Phaser.Math.Vector2(4,12), new Phaser.Math.Vector2(3,12)];
    this.dir.set(1,0); this.nextDir.set(1,0);
    this.score = 0;
    this.flags = {};
    this.currentRoomId = "0,0,0";
    this.activeQuests = [];
    this.completedQuests = [];
    this.assignNewQuests(3);
    this.ensureAppleInCurrentRoom();
    this.isDirty = true;
  }
  setDir(x:number,y:number){
    if (x + this.dir.x === 0 && y + this.dir.y === 0) return;
    this.nextDir.set(x,y);
  }
  spawnApple(){
    const room = getRoom(this.currentRoomId, this.grid); // Ensure current room is generated
    const validSpawns: Phaser.Math.Vector2[] = [];
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        if (room.layout[y][x] === '.') {
          validSpawns.push(new Phaser.Math.Vector2(x, y));
        }
      }
    }

    const rand = () => new Phaser.Math.Vector2(
      validSpawns[Math.floor(Math.random() * validSpawns.length)]
    );
    let applePos;
    do { applePos = rand(); }
    while (this.snake.some(s=>s.equals(applePos)));
    room.apple = applePos;
  }
  ensureAppleInCurrentRoom() {
    const room = getRoom(this.currentRoomId, this.grid);
    if (!room.apple) {
      this.spawnApple();
    }
  }
  gameOver(reason?:string){
    this.initGame();
    callFeatureHooks("onGameOver", this);
    this.paused = true;
    this.isDirty = true;
    console.log("Game over:", reason);
  }

  step(){
    this.dir.copy(this.nextDir);
    const head = this.snake[0].clone().add(this.dir);

    const [roomX, roomY, roomZ = 0] = this.currentRoomId.split(',').map(Number);
    let roomTransition = false;

    // World boundary transitions
    if (head.x < 0) { // Go West
      this.currentRoomId = `${roomX - 1},${roomY},${roomZ}`;
      head.x = this.grid.cols - 1;
      roomTransition = true;
    } else if (head.x >= this.grid.cols) { // Go East
      this.currentRoomId = `${roomX + 1},${roomY},${roomZ}`;
      head.x = 0;
      roomTransition = true;
    } else if (head.y < 0) { // Go North
      this.currentRoomId = `${roomX},${roomY - 1},${roomZ}`;
      head.y = this.grid.rows - 1;
      roomTransition = true;
    } else if (head.y >= this.grid.rows) { // Go South
      this.currentRoomId = `${roomX},${roomY + 1},${roomZ}`;
      head.y = 0;
      roomTransition = true;
    }

    const room = getRoom(this.currentRoomId, this.grid);

    // Check for portal (ladder) collision
    const portal = room.portals.find(p => p.x === head.x && p.y === head.y);
    if (portal) {
      this.currentRoomId = portal.destRoomId;
      // Keep the snake's body when using a ladder
      this.snake.unshift(head);
      this.snake.pop(); // Move as normal
      // No return, continue to wall/self collision check
      roomTransition = true;
    }

    if (roomTransition) {
      this.ensureAppleInCurrentRoom();
    }

    // Re-fetch room in case we transitioned
    const currentRoom = getRoom(this.currentRoomId, this.grid);

    // Check for wall collision
    const tile = currentRoom.layout[head.y]?.[head.x];
    if (tile === '#') return this.gameOver("wall");

    // Check for self collision
    if (this.snake.some(s=>s.equals(head))) return this.gameOver("self");

    this.snake.unshift(head);
    if (currentRoom.apple && head.equals(currentRoom.apple)) {
      callFeatureHooks("onAppleEaten", this); this.spawnApple();
    }
    else this.snake.pop();

    callFeatureHooks("onTick", this);
    this.maybeOfferQuest();
    this.checkQuests();
    this.isDirty = true;
  }

  checkQuests() {
    const justCompleted: Quest[] = [];
    this.activeQuests = this.activeQuests.filter(quest => {
      if (!this.completedQuests.includes(quest.id) && quest.isCompleted(this)) {
        justCompleted.push(quest);
        this.completedQuests.push(quest.id);
        return false; // remove from active list
      }
      return true;
    });

    if (justCompleted.length > 0) {
      for (const quest of justCompleted) {
        quest.onReward?.(this);
        console.log(`Quest completed: ${quest.label}`);
      }
      this.assignNewQuests(justCompleted.length);
      this.isDirty = true;
    }
  }

  assignNewQuests(count: number) {
    const available = getAvailableQuests(this.completedQuests.concat(this.activeQuests.map(q => q.id)));
    for (let i = 0; i < count && available.length > 0; i++) {
      const questIndex = Math.floor(Math.random() * available.length);
      this.activeQuests.push(available.splice(questIndex, 1)[0]);
    }
    this.isDirty = true;
  }

  maybeOfferQuest() {
    // Don't offer a quest if one is already offered, game is paused, or we have max quests
    if (this.offeredQuest || this.paused || this.activeQuests.length >= 5) {
      return;
    }

    if (Math.random() < 0.002) { // 0.2% chance per tick
      const available = getAvailableQuests(
        this.completedQuests.concat(this.activeQuests.map(q => q.id))
      );
      if (available.length > 0) {
        const quest = available[Math.floor(Math.random() * available.length)];
        this.offerQuest(quest);
      }
    }
  }

  offerQuest(quest: Quest) {
    this.paused = true;
    this.offeredQuest = quest;

    // Update text elements
    (this.questPopupContainer.getByName('title') as Phaser.GameObjects.Text).setText('New Quest!');
    (this.questPopupContainer.getByName('description') as Phaser.GameObjects.Text).setText(quest.description);

    this.questPopupContainer.setVisible(true);
  }

  createQuestPopup() {
    const width = 400;
    const height = 150;
    const x = (this.grid.cols * this.grid.cell - width) / 2;
    const y = (this.grid.rows * this.grid.cell - height) / 2;

    const bg = this.add.graphics().fillStyle(0x122030, 0.9).fillRect(0, 0, width, height).lineStyle(2, 0x9ad1ff).strokeRect(0, 0, width, height);
    const title = this.add.text(width / 2, 20, '', { fontFamily: 'monospace', fontSize: '20px', color: '#9ad1ff' }).setOrigin(0.5);
    const description = this.add.text(width / 2, 60, '', { fontFamily: 'monospace', fontSize: '16px', color: '#e6e6e6' }).setOrigin(0.5);
    const acceptBtn = this.add.text(width / 2 - 70, height - 30, 'Accept', { fontFamily: 'monospace', fontSize: '18px', color: '#5dd6a2', backgroundColor: '#224433', padding: { left: 10, right: 10, top: 5, bottom: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const rejectBtn = this.add.text(width / 2 + 70, height - 30, 'Reject', { fontFamily: 'monospace', fontSize: '18px', color: '#ff6b6b', backgroundColor: '#442222', padding: { left: 10, right: 10, top: 5, bottom: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    title.setName('title');
    description.setName('description');

    acceptBtn.on('pointerdown', () => {
      if (this.offeredQuest) {
        this.activeQuests.push(this.offeredQuest);
      }
      this.closeQuestPopup();
    });

    rejectBtn.on('pointerdown', () => {
      this.closeQuestPopup();
    });

    this.questPopupContainer = this.add.container(x, y, [bg, title, description, acceptBtn, rejectBtn]).setDepth(20).setVisible(false);
  }

  closeQuestPopup() {
    this.questPopupContainer.setVisible(false);
    this.offeredQuest = null;
    this.paused = false;
    this.isDirty = true;
  }

  addScore(n:number){ 
    this.score += n;
    this.isDirty = true;
  }

  update() {
    if (this.isDirty)
    {
      this.draw();
      this.isDirty = false;
    }
  }

  draw() {
    this.graphics.clear();
    this.graphics.clearMask();

    const room = getRoom(this.currentRoomId, this.grid);

    // Draw the current room layout
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        const tile = room.layout[y][x];
        if (tile === '#') { // Wall
          this.graphics.fillStyle(0x122030, 1);
          this.graphics.fillRect(x * this.grid.cell, y * this.grid.cell, this.grid.cell, this.grid.cell);
        } else if (tile === 'H') { // Ladder
          this.graphics.fillStyle(0x8B4513, 1); // Brown for ladder
          this.graphics.fillRect(x * this.grid.cell, y * this.grid.cell, this.grid.cell, this.grid.cell);
        } else { // Floor
          this.graphics.fillStyle(room.backgroundColor, 1); // Use the room's background color
          this.graphics.fillRect(x * this.grid.cell, y * this.grid.cell, this.grid.cell, this.grid.cell);
        }
      }
    }
    this.graphics.strokePath();

    // draw apple for the current room
    const apple = room.apple;
    if (apple) {
      this.graphics.fillStyle(0xff6b6b, 1);
      this.graphics.fillRect(
        apple.x * this.grid.cell,
        apple.y * this.grid.cell,
        this.grid.cell,
        this.grid.cell
      );
    }

    // draw snake
    this.snake.forEach((s, i) => {
      // Determine the correct drawing position for each segment, even if it's "out of bounds"
      const drawPos = s.clone();
      const [currentRoomX, currentRoomY] = this.currentRoomId.split(',').map(Number);
      const segmentRoomX = Math.floor(s.x / this.grid.cols);
      const segmentRoomY = Math.floor(s.y / this.grid.rows);

      // This segment is in a different room, so don't draw it.
      if (segmentRoomX !== currentRoomX || segmentRoomY !== currentRoomY) {
        return;
      }

      this.graphics.fillStyle(0x5dd6a2, Math.max(0.5, 1 - i * 0.015));
      this.graphics.fillRect(
        drawPos.x * this.grid.cell,
        drawPos.y * this.grid.cell,
        this.grid.cell,
        this.grid.cell
      );
    });

    // draw quests
    const questDisplay = this.activeQuests.map(q => `[ ] ${q.description}`).join('\n');
    this.questText.setText(`Quests:\n${questDisplay}`);
    this.questText.setPosition(this.grid.cols * this.grid.cell - 10, 8);
    this.questText.setDepth(10);

    callFeatureHooks("onRender", this, this.graphics);
  }
}