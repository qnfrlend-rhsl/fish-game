document.body.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let scale = 1;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 🔥 scale 계산 (핵심)
  scale = Math.min(
    window.innerWidth / 1280,
    window.innerHeight / 720
  );

  exchangeButton.x = canvas.width / 2 - exchangeButton.width / 2;
  cannon.x = canvas.width / 2;
  cannon.y = canvas.height - 30;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // 처음 1회 실행

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

canvas.style.touchAction = "none";
canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });

let score = 0;
let coins = 0;
let rewardText = "";
let rewardTimer = 0;
let slotSpinning = false;
let slotTimer = 0;
let lastShotTime = Date.now();
let fishSpawnInterval = null;
let fishSpawnPaused = false;
let isFiring = false;
let fireDelay = 0;
let fireCooldown = 4;
let muzzleFlash = 0;
let isPointerOnUI = false;
let lastHitSound = 0;
let lastActionTime = Date.now();
let gameMode = "active"; // active / idle

// =====================
// 🎵 사운드
// =====================
const shootSound = new Audio("shoot.mp3");
const hitSound = new Audio("hit.mp3");
const slotSound = new Audio("slot.mp3");

shootSound.volume = 0.3;
hitSound.volume = 0.4;
slotSound.volume = 0.5;

const exchangeButton = {
  x: canvas.width / 2 - 120,
  y: 80,
  width: 300,
  height: 50
};

function isInsideButton(x, y, btn) {
  return (
    x > btn.x &&
    x < btn.x + btn.width &&
    y > btn.y &&
    y < btn.y + btn.height
  );
}

const slotIcons = ["🍒", "💎", "7️⃣", "⭐","🐟"];

let slots = ["🍒", "🍒", "🍒"];

// =====================
// 🐋 보스 시스템
// =====================
let boss = null;
let bossActive = false;
let bossTimer = 60 * 60 * 5;
let bossCooldown = 60 * 60 * 5;
let bossSpawnDelay = null;
let bossBattleTimer = 180;
let screenShake = 0;
let warningTimer = 0;
let bgDark = 0;

// =====================
// 🎯 대포 (추가)
// =====================
const cannon = {
  x: canvas.width / 2,
  y: canvas.height - 155,
  angle: 0,
  recoil: 0
};

// =====================
// 🌊 배경 (추가)
// =====================
let bgOffset = 0;

// =====================
// 🪨 바위 장애물 (추가)
// =====================
const obstacles = [
  { x: 400, y: 300, r: 70 },
  { x: 700, y: 200, r: 90 },
  { x: 250, y: 500, r: 60 }
];

// =====================
// 물고기 (그대로 유지)
// =====================
const fishes = [
  { x: 100, y: 200, width: 80, height: 40, speedX: 2.5, speedY: 1.2, wave: 0, waveSpeed: 0.1, color: "orange", hp:3, maxHp:3, hitTime:0 },
  { x: 300, y: 100, width: 50, height: 25, speedX: 3.5, speedY: 1.8, wave: 0, waveSpeed: 0.12, color: "yellow", hp:2, maxHp:2, hitTime:0 },
  { x: 500, y: 300, width: 140, height: 70, speedX: 1.5, speedY: 0.8, wave: 0, waveSpeed: 0.07, color: "blue", hp:5, maxHp:5, hitTime:0 },
  { x: 200, y: 400, width: 100, height: 50, speedX: 2.0, speedY: 1.0, wave: 0, waveSpeed: 0.09, color: "green", hp:3, maxHp:3, hitTime:0 },
  { x: 600, y: 150, width: 60, height: 30, speedX: 4.0, speedY: 2.2, wave: 0, waveSpeed: 0.15, color: "red", hp:1, maxHp:1, hitTime:0 }
];

// =====================
// 총알 (그대로 유지)
// =====================
const bullets = [];

// =====================
// 폭발 파티클 (그대로 유지)
// =====================
const particles = [];

// =====================
// 🎯 조준 (그대로 유지)
// =====================
canvas.addEventListener("pointermove", (e) => {

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const dx = x - cannon.x;
  const dy = y - cannon.y;

  cannon.angle = Math.atan2(dy, dx);
});

