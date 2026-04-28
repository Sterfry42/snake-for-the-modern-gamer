// src/scenes/snakeScene.js
import Phaser from "phaser";
import { SaveLoadManager } from "../systems/saveLoadManager.js";

export default class SnakeScene extends Phaser.Scene {
  constructor() {
    super("SnakeScene");
    this.saveLoadManager = new SaveLoadManager();
    this.snake = null;
    this.food = null;
    this.cursors = null;
    this.score = 0;
    this.gameOver = false;
    this.snakeSpeed = 100;
    this.gridSize = 16;
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
    this.snakeBody = [];
  }

  preload() {
    // Preload any assets if needed
  }

  create() {
    // Create the game elements
    this.createGrid();
    this.createSnake();
    this.createFood();
    this.createControls();
    this.createUI();
    
    // Check for existing save game
    this.loadGame();
    
    // Update button states after loading (only if we're in a browser environment)
    if (typeof window !== 'undefined') {
      this.updateButtonStates();
    }
    
    // Start the game loop
    this.time.addEvent({
      delay: this.snakeSpeed,
      callback: this.updateGame,
      callbackScope: this,
      loop: true
    });
  }

  createGrid() {
    // Create a simple grid for the game area
    const gridSize = this.gridSize;
    const width = 768;
    const height = 576;
    
    // Create a background for the grid
    const bg = this.add.rectangle(0, 0, width, height, 0x0b0f14).setOrigin(0);
    
    // Draw grid lines
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1a2025, 0.5);
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      graphics.lineBetween(x, 0, x, height);
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  createSnake() {
    // Create initial snake at center
    const startX = Math.floor(768 / 2 / this.gridSize) * this.gridSize;
    const startY = Math.floor(576 / 2 / this.gridSize) * this.gridSize;
    
    // Create snake body segments
    this.snakeBody = [
      { x: startX, y: startY },
      { x: startX - this.gridSize, y: startY },
      { x: startX - this.gridSize * 2, y: startY }
    ];
    
    // Create visual representation of the snake
    this.snake = this.add.graphics();
    this.updateSnakeGraphics();
  }

  createFood() {
    // Create initial food
    this.food = this.add.graphics();
    this.generateFood();
  }

  createControls() {
    // Create keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Also support WASD controls
    this.input.keyboard.on('keydown', (event) => {
      switch (event.keyCode) {
        case Phaser.Input.Keyboard.KeyCodes.W:
        case Phaser.Input.Keyboard.KeyCodes.UP:
          if (this.direction !== 'DOWN') this.nextDirection = 'UP';
          break;
        case Phaser.Input.Keyboard.KeyCodes.S:
        case Phaser.Input.Keyboard.KeyCodes.DOWN:
          if (this.direction !== 'UP') this.nextDirection = 'DOWN';
          break;
        case Phaser.Input.Keyboard.KeyCodes.A:
        case Phaser.Input.Keyboard.KeyCodes.LEFT:
          if (this.direction !== 'RIGHT') this.nextDirection = 'LEFT';
          break;
        case Phaser.Input.Keyboard.KeyCodes.D:
        case Phaser.Input.Keyboard.KeyCodes.RIGHT:
          if (this.direction !== 'LEFT') this.nextDirection = 'RIGHT';
          break;
      }
    });
  }

