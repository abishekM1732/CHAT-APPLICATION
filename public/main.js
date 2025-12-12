// client side logic
const socket = io();

const joinBtn = document.getElementById('joinBtn');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const usersList = document.getElementById('users');
const roomLabel = document.getElementById('roomLabel');
const status = document.getElementById('status');
const messagesEl = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');
const typingIndicator = document.getElementById('typingIndicator');

let joined = false;
let typingTimeout = null;
let lastTyping = false;

function tsToTime(ts){
  const d = new Date(ts);
  return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function appendSystem(text, ts){
  const el = document.createElement('div');
  el.className = 'system';
  el.textContent = `${text} · ${tsToTime(ts)}`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage({ username, text, ts, id }){
  const me = socket.id === id;
  const wrap = document.createElement('div');
  wrap.className = 'message' + (me ? ' me' : '');
  const meta = document.createElement('div');
  meta.className = 'meta-row';
  meta.textContent = `${username} · ${tsToTime(ts)}`;
  const body = document.createElement('div');
  body.textContent = text;
  wrap.appendChild(meta);
  wrap.appendChild(body);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

joinBtn.addEventListener('click', () => {
  if (joined) return;
  const username = usernameInput.value || 'Anonymous';
  const room = roomInput.value || 'General';
  socket.emit('join', { username, room });
  joined = true;
  roomLabel.innerHTML = `Room: <strong>${room}</strong>`;
  status.textContent = 'Connected';
  usernameInput.disabled = true;
  roomInput.disabled = true;
});

msgForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!joined) {
    alert('Join a room first');
    return;
  }
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit('chatMessage', { text });
  msgInput.value = '';
  sendTyping(false);
});

msgInput.addEventListener('input', () => {
  if (!joined) return;
  sendTyping(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => sendTyping(false), 800);
});

function sendTyping(flag){
  if (lastTyping === flag) return;
  lastTyping = flag;
  socket.emit('typing', { typing: !!flag });
}

// socket listeners
socket.on('systemMessage', (m) => appendSystem(m.text, m.ts));
socket.on('chatMessage', (m) => appendMessage(m));
socket.on('userList', (list) => {
  usersList.innerHTML = '';
  list.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    usersList.appendChild(li);
  });
});
socket.on('typing', ({ username, typing }) => {
  typingIndicator.textContent = typing ? `${username} is typing...` : '';
});
