import './style.css';
import { SudokuGenerator } from './src/sudoku.js';
import { FirebaseService } from './src/firebase-service.js';

const firebaseConfig = {
  apiKey: "AIzaSyDQG4mccOP1GnArU8i0tJlOHiSQ6KZly2g",
  authDomain: "sudonity.firebaseapp.com",
  projectId: "sudonity",
  storageBucket: "sudonity.firebasestorage.app",
  messagingSenderId: "194741558954",
  appId: "1:194741558954:web:52c3924b84cb6345863ad3",
  measurementId: "G-MXED3JDFPL",
  databaseURL: "https://sudonity-default-rtdb.firebaseio.com/"
};

let firebaseService = null;
const generator = new SudokuGenerator(25);
let selectedCell = null;
let inputMode = 'digit'; // 'digit' or 'note'

const gridEl = document.getElementById('grid');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const nicknameInput = document.getElementById('user-nickname');
const configModal = document.getElementById('config-modal');
const configInput = document.getElementById('firebase-config-input');
const saveConfigBtn = document.getElementById('save-config');

// Initialize Grid
function createGrid() {
  gridEl.innerHTML = '';
  for (let r = 0; r < 25; r++) {
    for (let c = 0; c < 25; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if ((r + 1) % 5 === 0 && r < 24) cell.classList.add('cell-row-5n');
      cell.dataset.r = r;
      cell.dataset.c = c;
      
      cell.addEventListener('click', () => selectCell(r, c));
      gridEl.appendChild(cell);
    }
  }
}

function selectCell(r, c) {
  if (selectedCell) {
    const prev = gridEl.querySelector(`[data-r="${selectedCell.r}"][data-c="${selectedCell.c}"]`);
    prev?.classList.remove('selected');
  }
  selectedCell = { r, c };
  const current = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  current?.classList.add('selected');
  
  if (firebaseService) {
    firebaseService.updateCursor(r, c);
  }
  highlightCells();
}

// Handle Keyboard Input
window.addEventListener('keydown', (e) => {
  if (!selectedCell) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const key = e.key.toLowerCase();
  let num = null;

  if (key >= '1' && key <= '9') {
    num = parseInt(key);
  } else if (key >= 'a' && key <= 'p') {
    // a=10, b=11, ..., p=25
    num = key.charCodeAt(0) - 97 + 10;
  }

  if (num !== null && num >= 1 && num <= 25) {
    handleDigitInput(num);
  }

  if (key === 'backspace' || key === 'delete') {
    document.getElementById('clear-cell').click();
  }
});

// Initialize Number Pad
function createNumberPad() {
  const pad = document.getElementById('number-pad');
  for (let i = 1; i <= 25; i++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = i;
    btn.addEventListener('click', () => handleDigitInput(i));
    pad.appendChild(btn);
  }
}

function handleDigitInput(num) {
  if (inputMode === 'search') {
    toggleGlobalHighlight(num);
    return;
  }
  
  if (!selectedCell || !firebaseService) return;
  const cell = gridEl.querySelector(`[data-r="${selectedCell.r}"][data-c="${selectedCell.c}"]`);
  if (cell.classList.contains('fixed')) return;

  if (inputMode === 'digit') {
    firebaseService.updateCell(selectedCell.r, selectedCell.c, num);
  } else {
    firebaseService.toggleNote(selectedCell.r, selectedCell.c, num);
  }
}

// Mode Toggles
const modeDigitBtn = document.getElementById('mode-digit');
const modeNoteBtn = document.getElementById('mode-note');
const modeSearchBtn = document.getElementById('mode-search');

function setMode(mode) {
  inputMode = mode;
  [modeDigitBtn, modeNoteBtn, modeSearchBtn].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  const currentBtn = document.getElementById(`mode-${mode}`);
  if (currentBtn) currentBtn.classList.add('active');
}

if (modeDigitBtn) modeDigitBtn.addEventListener('click', () => setMode('digit'));
if (modeNoteBtn) modeNoteBtn.addEventListener('click', () => setMode('note'));
if (modeSearchBtn) modeSearchBtn.addEventListener('click', () => setMode('search'));

document.getElementById('clear-cell').addEventListener('click', () => {
  if (selectedCell && firebaseService) {
    const cell = gridEl.querySelector(`[data-r="${selectedCell.r}"][data-c="${selectedCell.c}"]`);
    if (!cell.classList.contains('fixed')) {
      firebaseService.clearCell(selectedCell.r, selectedCell.c);
    }
  }
});

document.getElementById('new-game').addEventListener('click', () => {
  if (confirm('Создать новый гигантский пазл? Это очистит текущее поле для всех!')) {
    const { puzzle } = generator.generate();
    const initialBoard = puzzle.map((row) => row.map((val) => ({
      value: val,
      fixed: val !== null,
      notes: []
    })));
    console.log('Generating board...');
    firebaseService.initBoard(initialBoard);
    alert('Новый пазл создан! Поле скоро обновится.');
  }
});

nicknameInput.addEventListener('change', () => {
  const name = nicknameInput.value.trim();
  if (name && firebaseService) {
    firebaseService.updateNickname(name);
    localStorage.setItem('userNickname', name);
  }
});

// Firebase Setup
saveConfigBtn.addEventListener('click', () => {
  try {
    const config = JSON.parse(configInput.value);
    localStorage.setItem('firebaseConfig', configInput.value);
    initFirebase(config);
    configModal.style.display = 'none';
  } catch (e) {
    alert('Invalid JSON config');
  }
});

