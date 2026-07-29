const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const levelTxt = document.getElementById('level-txt');
const timeTxt = document.getElementById('time-txt');
const p1ScoreTxt = document.getElementById('p1-score');
const p2ScoreTxt = document.getElementById('p2-score');
const overlay = document.getElementById('overlay');
const menuTitle = document.getElementById('menu-title');
const menuSubtitle = document.getElementById('menu-subtitle');
const difficultySelect = document.getElementById('difficulty-select');

// Game State
let isMultiplayer = false;
let gameRunning = false;
let level = 1;
let timeLeft = 30;
let timerInterval = null;
let idleTimer = 0;

// Pengaturan Kesulitan yang Ringan
const difficultySettings = {
  easy: { baseTime: 35, aiSpeed: 2, target: 3 },
  medium: { baseTime: 25, aiSpeed: 3.2, target: 4 },
  hard: { baseTime: 20, aiSpeed: 4.5, target: 5 }
};

let player1 = { x: 80, y: 180, size: 28, color: '#38bdf8', speed: 6, score: 0 };
let player2 = { x: 590, y: 180, size: 28, color: '#f43f5e', speed: 3, score: 0 };
let coin = { x: 350, y: 200, size: 14 };

const keys = {};

// Web Audio API untuk efek suara simpel
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, duration) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Input Control
window.addEventListener('keydown', (e) => (keys[e.key] = true));
window.addEventListener('keyup', (e) => (keys[e.key] = false));

document.getElementById('btn-single').addEventListener('click', () => startGame(false));
document.getElementById('btn-multi').addEventListener('click', () => startGame(true));

function startGame(multi) {
  isMultiplayer = multi;
  gameRunning = true;
  level = 1;
  player1.score = 0;
  player2.score = 0;
  idleTimer = 0;

  overlay.style.display = 'none';
  resetPositions();
  startLevel();
  requestAnimationFrame(gameLoop);
}

function startLevel() {
  const diff = difficultySettings[difficultySelect.value];
  timeLeft = Math.max(diff.baseTime - (level - 1) * 2, 10);
  player2.speed = isMultiplayer ? 6 : diff.aiSpeed + level * 0.2;

  updateUI();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameRunning) return;

    timeLeft--;

    // Deteksi Diam / AFK
    const isP1Moving = keys['w'] || keys['a'] || keys['s'] || keys['d'];
    const isP2Moving = keys['ArrowUp'] || keys['ArrowLeft'] || keys['ArrowDown'] || keys['ArrowRight'];

    if (!isP1Moving && (!isMultiplayer || !isP2Moving)) {
      idleTimer++;
    } else {
      idleTimer = 0;
    }

    if (idleTimer >= 5) {
      endGame("Game Over: Karakter Kamu Diam Terlalu Lama!");
      return;
    }

    updateUI();

    if (timeLeft <= 0) {
      if (player1.score === 0) {
        endGame("Waktu Habis & Skor Kamu Masih 0!");
      } else {
        endGame("Waktu Habis!");
      }
    }
  }, 1000);
}

function resetPositions() {
  player1.x = 80;
  player1.y = 180;
  player2.x = 590;
  player2.y = 180;
  spawnCoin();
}

function spawnCoin() {
  coin.x = Math.random() * (canvas.width - 60) + 30;
  coin.y = Math.random() * (canvas.height - 60) + 30;
}

function updateUI() {
  levelTxt.innerText = level;
  timeTxt.innerText = timeLeft;
  p1ScoreTxt.innerText = player1.score;
  p2ScoreTxt.innerText = player2.score;
}

function update() {
  if (!gameRunning) return;

  // Movement P1 (WASD)
  if (keys['w'] && player1.y > 0) player1.y -= player1.speed;
  if (keys['s'] && player1.y < canvas.height - player1.size) player1.y += player1.speed;
  if (keys['a'] && player1.x > 0) player1.x -= player1.speed;
  if (keys['d'] && player1.x < canvas.width - player1.size) player1.x += player1.speed;

  // Movement P2 / AI
  if (isMultiplayer) {
    if (keys['ArrowUp'] && player2.y > 0) player2.y -= player2.speed;
    if (keys['ArrowDown'] && player2.y < canvas.height - player2.size) player2.y += player2.speed;
    if (keys['ArrowLeft'] && player2.x > 0) player2.x -= player2.speed;
    if (keys['ArrowRight'] && player2.x < canvas.width - player2.size) player2.x += player2.speed;
  } else {
    // AI mengejar koin dengan gerakan mulus
    if (player2.x < coin.x) player2.x += player2.speed;
    if (player2.x > coin.x) player2.x -= player2.speed;
    if (player2.y < coin.y) player2.y += player2.speed;
    if (player2.y > coin.y) player2.y -= player2.speed;
  }

  // Cek Tabrakan Koin
  checkCollision(player1);
  checkCollision(player2);
}

function checkCollision(p) {
  let dist = Math.hypot((p.x + p.size/2) - coin.x, (p.y + p.size/2) - coin.y);
  if (dist < p.size/2 + coin.size) {
    p.score++;
    playSound(523.25, 0.15); // Nada C5 saat ambil koin
    spawnCoin();

    const target = difficultySettings[difficultySelect.value].target;
    if (player1.score + player2.score >= level * target) {
      level++;
      playSound(783.99, 0.3); // Nada G5 saat naik level
      startLevel();
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Grid Sederhana
  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
  }

  // Peringatan jika diam
  if (idleTimer >= 2) {
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠️ Bergeraklah! Game Over dalam ${5 - idleTimer}s`, canvas.width / 2, 30);
  }

  // Koin Emas Glowing
  ctx.fillStyle = '#facc15';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
  ctx.fill();

  // Player 1 (Biru Neon)
  ctx.fillStyle = player1.color;
  ctx.shadowColor = player1.color;
  ctx.fillRect(player1.x, player1.y, player1.size, player1.size);

  // Player 2 / AI (Merah Neon)
  ctx.fillStyle = player2.color;
  ctx.shadowColor = player2.color;
  ctx.fillRect(player2.x, player2.y, player2.size, player2.size);

  ctx.shadowBlur = 0; // Reset shadow
}

function endGame(reason) {
  gameRunning = false;
  clearInterval(timerInterval);
  playSound(180, 0.4);

  let winner = "Hasil Seri!";
  if (player1.score > player2.score) winner = "🏆 Player 1 Menang!";
  else if (player2.score > player1.score) winner = isMultiplayer ? "🏆 Player 2 Menang!" : "💻 Computer Menang!";

  menuTitle.innerText = "GAME OVER";
  menuSubtitle.innerHTML = `<span style="color:#f43f5e">${reason}</span><br><br><b>${winner}</b><br>Skor Kamu: ${player1.score} | Level: ${level}`;
  overlay.style.display = 'flex';
}

function gameLoop() {
  if (gameRunning) {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
}
