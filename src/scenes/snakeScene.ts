// AI Generated - replace

import Phaser from "phaser";
import { callFeatureHooks, registerBuiltInFeatures } from "../systems/features";

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
  flags: Record<string, unknown> = {};

  constructor(){ super("SnakeScene"); }

  create(){
    this.graphics = this.add.graphics();
    this.input.keyboard!.on("keydown", (e: KeyboardEvent)=>{
      const k = e.key.toLowerCase();
      if (k === " ") this.paused = !this.paused;
      if (["arrowup","w"].includes(k)) this.setDir(0,-1);
      if (["arrowdown","s"].includes(k)) this.setDir(0, 1);
      if (["arrowleft","a"].includes(k)) this.setDir(-1,0);
      if (["arrowright","d"].includes(k)) this.setDir(1, 0);
    });

    this.initGame();
    registerBuiltInFeatures(this);
    callFeatureHooks("onRegister", this);

    this.time.addEvent({ loop: true, delay: 100, callback: ()=>{ if(!this.paused) this.step(); }});
  }

  initGame(){
    this.snake = [new Phaser.Math.Vector2(5,12), new Phaser.Math.Vector2(4,12), new Phaser.Math.Vector2(3,12)];
    this.dir.set(1,0); this.nextDir.set(1,0);
    this.score = 0; this.flags = {};
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
    this.initGame(); this.paused = true;
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

    callFeatureHooks("onRender", this, this.graphics);
  }
}