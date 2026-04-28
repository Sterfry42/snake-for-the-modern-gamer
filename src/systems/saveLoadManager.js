// src/systems/saveLoadManager.js
export class SaveLoadManager {
  constructor() {
    this.saveFileName = 'snake-game-save.json';
  }

  /**
   * Save the current game state to localStorage
   * @param {Object} gameState - The complete game state to save
   */
  saveGame(gameState) {
    try {
      const serializedState = JSON.stringify(gameState);
      localStorage.setItem(this.saveFileName, serializedState);
      return { success: true, message: 'Game saved successfully' };
    } catch (error) {
      console.error('Failed to save game:', error);
      return { success: false, message: 'Failed to save game' };
    }
  }

  /**
   * Load the game state from localStorage
   * @returns {Object|null} The loaded game state or null if no save exists
   */
  loadGame() {
    try {
      const serializedState = localStorage.getItem(this.saveFileName);
      if (!serializedState) {
        return null;
      }
      const gameState = JSON.parse(serializedState);
      return gameState;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  /**
   * Check if a save exists
   * @returns {boolean} True if a save exists, false otherwise
   */
  hasSave() {
    return localStorage.getItem(this.saveFileName) !== null;
  }

  /**
   * Delete the saved game
   * @returns {boolean} True if deletion was successful
   */
  deleteSave() {
    try {
      localStorage.removeItem(this.saveFileName);
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }
}