export class SudokuGenerator {
  constructor(size = 25) {
    this.size = size;
    this.blockSize = Math.sqrt(size);
  }

  generate() {
    let grid = this.createSolvedGrid();
    grid = this.shuffle(grid);
    const solved = grid.map(row => [...row]);
    const puzzle = this.removeDigits(grid, 0.6); // 60% removal
    return { puzzle, solved };
  }

  createSolvedGrid() {
    const grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        grid[r][c] = ((r % this.blockSize) * this.blockSize + Math.floor(r / this.blockSize) + c) % this.size + 1;
      }
    }
    return grid;
  }

  shuffle(grid) {
    // Swap rows within blocks
    for (let b = 0; b < this.size; b += this.blockSize) {
      for (let i = 0; i < 10; i++) {
        const r1 = b + Math.floor(Math.random() * this.blockSize);
        const r2 = b + Math.floor(Math.random() * this.blockSize);
        [grid[r1], grid[r2]] = [grid[r2], grid[r1]];
      }
    }

    // Swap columns within blocks
    for (let b = 0; b < this.size; b += this.blockSize) {
      for (let i = 0; i < 10; i++) {
        const c1 = b + Math.floor(Math.random() * this.blockSize);
        const c2 = b + Math.floor(Math.random() * this.blockSize);
        for (let r = 0; r < this.size; r++) {
          [grid[r][c1], grid[r][c2]] = [grid[r][c2], grid[r][c1]];
        }
      }
    }

    // Swap digits
    const map = this.shuffleArray(Array.from({ length: this.size }, (_, i) => i + 1));
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        grid[r][c] = map[grid[r][c] - 1];
      }
    }

    return grid;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  removeDigits(grid, density) {
    const puzzle = grid.map(row => row.map(val => val));
    const totalCells = this.size * this.size;
    const cellsToRemove = Math.floor(totalCells * density);
    
    let removed = 0;
    while (removed < cellsToRemove) {
      const r = Math.floor(Math.random() * this.size);
      const c = Math.floor(Math.random() * this.size);
      if (puzzle[r][c] !== null) {
        puzzle[r][c] = null;
        removed++;
      }
    }
    return puzzle;
  }
}