// =====================
// 🔥 발사 + UI 충돌 방어 (핵심)
// =====================
canvas.addEventListener("pointerdown", (e) => {

  lastActionTime = Date.now();

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // 💰 UI 먼저 처리
  if (isInsideButton(x, y, exchangeButton)) {

    if (score >= 1000) {
      score -= 1000;
      coins += 500;
    }

    return;
  }

  // 🎮 게임 입력
  isFiring = true;
});
// =====================
// 🔥 발사 종료
// =====================
canvas.addEventListener("pointerup", () => {
  isFiring = false;
});

canvas.addEventListener("pointercancel", () => {
  isFiring = false;
});
// =====================
// 🐠 물고기 스폰 시스템
// =====================
function spawnFish() {
  fishes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height / 2,
    width: 40 + Math.random() * 80,
    height: 20 + Math.random() * 40,
    speedX: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? 1 : -1),
    speedY: (Math.random() * 0.5),
    wave: 0,
    waveSpeed: 0.05 + Math.random() * 0.1,
    color: ["orange","yellow","blue","green","red"][Math.floor(Math.random()*5)],
    hp: 1 + Math.floor(Math.random()*3),
    maxHp: 3,
    hitTime: 0
  });
}
function startFishSpawn() {
  if (fishSpawnInterval) return;

  fishSpawnInterval = setInterval(() => {
    spawnFish();
  }, 5000);
}

function stopFishSpawn() {
  clearInterval(fishSpawnInterval);
  fishSpawnInterval = null;
}

// =====================
// 🐋 보스 생성
// =====================
function spawnBoss() {
  boss = {
    x: canvas.width / 2,
    y: 150,
    width: 220,
    height: 120,
    speedX: 2,
    speedY: 1,
    wave: 0,
    waveSpeed: 0.03,
    color: "purple",
    hp: 50,
    maxHp: 50,
    hitTime: 0
  };
  // 🎯 연출 시작
  screenShake = 30;   // 화면 흔들림
  warningTimer = 120; // WARNING 표시 시간
  bgDark = 1;         // 배경 어두워짐
}

function startSlot() {

  lastActionTime = Date.now();

  slotSpinning = true;
  slotTimer = 290;
}