  createUI() {
    // Create score display
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '24px',
      fill: '#ffffff'
    });
    
    // Create save/load buttons
    this.saveButton = this.add.text(600, 16, 'Save Game', {
      fontSize: '16px',
      fill: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setInteractive();
    
    this.loadButton = this.add.text(600, 48, 'Load Game', {
      fontSize: '16px',
      fill: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setInteractive();
    
    // Add event listeners to buttons
    this.saveButton.on('pointerdown', () => this.saveGame());
    this.loadButton.on('pointerdown', () => this.loadGame());
    
    // Update button states based on save existence (only if we're in a browser environment)
    if (typeof window !== 'undefined') {
      this.updateButtonStates();
    }
  }

  generateFood() {
    // Generate food at random location
    const gridWidth = 768 / this.gridSize;
    const gridHeight = 576 / this.gridSize;
    
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
      newFood = {
        x: Math.floor(Math.random() * gridWidth) * this.gridSize,
        y: Math.floor(Math.random() * gridHeight) * this.gridSize
      };
      
      // Make sure food doesn't spawn on snake
      validPosition = true;
      for (let segment of this.snakeBody) {
        if (segment.x === newFood.x && segment.y === newFood.y) {
          validPosition = false;
          break;
        }
      }
    }
    
    this.foodPosition = newFood;
    this.updateFoodGraphics();
  }

  updateSnakeGraphics() {
    this.snake.clear();
    this.snake.fillStyle(0x00ff00, 1);
    
    // Draw each segment of the snake
    for (let i = 0; i < this.snakeBody.length; i++) {
      const segment = this.snakeBody[i];
      // Make the head a different color
      if (i === 0) {
        this.snake.fillStyle(0x00ff00, 1);
      } else {
        this.snake.fillStyle(0x00aa00, 1);
      }
      this.snake.fillRect(segment.x, segment.y, this.gridSize, this.gridSize);
    }
  }

  updateFoodGraphics() {
    this.food.clear();
    this.food.fillStyle(0xff0000, 1);
    this.food.fillRect(this.foodPosition.x, this.foodPosition.y, this.gridSize, this.gridSize);
  }

  updateGame() {
    if (this.gameOver) return;
    
    // Update direction
    this.direction = this.nextDirection;
    
    // Calculate new head position
    const head = { ...this.snakeBody[0] };
    
    switch (this.direction) {
      case 'UP':
        head.y -= this.gridSize;
        break;
      case 'DOWN':
        head.y += this.gridSize;
        break;
      case 'LEFT':
        head.x -= this.gridSize;
        break;
      case 'RIGHT':
        head.x += this.gridSize;
        break;
    }
    
    // Check for collisions with walls
    if (head.x < 0 || head.x >= 768 || head.y < 0 || head.y >= 576) {
      this.gameOver = true;
      this.scene.restart();
      return;
    }
    
    // Check for collisions with self
    for (let i = 0; i < this.snakeBody.length; i++) {
      if (head.x === this.snakeBody[i].x && head.y === this.snakeBody[i].y) {
        this.gameOver = true;
        this.scene.restart();
        return;
      }
    }
    
    // Add new head
    this.snakeBody.unshift(head);
    
    // Check if food is eaten
    if (head.x === this.foodPosition.x && head.y === this.foodPosition.y) {
      // Increase score
      this.score += 10;
      this.scoreText.setText(`Score: ${this.score}`);
      
      // Generate new food
      this.generateFood();
    } else {
      // Remove tail if no food eaten
      this.snakeBody.pop();
    }
    
    // Update graphics
    this.updateSnakeGraphics();
    this.updateFoodGraphics();
  }

  saveGame() {
    const gameState = {
      score: this.score,
      snakeBody: this.snakeBody,
      direction: this.direction,
      nextDirection: this.nextDirection,
      foodPosition: this.foodPosition
    };
    
    const result = this.saveLoadManager.saveGame(gameState);
    if (result.success) {
      console.log('Game saved successfully');
      this.updateButtonStates();
    } else {
      console.error('Failed to save game');
    }
  }

  loadGame() {
    const savedState = this.saveLoadManager.loadGame();
    
    if (savedState) {
      this.score = savedState.score;
      this.snakeBody = savedState.snakeBody;
      this.direction = savedState.direction;
      this.nextDirection = savedState.nextDirection;
      this.foodPosition = savedState.foodPosition;
      
      // Update UI
      this.scoreText.setText(`Score: ${this.score}`);
      
      // Update graphics
      this.updateSnakeGraphics();
      this.updateFoodGraphics();
      
      console.log('Game loaded successfully');
      this.updateButtonStates();
    } else {
      console.log('No saved game found');
    }
  }

  update() {
    // Update the game logic
  }
  
  /**
   * Update the save/load button states based on whether a save exists
   */
  updateButtonStates() {
    const hasSave = this.saveLoadManager.hasSave();
    
    // Update save button appearance
    if (hasSave) {
      this.saveButton.setFill('#00ff00');
      this.saveButton.setText('Save Game (Saved)');
    } else {
      this.saveButton.setFill('#00ff00');
      this.saveButton.setText('Save Game');
    }
    
    // Update load button appearance
    if (hasSave) {
      this.loadButton.setFill('#00ff00');
      this.loadButton.setText('Load Game');
    } else {
      this.loadButton.setFill('#888888');
      this.loadButton.setText('Load Game (No Save)');
      this.loadButton.setInteractive(false);
    }
  }
}