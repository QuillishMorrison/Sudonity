import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, onChildAdded, update } from "firebase/database";

export class FirebaseService {
  constructor(config) {
    this.app = initializeApp(config);
    this.db = getDatabase(this.app, config.databaseURL);
    this.roomId = window.location.hash.substring(1) || this.generateRoomId();
    window.location.hash = this.roomId;
    
    this.userId = localStorage.getItem('sudonityUserId') || ('player_' + Math.random().toString(36).substr(2, 9));
    localStorage.setItem('sudonityUserId', this.userId);
    
    this.nickname = localStorage.getItem('userNickname') || '';
  }

  generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
  }

  syncBoard(callback) {
    const boardRef = ref(this.db, `rooms/${this.roomId}/board`);
    onValue(boardRef, (snapshot) => {
      callback(snapshot.val());
    });
  }

  updateCell(r, c, value, isNote = false) {
    const cellRef = ref(this.db, `rooms/${this.roomId}/board/${r}/${c}`);
    if (isNote) {
      update(cellRef, { notes: value, value: null }); // Clear value when adding notes
    } else {
      update(cellRef, { value: value, notes: null }); // Clear notes when adding value
    }
  }

  toggleNote(r, c, num) {
    const cellRef = ref(this.db, `rooms/${this.roomId}/board/${r}/${c}`);
    onValue(cellRef, (snapshot) => {
      const data = snapshot.val() || {};
      let notes = data.notes || [];
      if (notes.includes(num)) {
        notes = notes.filter(n => n !== num);
      } else {
        notes.push(num);
        notes.sort((a, b) => a - b);
      }
      update(cellRef, { notes: notes, value: null });
    }, { onlyOnce: true });
  }

  clearCell(r, c) {
    const cellRef = ref(this.db, `rooms/${this.roomId}/board/${r}/${c}`);
    update(cellRef, { value: null, notes: null });
  }

  initBoard(board) {
    set(ref(this.db, `rooms/${this.roomId}/board`), board)
      .then(() => console.log('Board initialized successfully'))
      .catch((err) => console.error('Board initialization failed:', err));
  }

  syncPresence(callback) {
    const presenceRef = ref(this.db, `rooms/${this.roomId}/presence`);
    onValue(presenceRef, (snapshot) => {
      callback(snapshot.val());
    });
  }

  updateCursor(r, c) {
    set(ref(this.db, `rooms/${this.roomId}/presence/${this.userId}`), {
      r, c, 
      userId: this.userId,
      nickname: this.nickname || this.userId.substr(0, 5),
      lastActive: Date.now()
    });
  }

  updateNickname(name) {
    this.nickname = name;
    // Update presence immediately if we have a current position
    const presenceRef = ref(this.db, `rooms/${this.roomId}/presence/${this.userId}`);
    update(presenceRef, { nickname: name });
  }

  syncChat(callback) {
    const chatRef = ref(this.db, `rooms/${this.roomId}/chat`);
    onChildAdded(chatRef, (snapshot) => {
      callback(snapshot.val());
    });
  }

  sendMessage(text, customSender = null) {
    const chatRef = ref(this.db, `rooms/${this.roomId}/chat`);
    push(chatRef, {
      userId: customSender || this.nickname || this.userId.substr(0, 5),
      text: text,
      timestamp: Date.now()
    });
  }
}