// =====================
// 게임 루프
// =====================

  function gameLoop() {
    
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    idleTimer = Date.now() - lastShotTime;

  if (idleTimer > 5000) {
    stopFishSpawn();
  } else {
    startFishSpawn();
  }

  let shakeX = 0;
  let shakeY = 0;

  if (screenShake > 0) {
    shakeX = (Math.random() - 0.5) * screenShake;
    shakeY = (Math.random() - 0.5) * screenShake;
    screenShake -= 1;
  }

  // 👉 여기부터 기존 코드 시작
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 1️⃣ 배경
  bgOffset += 0.5;
  ctx.fillStyle = "#0099cc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.fillRect(Math.sin(bgOffset * 0.01 + i) * 10, i, canvas.width, 2);
  }

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Coins: " + coins, 20, 60);

  if (warningTimer > 0) {

  warningTimer--;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (Math.floor(warningTimer / 10) % 2 === 0) {

    ctx.fillStyle = "red";
    ctx.font = "bold 60px Arial";

    ctx.fillText(
      "⚠ WARNING BOSS ⚠",
      canvas.width / 2,
      canvas.height / 2
    );
   }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
   }

  ctx.restore();
  // =====================
  // 물고기
  // =====================
    fishes.forEach(fish => {

  if (bossActive && boss) {
    // 🐟 보스 등장 → 도망 모드
    const dx = fish.x - boss.x;
    const dy = fish.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // 방향 반대로 이동 (도망)
    const speed = 3 + Math.random() * 2;
    fish.x += (dx / dist) * (3 + Math.random() * 2);
    fish.y += (dy / dist) * (3 + Math.random() * 2);

  } else {
    // 🎯 평소 움직임
    fish.x += fish.speedX;
    fish.y += fish.speedY + Math.sin(fish.wave) * 0.5;
    fish.wave += fish.waveSpeed;
  }

  // hit 처리
  if (fish.hitTime > 0) fish.hitTime--;

  // 벽 이동 (그대로 유지)
  if (fish.x > canvas.width + 100) fish.x = -100;
  if (fish.x < -100) fish.x = canvas.width + 100;

  if (fish.y > canvas.height + 100) fish.y = -100;
  if (fish.y < -100) fish.y = canvas.height + 100;

  drawFish(fish);
});


  // =====================
  // 🐋 보스 업데이트
  // =====================
  if (boss) {

  // =========================
  // 🐟 가장 가까운 물고기 찾기
  // =========================
  let targetFish = null;
  let minDist = Infinity;

  for (let fish of fishes) {
    const dx = fish.x - boss.x;
    const dy = fish.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      targetFish = fish;
    }
  }

  // =========================
  // 🐋 이동 (추적 or 기본 이동)
  // =========================
  if (targetFish) {
    const dx = targetFish.x - boss.x;
    const dy = targetFish.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    boss.x += (dx / dist) * boss.speedX * 1.5;
    boss.y += (dy / dist) * boss.speedY * 1.5;
  } else {
    boss.x += boss.speedX;
    boss.y += boss.speedY;
  }

  boss.wave += boss.waveSpeed;

  // =========================
  // 🧱 벽 반사
  // =========================
  if (boss.x < boss.width / 2 || boss.x > canvas.width - boss.width / 2)
    boss.speedX *= -1;

  if (boss.y < 100 || boss.y > canvas.height / 2)
    boss.speedY *= -1;

  // =========================
  // 🍽️ 먹기 판정
  // =========================
  const eatRange = boss.width * 0.4;

  if (targetFish && minDist < eatRange) {

    const index = fishes.indexOf(targetFish);
    if (index !== -1) fishes.splice(index, 1);

    score += 20;
    coins += 10;

    // 💥 이펙트
    for (let i = 0; i < 15; i++) {
      particles.push({
  x: b.x,
  y: b.y,
  vx: (Math.random() - 0.5) * 6,
  vy: (Math.random() - 0.5) * 6,
  life: 30,
  color: fish.color,
  size: 3 + Math.random() * 4
});
    }
  }

  // =========================
  // 🐋 렌더링
  // =========================
  ctx.fillStyle = boss.color;
  ctx.beginPath();
  ctx.ellipse(
    boss.x,
    boss.y,
    boss.width / 2,
    boss.height / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // HP 바
  ctx.fillStyle = "black";
  ctx.fillRect(
    boss.x - boss.width / 2,
    boss.y - boss.height / 2 - 20,
    boss.width,
    8
  );

  ctx.fillStyle = "red";
  ctx.fillRect(
    boss.x - boss.width / 2,
    boss.y - boss.height / 2 - 20,
    boss.width * (boss.hp / boss.maxHp),
    8
  );
}

  // =====================
  // 총알
  // =====================
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    const dx = b.targetX - b.x;
    const dy = b.targetY - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    b.x += (dx / dist) * b.speed;
    b.y += (dy / dist) * b.speed;

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();

    for (let obs of obstacles) {
      const odx = b.x - obs.x;
      const ody = b.y - obs.y;
      const odist = Math.sqrt(odx * odx + ody * ody);

      if (odist < obs.r) {
        bullets.splice(i, 1);
        continue;
      }
    }

    if (
      b.x < -50 || b.x > canvas.width + 50 ||
      b.y < -50 || b.y > canvas.height + 50
    ) {
      bullets.splice(i, 1);
    }
   }

   // =====================
   // 충돌
   // =====================
   for (let i = fishes.length - 1; i >= 0; i--) {
    const fish = fishes[i];

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];

      const dx = fish.x - b.x;
      const dy = fish.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const hitRadius = Math.min(fish.width, fish.height) * 0.4;

      if (dist < hitRadius) {

            bullets.splice(j, 1);
            fish.hp -= 1;

      if (Date.now() - lastHitSound > 50) {
          const h = hitSound.cloneNode();
          h.volume = 0.2;
           h.play();
              lastHitSound = Date.now();
               }

        for (let k = 0; k < 6; k++) {
          if (particles.length > 300) continue;
          particles.push({
            x: b.x,
            y: b.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 30
          });
        }

        if (fish.hp <= 0) {
          fishes.splice(i, 1);
          score += 10;
          coins += 10;
        }

        break;
      }
    }
   }

   // 🐋 보스 충돌
   if (boss) {
  for (let j = bullets.length - 1; j >= 0; j--) {
    const b = bullets[j];

    const dx = boss.x - b.x;
    const dy = boss.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const hitRadius = Math.min(boss.width, boss.height) * 0.4;

    if (dist < hitRadius) {
      bullets.splice(j, 1);
      boss.hp -= 1;

      if (boss.hp <= 0) {
        boss = null;
        bossActive = false;
        bossCooldown = 60 * 60 * 5;
        bossTimer = 60 * 60 * 5;

        score += 500;
        coins += 300;
      }

      break;
    }
  }
}

  // =====================
  // 파티클
  // =====================
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    //ctx.fillStyle = "rgba(255,200,0,0.8)";
    ctx.fillStyle = p.color || "rgba(255, 0, 13, 0.8)";

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) particles.splice(i, 1);
  }

  // 🪨 장애물 렌더
  for (let obs of obstacles) {
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!bossActive) {

  // 1️⃣ 최소 5분 보호
  if (bossCooldown > 0) {
    bossCooldown--;
  } 
  else {

    // 2️⃣ 이후 랜덤 등장
    if (Math.random() < 0.002) {
      spawnBoss();
      bossActive = true;

      // 다시 5분 보호
      bossCooldown = 60 * 60 * 5;
    }
  }
}