function initFirebase(config) {
  const systemMsg = (text) => {
    const msgEl = document.createElement('div');
    msgEl.className = 'message';
    msgEl.innerHTML = `<div class="sender">System</div>${text}`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  systemMsg('Подключение к Firebase...');
  firebaseService = new FirebaseService(config);
  
  const savedNick = localStorage.getItem('userNickname');
  if (savedNick) {
    nicknameInput.value = savedNick;
    firebaseService.updateNickname(savedNick);
  } else {
    // If no nick, let's at least set the ID-based name as default
    firebaseService.updateNickname(firebaseService.userId.substr(0, 5));
  }

  firebaseService.syncBoard((board) => {
    if (!board) {
      systemMsg('Комната пуста. Нажми "Новый гигантский пазл", чтобы начать.');
    } else {
      updateBoardUI(board);
    }
  });

  firebaseService.syncPresence((presence) => {
    updateCursorsUI(presence);
  });

  firebaseService.syncChat((msg) => {
    const msgEl = document.createElement('div');
    msgEl.className = 'message';
    msgEl.innerHTML = `<div class="sender">${msg.userId}</div>${msg.text}`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function updateBoardUI(board) {
  if (!board) return;
  for (let r = 0; r < 25; r++) {
    const row = board[r];
    for (let c = 0; c < 25; c++) {
      const cellData = row ? row[c] : null;
      const cellEl = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (!cellEl) continue;

      if (cellData && cellData.value) {
        cellEl.textContent = cellData.value;
        cellEl.dataset.value = cellData.value;
        cellEl.classList.remove('has-notes');
        if (cellData.fixed) cellEl.classList.add('fixed');
        else cellEl.classList.remove('fixed');
      } else if (cellData && cellData.notes && cellData.notes.length > 0) {
        let notesHtml = '';
        for (let i = 1; i <= 25; i++) {
          notesHtml += `<div class="note-slot">${cellData.notes.includes(i) ? i : ''}</div>`;
        }
        cellEl.innerHTML = `<div class="notes-grid">${notesHtml}</div>`;
        cellEl.dataset.value = "";
        cellEl.classList.add('has-notes');
      } else {
        cellEl.textContent = '';
        cellEl.dataset.value = "";
        cellEl.classList.remove('has-notes');
        cellEl.classList.remove('fixed');
      }
    }
  }
  highlightCells();
}

let globalHighlightNum = null;

function highlightCells() {
  document.querySelectorAll('.cell').forEach(el => 
    el.classList.remove('highlight-digit', 'highlight-ray', 'highlight-ray-primary')
  );
  
  // 1. Global Highlight from the Right Panel
  if (globalHighlightNum) {
    document.querySelectorAll(`.cell[data-value="${globalHighlightNum}"]`).forEach(el => {
      el.classList.add('highlight-digit');
    });
  }

  // 2. Local Highlight from Selected Cell
  if (!selectedCell) return;

  const currentCell = gridEl.querySelector(`[data-r="${selectedCell.r}"][data-c="${selectedCell.c}"]`);
  const val = currentCell.dataset.value;
  
  if (!val) return; 

  const br = Math.floor(selectedCell.r / 5);
  const bc = Math.floor(selectedCell.c / 5);

  document.querySelectorAll('.cell').forEach(el => {
    const r = parseInt(el.dataset.r);
    const c = parseInt(el.dataset.c);
    const blockR = Math.floor(r / 5);
    const blockC = Math.floor(c / 5);
    
    // Highlight same row/col/block (Rays)
    if (r === selectedCell.r || c === selectedCell.c || (blockR === br && blockC === bc)) {
      if (r !== selectedCell.r || c !== selectedCell.c) {
        if (r === selectedCell.r || c === selectedCell.c) {
          el.classList.add('highlight-ray-primary');
        } else {
          el.classList.add('highlight-ray');
        }
      }
    }
    
    // Highlight same digits
    if (el.dataset.value === val) {
      el.classList.add('highlight-digit');
    }
  });
}

function createHighlightPanel() {
  const grid = document.getElementById('highlight-grid');
  for (let i = 1; i <= 25; i++) {
    const btn = document.createElement('button');
    btn.className = 'h-btn';
    btn.textContent = i;
    btn.addEventListener('click', () => toggleGlobalHighlight(i));
    grid.appendChild(btn);
  }
  
  document.getElementById('clear-global-highlight').addEventListener('click', () => {
    globalHighlightNum = null;
    document.querySelectorAll('.h-btn').forEach(b => b.classList.remove('active'));
    highlightCells();
  });
}

function toggleGlobalHighlight(num) {
  if (globalHighlightNum === num) {
    globalHighlightNum = null;
  } else {
    globalHighlightNum = num;
  }
  
  document.querySelectorAll('.h-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === globalHighlightNum);
  });
  
  highlightCells();
}

function updateCursorsUI(presence) {
  if (!presence) return;
  // Remove old cursors
  document.querySelectorAll('.cursor').forEach(c => c.remove());
  
  Object.entries(presence).forEach(([uid, pos]) => {
    if (!firebaseService || uid === firebaseService.userId) return;
    if (pos.r === undefined || pos.c === undefined) return;
    const cellEl = gridEl.querySelector(`[data-r="${pos.r}"][data-c="${pos.c}"]`);
    if (cellEl) {
      const cursor = document.createElement('div');
      cursor.className = 'cursor';
      cursor.innerHTML = `<div class="cursor-label">${pos.nickname || uid.substr(0, 5)}</div>`;
      cellEl.appendChild(cursor);
    }
  });
}

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    firebaseService.sendMessage(chatInput.value.trim());
    chatInput.value = '';
  }
});

// Start
createGrid();
createNumberPad();
createHighlightPanel();
initFirebase(firebaseConfig);

// Mobile Menu Toggle
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) {
    sidebar.classList.remove('open');
  }
});
