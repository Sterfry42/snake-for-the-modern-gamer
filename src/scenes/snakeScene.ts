// AI Generated - replace

import Phaser from "phaser";
import { callFeatureHooks, registerBuiltInFeatures } from "../systems/features.js";
import { getAvailableQuests, type Quest } from "../../quests.js";
import { registerBuiltInQuests } from "../systems/quests.js";

export default class SnakeScene extends Phaser.Scene {
graphics!: Phaser.GameObjects.Graphics;
  grid = { cols: 32, rows: 24, cell: 24 };
  snake: Phaser.Math.Vector2[] = [];
  dir = new Phaser.Math.Vector2(1, 0);
  nextDir = new Phaser.Math.Vector2(1, 0);
  apple = new Phaser.Math.Vector2(10, 10);
  score = 0;
  paused = true;
  isDirty = true;
  teleport = true; // can be toggled by features
  activeQuests: Quest[] = [];
  completedQuests: string[] = [];
  questText!: Phaser.GameObjects.Text;
  questPopupContainer!: Phaser.GameObjects.Container;
  offeredQuest: Quest | null = null;
  flags: Record<string, unknown> = {};

  constructor(){ super("SnakeScene"); }

  create(){
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

    this.initGame();
    registerBuiltInFeatures(this);
    registerBuiltInQuests();
    callFeatureHooks("onRegister", this);
    this.assignNewQuests(3);

    this.questText = this.add.text(0, 0, '', { fontFamily: "monospace", fontSize: "14px", color: "#e6e6e6", align: 'right', lineSpacing: 4 }).setOrigin(1, 0);
    this.createQuestPopup();

    this.time.addEvent({ loop: true, delay: 100, callback: ()=>{ if(!this.paused) this.step(); }});
  }

  initGame(){
    this.snake = [new Phaser.Math.Vector2(5,12), new Phaser.Math.Vector2(4,12), new Phaser.Math.Vector2(3,12)];
    this.dir.set(1,0); this.nextDir.set(1,0);
    this.score = 0;
    this.flags = {};
    this.activeQuests = [];
    this.completedQuests = [];
    this.assignNewQuests(3);
    this.spawnApple();
    this.isDirty = true;
  }
  setDir(x:number,y:number){
    if (x + this.dir.x === 0 && y + this.dir.y === 0) return;
    this.nextDir.set(x,y);
  }
  spawnApple(){
    const rand = () => new Phaser.Math.Vector2(
      Math.floor(Math.random()*this.grid.cols),
      Math.floor(Math.random()*this.grid.rows)
    );
    do { this.apple = rand(); }
    while (this.snake.some(s=>s.equals(this.apple)));
  }
  gameOver(reason?:string){
    callFeatureHooks("onGameOver", this);
    this.initGame();
    this.paused = true;
    this.isDirty = true;
    console.log("Game over:", reason);
  }

  step(){
    this.dir.copy(this.nextDir);
    const head = this.snake[0].clone().add(this.dir);

    if (this.teleport){
      head.x = (head.x + this.grid.cols) % this.grid.cols;
      head.y = (head.y + this.grid.rows) % this.grid.rows;
    } else {
      if (head.x<0 || head.y<0 || head.x>=this.grid.cols || head.y>=this.grid.rows) return this.gameOver("wall");
    }
    if (this.snake.some(s=>s.equals(head))) return this.gameOver("self");

    this.snake.unshift(head);
    if (head.equals(this.apple)){ callFeatureHooks("onAppleEaten", this); this.spawnApple(); }
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

  addScore(n:number){ this.score += n; }

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

    // draw grid
    this.graphics.lineStyle(1, 0x122030, 1);
    for (let x = 0; x <= this.grid.cols; x++) {
      this.graphics.moveTo(x * this.grid.cell, 0);
      this.graphics.lineTo(x * this.grid.cell, this.grid.rows * this.grid.cell);
    }
    for (let y = 0; y <= this.grid.rows; y++) {
      this.graphics.moveTo(0, y * this.grid.cell);
      this.graphics.lineTo(this.grid.cols * this.grid.cell, y * this.grid.cell);
    }
    this.graphics.strokePath();

    // draw apple
    this.graphics.fillStyle(0xff6b6b, 1);
    this.graphics.fillRect(
      this.apple.x * this.grid.cell,
      this.apple.y * this.grid.cell,
      this.grid.cell,
      this.grid.cell
    );

    // draw snake
    this.snake.forEach((s, i) => {
      this.graphics.fillStyle(0x5dd6a2, Math.max(0.5, 1 - i * 0.015));
      this.graphics.fillRect(
        s.x * this.grid.cell,
        s.y * this.grid.cell,
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