if (muzzleFlash > 0) {
  muzzleFlash--;
}
  
drawCannon();
  drawExchangeButton();
  

if (coins >= 100 && !slotSpinning) {
  coins -= 100;
  startSlot();
  slotSound.currentTime = 0;
  slotSound.play();
}

// 🎰 슬롯 업데이트
updateSlots();
// 🎰 슬롯 그리기
drawSlots();
drawRewardText();

if (isFiring) {

  if (fireDelay > 0) {
    fireDelay--;
  }

  if (fireDelay <= 0) {
    shoot();
    fireDelay = fireCooldown;
  }
}

requestAnimationFrame(gameLoop);
}

// =====================
// 대포
// =====================
function drawCannon() {

  // 🔥 반동 감소
  if (cannon.recoil > 0) {
    cannon.recoil *= 0.8;
  }

  ctx.save();

  ctx.translate(cannon.x, cannon.y);
  ctx.rotate(cannon.angle);

  // 🔥 반동 적용
  ctx.translate(-cannon.recoil, 0);

  // 🔫 대포
  ctx.fillStyle = "black";
  ctx.fillRect(0, -10, 60, 20);

  // 🔥 총구 화염
  if (muzzleFlash > 0) {

    // 바깥 화염
    ctx.fillStyle = "orange";

    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(90 + Math.random() * 20, -12);
    ctx.lineTo(90 + Math.random() * 20, 12);
    ctx.closePath();
    ctx.fill();

    // 안쪽 화염
    ctx.fillStyle = "yellow";

    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(80 + Math.random() * 10, -6);
    ctx.lineTo(80 + Math.random() * 10, 6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// =====================
// 물고기
// =====================
function drawFish(fish) {
  const offsetY = Math.sin(fish.wave) * 15;
  const shake = fish.hitTime > 0 ? (Math.random() - 0.5) * 6 : 0;

  const x = fish.x + shake;
  const y = fish.y + offsetY;

  ctx.save();

  if (fish.speedX < 0) {
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    drawFishBody(0, 0, fish);
  } else {
    drawFishBody(x, y, fish);
  }

  ctx.restore();
}

// =====================
// 물고기 몸통
// =====================
function drawFishBody(x, y, fish) {

  if (fish.hitTime <= 0) {
    ctx.fillStyle = fish.color;
  }

  ctx.beginPath();
  ctx.ellipse(x, y, fish.width / 2, fish.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - fish.width * 0.1, y - fish.height * 0.2);
  ctx.lineTo(x, y - fish.height * 0.8);
  ctx.lineTo(x + fish.width * 0.15, y - fish.height * 0.2);
  ctx.closePath();
  ctx.fill();

  const tailWidth = fish.width * 0.25;
  const tailHeight = fish.height * 0.4;
  const tailSwing = Math.sin(fish.wave * 3) * 4;

  ctx.beginPath();
  ctx.moveTo(x - fish.width / 2, y);
  ctx.lineTo(x - fish.width / 2 - tailWidth, y - tailHeight + tailSwing);
  ctx.lineTo(x - fish.width / 2 - tailWidth, y + tailHeight - tailSwing);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x + fish.width * 0.25, y - fish.height * 0.1, fish.width * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "black";
  ctx.beginPath();
  ctx.arc(x + fish.width * 0.38, y + fish.height * 0.05, fish.width * 0.08, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x - fish.width/2, y - fish.height/2 - 12, fish.width, 6);

  ctx.fillStyle = "lime";
  ctx.fillRect(
    x - fish.width/2,
    y - fish.height/2 - 12,
    fish.width * (fish.hp / fish.maxHp),
    6
  );  
}
function drawSlots() {

  const y = canvas.height - 140;

  // 배경
  ctx.fillStyle = "black";
  ctx.fillRect(canvas.width/2 - 180, y, 360, 100);

  // 테두리
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 4;
  ctx.strokeRect(canvas.width/2 - 180, y, 360, 100);

  // 칸 나누기
  ctx.beginPath();

  ctx.moveTo(canvas.width/2 - 60, y);
  ctx.lineTo(canvas.width/2 - 60, y + 100);

  ctx.moveTo(canvas.width/2 + 60, y);
  ctx.lineTo(canvas.width/2 + 60, y + 100);

  ctx.stroke();

  // 슬롯 그림
  ctx.font = "50px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(slots[0], canvas.width/2 - 120, y + 50);
  ctx.fillText(slots[1], canvas.width/2, y + 50);
  ctx.fillText(slots[2], canvas.width/2 + 120, y + 50);

  // 아래 텍스트
  ctx.font = "28px Arial";
  ctx.fillStyle = "yellow";

  if (slotSpinning) {
    ctx.fillText("🎰 SPINNING...", canvas.width/2, y + 125);
  } else {
    ctx.fillText("🎰 SLOT READY", canvas.width/2, y + 125);
  }
}
function updateSlots() {

  if (!slotSpinning) return;

  slotTimer--;

  // 슬롯 랜덤 변경
  slots[0] = slotIcons[Math.floor(Math.random() * slotIcons.length)];
  slots[1] = slotIcons[Math.floor(Math.random() * slotIcons.length)];
  slots[2] = slotIcons[Math.floor(Math.random() * slotIcons.length)];

  // 종료
  if (slotTimer <= 0) {

    slotSpinning = false;

    checkSlotReward();
  }
}
function checkSlotReward() {

  rewardText = "MISS";

  // 3개 동일
  if (
    slots[0] === slots[1] &&
    slots[1] === slots[2]
  ) {

    // 🍒
    if (slots[0] === "🍒") {
      coins += 50;
      rewardText = "+50 COINS!";
    }

    // 💎
    if (slots[0] === "💎") {
      coins += 500;
      rewardText = "💎 JACKPOT +500!";
    }

    // 7️⃣
    if (slots[0] === "7️⃣") {
      score *= 2;
      rewardText = "7️⃣ DOUBLE SCORE!";
    }

    // ⭐
    if (slots[0] === "⭐") {
      coins += 200;
      rewardText = "⭐ BONUS +200!";
    }

    // 🐟
    if (slots[0] === "🐟") {
      score += 300;
      rewardText = "🐟 +300 SCORE!";
    }
  }

  rewardTimer = 180;
}
function drawRewardText() {

  if (rewardTimer <= 0) return;

  rewardTimer--;

  ctx.font = "40px Arial";
  ctx.fillStyle = "yellow";
  ctx.textAlign = "center";

  ctx.fillText(
    rewardText,
    canvas.width / 2,
    canvas.height / 2
  );
  ctx.textAlign = "left";
}

startFishSpawn();
// =====================
// 시작
// =====================
gameLoop();
function drawExchangeButton() {

  if (score < 1000) return;

  const x = exchangeButton.x;
  const y = exchangeButton.y;
  const w = exchangeButton.width;
  const h = exchangeButton.height;

  // 🔥 그림자
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 10;

  // 🎨 그라데이션
  let grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "#00c6ff");
  grad.addColorStop(1, "#0072ff");

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // 테두리
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // 텍스트
  ctx.fillStyle = "white";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    "💰 SCORE → +500 COIN (1000)",
    x + w / 2,
    y + h / 2
  );
}
function shoot() {

  lastActionTime = Date.now();

  muzzleFlash = 5;
  
  bullets.push({
    x: cannon.x,
    y: cannon.y,
    targetX: cannon.x + Math.cos(cannon.angle) * 1000,
    targetY: cannon.y + Math.sin(cannon.angle) * 1000,
    speed: 10
  });

  cannon.recoil = 10;

  shootSound.currentTime = 0;
  shootSound.play();

  lastShotTime = Date.now();
}

