const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Danh sach origin duoc phep ket noi (local + URL Vercel tu bien moi truong).
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  ...(process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [])
];

const app = express();
app.use(
  cors({
    origin: ALLOWED_ORIGINS
  })
);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});

// Render tu dong gan PORT; local mac dinh 3000.
const PORT = Number(process.env.PORT) || 3000;
const TICK_RATE = 30;
// 11 vs 11 su dung 1 phong duy nhat.
const FIXED_11VS11_ROOM_ID = "11vs11-room";
const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 500;
const FIELD_MARGIN = 20;
const PLAY_MIN_X = FIELD_MARGIN;
const PLAY_MAX_X = FIELD_WIDTH - FIELD_MARGIN;
const PLAY_MIN_Y = FIELD_MARGIN;
const PLAY_MAX_Y = FIELD_HEIGHT - FIELD_MARGIN;
const GOAL_Y_MIN = 200;
const GOAL_Y_MAX = 300;

// Vong cam dia - gioi han di chuyen thu mon (sân 800x500, khung thanh Y: 200-300).
// Doi Do (trai): X 0-150, Y 100-400 | Doi Xanh (phai): X 650-800, Y 100-400.
const PENALTY_RED_MIN_X = 0;
const PENALTY_RED_MAX_X = 150;
const PENALTY_BLUE_MIN_X = 650;
const PENALTY_BLUE_MAX_X = 800;
const PENALTY_MIN_Y = 100;
const PENALTY_MAX_Y = 400;

const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 3;
const BALL_RADIUS = 9;
const MAX_PLAYERS = 22;
const MAX_TEAM_SIZE = 11;
const DRIBBLE_DISTANCE = PLAYER_RADIUS + BALL_RADIUS + 2;
const BALL_FREE_SPEED = 6.2;
const SHOOT_SPEED = 15;
const PASS_SPEED = 11;
const THROW_IN_SPEED = 8.5;
const ENERGY_MAX = 100;
const PASS_ENERGY_COST = 15;
const SHOOT_ENERGY_COST = 25;
const SET_PIECE_ENERGY_COST = 10;
const ENERGY_RECHARGE_AMOUNT = 30;
const DUEL_TRIGGER_DISTANCE = 30;
const DUEL_TIMEOUT_MS = 10000;
const GK_DUEL_TIMEOUT_MS = 10000;
const BOT_SPEED = 2.1;

const TEAM_RED = "RED";
const TEAM_BLUE = "BLUE";
const TEAM_COLORS = {
  [TEAM_RED]: "#ff4d4f",
  [TEAM_BLUE]: "#4d7dff"
};

const questions = [
  {
    id: "q1",
    text: "Thu do cua Viet Nam la thanh pho nao?",
    options: { A: "Ha Noi", B: "Da Nang", C: "Hue", D: "Can Tho" },
    correctAnswer: "A"
  },
  {
    id: "q2",
    text: "2 + 5 * 2 bang bao nhieu?",
    options: { A: "14", B: "12", C: "10", D: "9" },
    correctAnswer: "B"
  },
  {
    id: "q3",
    text: "Ngon ngu lap trinh chay tren trinh duyet pho bien la?",
    options: { A: "Python", B: "C++", C: "JavaScript", D: "Go" },
    correctAnswer: "C"
  },
  {
    id: "q4",
    text: "Hanh tinh nao gan Mat Troi nhat?",
    options: { A: "Sao Hoa", B: "Sao Kim", C: "Sao Moc", D: "Sao Thuy" },
    correctAnswer: "D"
  },
  {
    id: "q5",
    text: "Trong bong da, moi doi co bao nhieu cau thu tren san?",
    options: { A: "9", B: "10", C: "11", D: "12" },
    correctAnswer: "C"
  }
];

// rooms luu toan bo trang thai theo tung phong.
// roomId -> roomState
const rooms = new Map();

// socketId -> roomId de truy xuat nhanh khi nhan su kien.
const socketToRoom = new Map();

// socketId -> thong tin profile gui tu frontend truoc khi vao phong.
const socketProfiles = new Map();

let roomCounter = 0;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Lay bien vong cam dia theo doi (dung cho thu mon).
function getPenaltyBounds(team) {
  if (team === TEAM_RED) {
    return {
      minX: PENALTY_RED_MIN_X,
      maxX: PENALTY_RED_MAX_X,
      minY: PENALTY_MIN_Y,
      maxY: PENALTY_MAX_Y
    };
  }
  return {
    minX: PENALTY_BLUE_MIN_X,
    maxX: PENALTY_BLUE_MAX_X,
    minY: PENALTY_MIN_Y,
    maxY: PENALTY_MAX_Y
  };
}

// Gioi han thu mon trong vong cam dia; bo goc mem bang clamp tung truc doc lap.
function clampGoalkeeperPosition(player) {
  if (player.role !== "GK") return;

  const bounds = getPenaltyBounds(player.team);
  const r = player.radius;
  player.x = clamp(player.x, bounds.minX + r, bounds.maxX - r);
  player.y = clamp(player.y, bounds.minY + r, bounds.maxY - r);
}

// Gioi han cau thu thuong trong khu vuc san choi.
function clampFieldPosition(player) {
  player.x = clamp(player.x, PLAY_MIN_X + player.radius, PLAY_MAX_X - player.radius);
  player.y = clamp(player.y, PLAY_MIN_Y + player.radius, PLAY_MAX_Y - player.radius);
}

// Ap dung gioi han phu hop theo vai tro (GK -> vong cam, con lai -> bien san).
function applyMovementBounds(player) {
  if (player.role === "GK") {
    clampGoalkeeperPosition(player);
  } else {
    clampFieldPosition(player);
  }
}

// Chieu muc tieu ve trong vong cam de AI thu mon di chuyen muot, khong "dam" vao vach.
function projectPointIntoPenalty(team, x, y, radius) {
  const bounds = getPenaltyBounds(team);
  return {
    x: clamp(x, bounds.minX + radius, bounds.maxX - radius),
    y: clamp(y, bounds.minY + radius, bounds.maxY - radius)
  };
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pickRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

function createEmptyRoom(roomId, roomName) {
  return {
    id: roomId,
    name: roomName || `Room ${roomId}`,
    gameMode: "11vs11",
    players: {},
    playerCounter: 0,
    ball: {
      x: FIELD_WIDTH / 2,
      y: FIELD_HEIGHT / 2,
      radius: BALL_RADIUS,
      vx: 0,
      vy: 0
    },
    ballHolderId: null,
    lastTouchTeam: null,
    lastTouchPlayerId: null,
    // Dung cho mode 1vsMay: khoa quyen dan bong giua cac bot.
    // - botCarrierId: bot dang/duoc phep tiep tuc dan bong.
    // - botPassTargetId: bot duoc phep nhan bong khi co duong chuyen.
    botCarrierId: null,
    botPassTargetId: null,
    practiceOwnerId: null,
    practiceConfig: {
      teammates: 0,
      opponents: 0
    },
    score: {
      RED: 0,
      BLUE: 0
    },
    match: {
      phase: "PLAYING",
      duel: null,
      notice: "",
      setPiece: null,
      gkDuel: null
    }
  };
}

function getRoomListPayload() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    gameMode: room.gameMode,
    players: Object.keys(room.players).length,
    capacity: MAX_PLAYERS,
    ...getTeamAvailability(room)
  }));
}

function emitRoomListToAll() {
  io.emit("room-list", getRoomListPayload());
}

function emitActionDenied(socket, message) {
  socket.emit("action-denied", { message });
}

function consumeEnergy(player, amount) {
  if ((player.energy ?? ENERGY_MAX) < amount) return false;
  player.energy = Math.max(0, (player.energy ?? ENERGY_MAX) - amount);
  return true;
}

function rechargeEnergy(player) {
  player.energy = Math.min(ENERGY_MAX, (player.energy ?? ENERGY_MAX) + ENERGY_RECHARGE_AMOUNT);
}

function getTeamCount(room, team) {
  return Object.values(room.players).filter((player) => player.team === team).length;
}

// Thong tin slot tung doi trong phong (dung cho UI chon doi).
function getTeamAvailability(room) {
  const redCount = getTeamCount(room, TEAM_RED);
  const blueCount = getTeamCount(room, TEAM_BLUE);
  return {
    redCount,
    blueCount,
    maxTeamSize: MAX_TEAM_SIZE,
    redFull: redCount >= MAX_TEAM_SIZE,
    blueFull: blueCount >= MAX_TEAM_SIZE
  };
}

function pickTeamForRoom(room) {
  const redCount = getTeamCount(room, TEAM_RED);
  const blueCount = getTeamCount(room, TEAM_BLUE);

  if (redCount >= MAX_TEAM_SIZE && blueCount >= MAX_TEAM_SIZE) {
    return null;
  }

  if (redCount <= blueCount && redCount < MAX_TEAM_SIZE) {
    return TEAM_RED;
  }
  return TEAM_BLUE;
}

// Xu ly doi nguoi choi chon; neu doi da day thi tu choi vao phong (khong auto doi doi).
function resolvePreferredTeam(room, preferredTeam) {
  const { redFull, blueFull } = getTeamAvailability(room);

  if (preferredTeam === TEAM_RED || preferredTeam === TEAM_BLUE) {
    // Neu doi nguoi choi chon da day thi tu choi vao phong.
    if (preferredTeam === TEAM_RED && redFull) {
      if (blueFull) return { team: null, error: "Ca 2 doi trong phong da day." };
      return { team: null, error: "Doi Do da day. Hay chon Doi Xanh." };
    }
    if (preferredTeam === TEAM_BLUE && blueFull) {
      if (redFull) return { team: null, error: "Ca 2 doi trong phong da day." };
      return { team: null, error: "Doi Xanh da day. Hay chon Doi Do." };
    }
    return { team: preferredTeam, error: null };
  }

  const team = pickTeamForRoom(room);
  if (!team) {
    return { team: null, error: "Ca 2 doi trong phong da day." };
  }
  return { team, error: null };
}

function spawnForTeam(team) {
  if (team === TEAM_RED) {
    return {
      x: randomBetween(70, FIELD_WIDTH / 2 - 40),
      y: randomBetween(60, FIELD_HEIGHT - 60)
    };
  }
  return {
    x: randomBetween(FIELD_WIDTH / 2 + 40, FIELD_WIDTH - 70),
    y: randomBetween(60, FIELD_HEIGHT - 60)
  };
}

function createPlayer(socketId, room, team, preferredName) {
  room.playerCounter += 1;
  const spawn = spawnForTeam(team);
  const playerName = String(preferredName || "").trim() || `P${room.playerCounter}`;

  return {
    id: socketId,
    name: playerName,
    team,
    color: TEAM_COLORS[team],
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER_RADIUS,
    speed: PLAYER_SPEED,
    direction: { dx: team === TEAM_RED ? 1 : -1, dy: 0 },
    input: {
      up: false,
      down: false,
      left: false,
      right: false
    },
    isBot: false,
    energy: ENERGY_MAX
  };
}

function createBotPlayer(room, team = TEAM_BLUE) {
  room.playerCounter += 1;
  const spawn = spawnForTeam(team);

  return {
    id: `bot-${room.id}`,
    name: "BOT AI",
    team,
    color: TEAM_COLORS[team],
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER_RADIUS,
    speed: BOT_SPEED,
    direction: { dx: team === TEAM_RED ? 1 : -1, dy: 0 },
    input: {
      up: false,
      down: false,
      left: false,
      right: false
    },
    isBot: true,
    energy: ENERGY_MAX
  };
}

function createBossRaidBots(room) {
  // So do 1-4-4-2 tren nua san phai (doi Xanh).
  const formation = [
    { id: "bot_1", role: "GK", x: 735, y: 250 },
    { id: "bot_2", role: "DF", x: 655, y: 95 },
    { id: "bot_3", role: "DF", x: 655, y: 190 },
    { id: "bot_4", role: "DF", x: 655, y: 310 },
    { id: "bot_5", role: "DF", x: 655, y: 405 },
    { id: "bot_6", role: "MF", x: 565, y: 80 },
    { id: "bot_7", role: "MF", x: 565, y: 170 },
    { id: "bot_8", role: "MF", x: 565, y: 330 },
    { id: "bot_9", role: "MF", x: 565, y: 420 },
    { id: "bot_10", role: "FW", x: 480, y: 180 },
    { id: "bot_11", role: "FW", x: 480, y: 320 }
  ];

  formation.forEach((botData) => {
    const bot = {
      id: botData.id,
      name: botData.id.toUpperCase(),
      team: TEAM_BLUE,
      color: TEAM_COLORS[TEAM_BLUE],
      x: botData.x,
      y: botData.y,
      radius: PLAYER_RADIUS,
      speed: BOT_SPEED,
      direction: { dx: -1, dy: 0 },
      input: { up: false, down: false, left: false, right: false },
      isBot: true,
      role: botData.role,
      energy: ENERGY_MAX
    };
    // Dam bao thu mon spawn dung trong vong cam dia.
    applyMovementBounds(bot);
    room.players[botData.id] = bot;
  });
}

function createCompanionBot(room) {
  const companionId = `ally-bot-${room.id}`;
  if (room.players[companionId]) return;

  // Bot dong hanh cua nguoi choi: thuoc doi Do, xuat hien o nua san trai.
  room.players[companionId] = {
    id: companionId,
    name: "BOT_DONG_HANH",
    team: TEAM_RED,
    color: TEAM_COLORS[TEAM_RED],
    x: 170,
    y: 250,
    radius: PLAYER_RADIUS,
    speed: BOT_SPEED,
    direction: { dx: 1, dy: 0 },
    input: { up: false, down: false, left: false, right: false },
    isBot: true,
    role: "SUPPORT",
    energy: ENERGY_MAX
  };
}

function createPracticeBots(room, teammates, opponents) {
  const allyCount = Math.max(0, Math.min(10, teammates));
  const enemyCount = Math.max(1, Math.min(11, opponents));

  room.practiceConfig = { teammates: allyCount, opponents: enemyCount };

  // Bot dong doi (Do): rải deu ben trai va khu giua.
  for (let i = 0; i < allyCount; i += 1) {
    const id = `practice_red_bot_${i + 1}`;
    room.players[id] = {
      id,
      name: `RED_BOT_${i + 1}`,
      team: TEAM_RED,
      color: TEAM_COLORS[TEAM_RED],
      x: 180 + (i % 3) * 85,
      y: 90 + Math.floor(i / 3) * 85,
      radius: PLAYER_RADIUS,
      speed: BOT_SPEED,
      direction: { dx: 1, dy: 0 },
      input: { up: false, down: false, left: false, right: false },
      isBot: true,
      role: "SUPPORT",
      energy: ENERGY_MAX
    };
  }

  // Bot doi thu (Xanh): rải deu ben phai.
  for (let i = 0; i < enemyCount; i += 1) {
    const id = `practice_blue_bot_${i + 1}`;
    room.players[id] = {
      id,
      name: `BLUE_BOT_${i + 1}`,
      team: TEAM_BLUE,
      color: TEAM_COLORS[TEAM_BLUE],
      x: 520 + (i % 3) * 75,
      y: 85 + Math.floor(i / 3) * 78,
      radius: PLAYER_RADIUS,
      speed: BOT_SPEED,
      direction: { dx: -1, dy: 0 },
      input: { up: false, down: false, left: false, right: false },
      isBot: true,
      role: "PRESS",
      energy: ENERGY_MAX
    };
  }
}

function buildRoomGameState(room) {
  return {
    players: room.players,
    ball: room.ball,
    field: { width: FIELD_WIDTH, height: FIELD_HEIGHT },
    match: {
      phase: room.match.phase,
      notice: room.match.notice,
      setPiece: room.match.setPiece
        ? {
            type: room.match.setPiece.type,
            team: room.match.setPiece.team,
            takerId: room.match.setPiece.takerId
          }
        : null,
      duel: room.match.duel
        ? {
            holderId: room.match.duel.holderId,
            challengerId: room.match.duel.challengerId,
            questionId: room.match.duel.questionId
          }
        : null
    },
    ballHolderId: room.ballHolderId,
    score: room.score
  };
}

function updatePlayerMovement(player) {
  let dx = 0;
  let dy = 0;

  if (player.input.left) dx -= 1;
  if (player.input.right) dx += 1;
  if (player.input.up) dy -= 1;
  if (player.input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    const ndx = dx / length;
    const ndy = dy / length;

    player.direction.dx = ndx;
    player.direction.dy = ndy;
    player.x += ndx * player.speed;
    player.y += ndy * player.speed;
  }

  // Khoa vi tri: thu mon trong vong cam, cau thu khac trong bien san.
  applyMovementBounds(player);
}

function updateBotAI(room, bot) {
  // Bot AI co ban: huong ve bong; thu mon chi duoi theo muc tieu trong vong cam.
  const target = room.ballHolderId ? room.players[room.ballHolderId] || room.ball : room.ball;
  let targetX = target.x;
  let targetY = target.y;

  if (bot.role === "GK") {
    const projected = projectPointIntoPenalty(bot.team, targetX, targetY, bot.radius);
    targetX = projected.x;
    targetY = projected.y;
  }

  const dx = targetX - bot.x;
  const dy = targetY - bot.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 2) {
    bot.input = { up: false, down: false, left: false, right: false };
    return;
  }

  const ndx = dx / distance;
  const ndy = dy / distance;
  bot.direction.dx = ndx;
  bot.direction.dy = ndy;
  bot.x += ndx * bot.speed;
  bot.y += ndy * bot.speed;
  applyMovementBounds(bot);
}

function moveBotToward(bot, targetX, targetY, speedScale = 1) {
  // Thu mon: chi di ve diem da chieu vao trong vong cam.
  if (bot.role === "GK") {
    const projected = projectPointIntoPenalty(bot.team, targetX, targetY, bot.radius);
    targetX = projected.x;
    targetY = projected.y;
  }

  const dx = targetX - bot.x;
  const dy = targetY - bot.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1.5) return;

  const nx = dx / distance;
  const ny = dy / distance;
  bot.direction.dx = nx;
  bot.direction.dy = ny;
  bot.x += nx * bot.speed * speedScale;
  bot.y += ny * bot.speed * speedScale;
  applyMovementBounds(bot);
}

function updatePracticeBotAI(room, bot) {
  const human = room.practiceOwnerId ? room.players[room.practiceOwnerId] : null;
  const holder = room.ballHolderId ? room.players[room.ballHolderId] : null;

  if (bot.team === TEAM_BLUE) {
    // Bot doi thu: uu tien ap sat bong/cuop bong.
    moveBotToward(bot, room.ball.x, room.ball.y, 1);
    return;
  }

  // Bot dong doi (Do): ho tro nguoi choi.
  if (holder && human && holder.id === human.id) {
    // Khi nguoi choi dang cam bong, bot dong doi chay cho tim khoang trong.
    const spacingIndex = Number(bot.id.split("_").pop() || "1");
    const laneY = 90 + (spacingIndex % 5) * 80;
    const targetX = 280 + (spacingIndex % 3) * 80;
    moveBotToward(bot, targetX, laneY, 0.85);
    return;
  }

  // Neu khong, bot dong doi hoi tu ve bong.
  moveBotToward(bot, room.ball.x, room.ball.y, 0.92);
}

function updateBallToHolder(room) {
  const holder = room.ballHolderId ? room.players[room.ballHolderId] : null;
  if (!holder) return;

  const dirX = holder.direction.dx || 1;
  const dirY = holder.direction.dy || 0;
  const length = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / length;
  const ny = dirY / length;

  // Khong clamp theo bien san o day de trong tai co the bat bong ra bien dung luat.
  room.ball.x = holder.x + nx * DRIBBLE_DISTANCE;
  room.ball.y = holder.y + ny * DRIBBLE_DISTANCE;
  room.ball.vx = 0;
  room.ball.vy = 0;
  room.lastTouchTeam = holder.team;
  room.lastTouchPlayerId = holder.id;
}

function captureBallIfTouching(room) {
  if (room.ballHolderId) return;
  if (room.match.phase !== "PLAYING") return;

  for (const player of Object.values(room.players)) {
    const distance = getDistance(player, room.ball);
    if (distance <= player.radius + BALL_RADIUS) {
      if (room.gameMode === "1vsBot" && player.team === TEAM_BLUE && player.isBot) {
        // Trong mode 1vsMay, bot khong tu y doi nguoi dan bong trong cung doi.
        // Chi bot dang giu quyen hoac bot duoc chi dinh nhan chuyen moi duoc nhan bong.
        if (room.botPassTargetId) {
          if (player.id !== room.botPassTargetId) continue;
        } else if (room.botCarrierId && player.id !== room.botCarrierId) {
          continue;
        }
      }

      room.ballHolderId = player.id;
      updateBallToHolder(room);
      if (room.gameMode === "1vsBot") {
        if (player.team === TEAM_BLUE && player.isBot) {
          room.botCarrierId = player.id;
          room.botPassTargetId = null;
        } else {
          room.botCarrierId = null;
          room.botPassTargetId = null;
        }
      }
      return;
    }
  }
}

function getOpponentTeam(team) {
  return team === TEAM_RED ? TEAM_BLUE : TEAM_RED;
}

function getNearestPlayerInTeam(room, team, spot) {
  const teamPlayers = Object.values(room.players).filter((player) => player.team === team);
  if (teamPlayers.length === 0) return null;

  return teamPlayers.reduce((nearest, player) => {
    if (!nearest) return player;
    return getDistance(player, spot) < getDistance(nearest, spot) ? player : nearest;
  }, null);
}

function getSetPieceTaker(room, team, spot, type) {
  let candidates = Object.values(room.players).filter((player) => player.team === team);
  if (candidates.length === 0) return null;

  if (type === "THROW_IN" || type === "CORNER_KICK") {
    const fieldPlayers = candidates.filter((player) => player.role !== "GK");
    if (fieldPlayers.length > 0) candidates = fieldPlayers;
  }

  // Uu tien nguoi choi that gan diem da phat; neu chi co bot thi chon bot gan nhat.
  const humans = candidates.filter((player) => !player.isBot);
  const pool = humans.length > 0 ? humans : candidates;

  return pool.reduce((nearest, player) => {
    if (!nearest) return player;
    return getDistance(player, spot) < getDistance(nearest, spot) ? player : nearest;
  }, null);
}

function finishSetPieceKick(room, taker, speed) {
  room.match.notice = `${taker.team === TEAM_RED ? "Doi Do" : "Doi Xanh"} dua bong tro lai tran dau`;
  room.match.phase = "PLAYING";
  room.match.setPiece = null;
  room.lastTouchTeam = taker.team;
  room.lastTouchPlayerId = taker.id;
}

function botExecuteSetPiece(room) {
  const setPiece = room.match.setPiece;
  if (!setPiece) return;

  const taker = room.players[setPiece.takerId];
  if (!taker?.isBot) return;

  const elapsed = Date.now() - (setPiece.startAt || 0);
  if (elapsed < 700) return;

  const { type, spot } = setPiece;
  const goalCenterY = (GOAL_Y_MIN + GOAL_Y_MAX) / 2;

  if (type === "THROW_IN") {
    if (room.ballHolderId !== taker.id) {
      room.ballHolderId = taker.id;
      updateBallToHolder(room);
    }
    const inwardY = spot.y <= PLAY_MIN_Y + 1 ? spot.y + 130 : spot.y - 130;
    const targetX = clamp(
      taker.x + (taker.team === TEAM_RED ? 90 : -90),
      PLAY_MIN_X + 40,
      PLAY_MAX_X - 40
    );
    kickBallToward(room, targetX, inwardY, THROW_IN_SPEED, taker.team, taker.id);
    finishSetPieceKick(room, taker, THROW_IN_SPEED);
    return;
  }

  if (type === "CORNER_KICK") {
    const goalX = taker.team === TEAM_RED ? PLAY_MAX_X : PLAY_MIN_X;
    kickBallToward(room, goalX, goalCenterY, SHOOT_SPEED, taker.team, taker.id);
    finishSetPieceKick(room, taker, SHOOT_SPEED);
    return;
  }

  if (type === "GOAL_KICK") {
    const dirX = taker.team === TEAM_RED ? 1 : -1;
    kickBallToward(
      room,
      taker.x + dirX * 220,
      goalCenterY,
      BALL_FREE_SPEED,
      taker.team,
      taker.id
    );
    finishSetPieceKick(room, taker, BALL_FREE_SPEED);
  }
}

function freezeAllInputs(room) {
  Object.values(room.players).forEach((player) => {
    player.input = { up: false, down: false, left: false, right: false };
  });
}

function startSetPiece(room, type, awardedTeam, rawSpot, notice) {
  const spot = {
    x: clamp(rawSpot.x, 0, FIELD_WIDTH),
    y: clamp(rawSpot.y, 0, FIELD_HEIGHT)
  };

  // Nem bien / phat goc: uu tien nguoi choi that gan diem da phat.
  // Phat bong len: van uu tien nguoi gan diem da phat.
  const taker =
    type === "THROW_IN" || type === "CORNER_KICK"
      ? getSetPieceTaker(room, awardedTeam, spot, type)
      : getNearestPlayerInTeam(room, awardedTeam, spot);
  const takerId = taker ? taker.id : null;

  room.match.phase = type;
  room.match.duel = null;
  room.match.gkDuel = null;
  room.match.notice = notice;
  room.match.setPiece = {
    type,
    team: awardedTeam,
    takerId,
    spot,
    startAt: Date.now()
  };

  room.ballHolderId = null;
  room.ball.x = spot.x;
  room.ball.y = spot.y;
  room.ball.vx = 0;
  room.ball.vy = 0;
  room.lastTouchPlayerId = null;
  room.botPassTargetId = null;
  freezeAllInputs(room);

  if (taker) {
    if (type === "THROW_IN") {
      const onTopSideline = spot.y <= PLAY_MIN_Y + 1;
      taker.x = clamp(spot.x, PLAY_MIN_X + taker.radius, PLAY_MAX_X - taker.radius);
      taker.y = clamp(
        onTopSideline ? PLAY_MIN_Y + taker.radius : PLAY_MAX_Y - taker.radius,
        PLAY_MIN_Y + taker.radius,
        PLAY_MAX_Y - taker.radius
      );
      taker.direction = { dx: 0, dy: onTopSideline ? 1 : -1 };
      room.ballHolderId = taker.id;
      updateBallToHolder(room);
    } else {
      taker.x = clamp(spot.x + (awardedTeam === TEAM_RED ? -18 : 18), taker.radius, FIELD_WIDTH - taker.radius);
      taker.y = clamp(spot.y, taker.radius, FIELD_HEIGHT - taker.radius);
    }
  }
}

function startLiveBall(room, bySocketId, socket) {
  if (!room.match.setPiece || room.match.setPiece.takerId !== bySocketId) return;

  const taker = room.players[bySocketId];
  if (!taker) return;
  const setPieceType = room.match.setPiece.type;
  if ((setPieceType === "THROW_IN" || setPieceType === "CORNER_KICK") && !consumeEnergy(taker, SET_PIECE_ENERGY_COST)) {
    emitActionDenied(socket, "Khong du energy de thuc hien tinh huong bong chet.");
    return;
  }

  const dirX = taker.direction.dx || (taker.team === TEAM_RED ? 1 : -1);
  const dirY = taker.direction.dy || 0;
  const length = Math.hypot(dirX, dirY) || 1;
  const restartSpeed =
    setPieceType === "THROW_IN" ? THROW_IN_SPEED : setPieceType === "CORNER_KICK" ? SHOOT_SPEED : BALL_FREE_SPEED;

  room.ballHolderId = null;
  room.ball.vx = (dirX / length) * restartSpeed;
  room.ball.vy = (dirY / length) * restartSpeed;
  finishSetPieceKick(room, taker, restartSpeed);
}

function handleBoundaryChecks(room) {
  if (room.match.phase !== "PLAYING") return;

  // Neu dang co nguoi dan bong thi dung vi tri bong dang bam theo nguoi do de xet ra bien.
  const outX = room.ball.x;
  const outY = room.ball.y;
  const isOutVertical = outY < PLAY_MIN_Y || outY > PLAY_MAX_Y;
  const isOutHorizontal = outX < PLAY_MIN_X || outX > PLAY_MAX_X;
  if (!isOutVertical && !isOutHorizontal) return;

  const holder = room.ballHolderId ? room.players[room.ballHolderId] : null;
  const lastTouchTeam = (holder?.team || room.lastTouchTeam || TEAM_RED);

  // Nem bien: bong qua bien doc.
  if (isOutVertical) {
    const awardedTeam = getOpponentTeam(lastTouchTeam);
    const spot = {
      x: clamp(outX, PLAY_MIN_X, PLAY_MAX_X),
      y: outY < PLAY_MIN_Y ? PLAY_MIN_Y : PLAY_MAX_Y
    };
    startSetPiece(
      room,
      "THROW_IN",
      awardedTeam,
      spot,
      `${awardedTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} duoc huong nem bien!`
    );
    return;
  }

  // Qua bien ngang va KHONG vao khung thanh => phat goc hoac phat bong len.
  const inGoalMouth = outY >= GOAL_Y_MIN && outY <= GOAL_Y_MAX;
  if (isOutHorizontal && inGoalMouth) {
    const scoredTeam = outX < PLAY_MIN_X ? TEAM_BLUE : TEAM_RED;
    room.match.notice = `Vaoo! ${scoredTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} ghi ban!`;
    room.match.phase = "PLAYING";
    room.match.setPiece = null;
    room.ballHolderId = null;
    room.ball.x = FIELD_WIDTH / 2;
    room.ball.y = FIELD_HEIGHT / 2;
    room.ball.vx = 0;
    room.ball.vy = 0;
    room.lastTouchPlayerId = null;
    room.botCarrierId = null;
    room.botPassTargetId = null;
    return;
  }

  if (isOutHorizontal && !inGoalMouth) {
    const exitOnLeft = outX < PLAY_MIN_X;
    const attackingTeam = exitOnLeft ? TEAM_BLUE : TEAM_RED;
    const defendingTeam = getOpponentTeam(attackingTeam);

    if (lastTouchTeam === defendingTeam) {
      const awardedTeam = attackingTeam;
      const cornerSpot = {
        x: exitOnLeft ? PLAY_MIN_X : PLAY_MAX_X,
        y: outY < FIELD_HEIGHT / 2 ? PLAY_MIN_Y : PLAY_MAX_Y
      };
      startSetPiece(
        room,
        "CORNER_KICK",
        awardedTeam,
        cornerSpot,
        `${awardedTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} duoc huong phat goc!`
      );
    } else {
      const awardedTeam = defendingTeam;
      const goalKickSpot = {
        x: exitOnLeft ? PLAY_MIN_X + 60 : PLAY_MAX_X - 60,
        y: FIELD_HEIGHT / 2
      };
      startSetPiece(
        room,
        "GOAL_KICK",
        awardedTeam,
        goalKickSpot,
        `${awardedTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} duoc huong phat bong len!`
      );
    }
  }
}

function updateFreeBall(room) {
  if (room.ballHolderId || room.match.phase !== "PLAYING") return;

  room.ball.x += room.ball.vx;
  room.ball.y += room.ball.vy;
  room.ball.vx *= 0.985;
  room.ball.vy *= 0.985;

  if (Math.abs(room.ball.vx) < 0.06) room.ball.vx = 0;
  if (Math.abs(room.ball.vy) < 0.06) room.ball.vy = 0;
}

function kickBallToward(room, toX, toY, speed, byTeam, byPlayerId = null, targetPlayerId = null) {
  const dx = toX - room.ball.x;
  const dy = toY - room.ball.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) return;

  // Chuan hoa vector huong roi nhan voi toc do co dinh de bong bay deu.
  const nx = dx / length;
  const ny = dy / length;

  room.ballHolderId = null;
  room.ball.vx = nx * speed;
  room.ball.vy = ny * speed;
  room.lastTouchTeam = byTeam;
  room.lastTouchPlayerId = byPlayerId;

  if (room.gameMode === "1vsBot" && byTeam === TEAM_BLUE) {
    // Bot da thuc hien hanh dong voi bong.
    room.botCarrierId = byPlayerId || room.botCarrierId;
    room.botPassTargetId = targetPlayerId;
  } else if (room.gameMode === "1vsBot" && byTeam === TEAM_RED) {
    room.botPassTargetId = null;
  }
}

function getGoalkeeperForTeam(room, team) {
  const players = Object.values(room.players).filter((p) => p.team === team);
  if (players.length === 0) return null;
  const roleKeeper = players.find((p) => p.role === "GK");
  if (roleKeeper) return roleKeeper;

  const goalX = team === TEAM_RED ? PLAY_MIN_X : PLAY_MAX_X;
  return players.reduce((best, p) => {
    if (!best) return p;
    return Math.abs(p.x - goalX) < Math.abs(best.x - goalX) ? p : best;
  }, null);
}

function startGKDuel(room, shooter, defendingTeam) {
  const goalkeeper = getGoalkeeperForTeam(room, defendingTeam);
  if (!goalkeeper) return false;

  const question = pickRandomQuestion();
  room.match.phase = "GK_DUEL";
  room.match.notice = "GK Duel dang dien ra";
  room.match.gkDuel = {
    duelId: `gk-${room.id}-${Date.now()}`,
    shooterId: shooter.id,
    goalkeeperId: goalkeeper.id,
    correctAnswer: question.correctAnswer,
    startAt: Date.now(),
    answers: {}
  };
  freezeAllInputs(room);

  const payload = {
    duelId: room.match.gkDuel.duelId,
    question: {
      id: question.id,
      text: question.text,
      options: question.options
    },
    shooterId: shooter.id,
    goalkeeperId: goalkeeper.id
  };

  if (!shooter.isBot) io.to(shooter.id).emit("start-gk-duel", payload);
  if (!goalkeeper.isBot) io.to(goalkeeper.id).emit("start-gk-duel", payload);
  return true;
}

function finishGKDuel(room, winnerId = null, reason = "timeout") {
  const gk = room.match.gkDuel;
  if (!gk) return;
  const shooter = room.players[gk.shooterId];
  const keeper = room.players[gk.goalkeeperId];
  const attackingTeam = shooter?.team || TEAM_RED;
  const defendingTeam = attackingTeam === TEAM_RED ? TEAM_BLUE : TEAM_RED;

  if (winnerId && shooter && winnerId === shooter.id) {
    room.score[attackingTeam] += 1;
    room.match.notice = "GOAL! Nguoi sut thang GK Duel";
    room.ballHolderId = null;
    room.ball.x = FIELD_WIDTH / 2;
    room.ball.y = FIELD_HEIGHT / 2;
    room.ball.vx = 0;
    room.ball.vy = 0;
  } else if (winnerId && keeper && winnerId === keeper.id) {
    room.match.notice = "Thu mon can pha thanh cong";
    room.ballHolderId = keeper.id;
    room.ball.vx = 0;
    room.ball.vy = 0;
    updateBallToHolder(room);
  } else {
    const cornerForTeam = attackingTeam;
    const cornerSpot = {
      x: cornerForTeam === TEAM_RED ? PLAY_MAX_X : PLAY_MIN_X,
      y: FIELD_HEIGHT / 2 < GOAL_Y_MIN ? PLAY_MIN_Y : PLAY_MAX_Y
    };
    startSetPiece(
      room,
      "CORNER_KICK",
      cornerForTeam,
      cornerSpot,
      `${cornerForTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} duoc huong phat goc sau GK Duel`
    );
  }

  room.match.gkDuel = null;
  if (room.match.phase === "GK_DUEL") {
    room.match.phase = room.match.setPiece ? room.match.setPiece.type : "PLAYING";
  }

  io.to(room.id).emit("gk-duel-result", { winnerId, reason, score: room.score });
  io.to(room.id).emit("gameState", buildRoomGameState(room));
  void defendingTeam;
}

function startDuel(room) {
  if (room.match.phase !== "PLAYING" || room.match.setPiece || !room.ballHolderId) return;

  const holder = room.players[room.ballHolderId];
  if (!holder) {
    room.ballHolderId = null;
    return;
  }

  const challenger = Object.values(room.players).find((player) => {
    if (player.id === holder.id) return false;
    if (player.team === holder.team) return false;
    return getDistance(player, holder) < DUEL_TRIGGER_DISTANCE;
  });

  if (!challenger) return;

  // Neu la bot vs bot: khong kich hoat quiz duel.
  // Chon ngau nhien nguoi giu bong de tran dau dien ra lien tuc, khong dung nhip.
  if (holder.isBot && challenger.isBot) {
    const randomWinner = Math.random() < 0.5 ? holder : challenger;
    room.ballHolderId = randomWinner.id;
    room.lastTouchTeam = randomWinner.team;
    room.lastTouchPlayerId = randomWinner.id;

    if (room.gameMode === "1vsBot" && randomWinner.team === TEAM_BLUE) {
      room.botCarrierId = randomWinner.id;
      room.botPassTargetId = null;
    } else if (room.gameMode === "1vsBot") {
      room.botCarrierId = null;
      room.botPassTargetId = null;
    }
    return;
  }

  const question = pickRandomQuestion();
  const startAt = Date.now();

  room.match.phase = "DUEL";
  room.match.duel = {
    holderId: holder.id,
    challengerId: challenger.id,
    questionId: question.id,
    correctAnswer: question.correctAnswer,
    startAt,
    answers: {},
    botOnlyDuel: Boolean(holder.isBot || challenger.isBot),
    botParticipantId: holder.isBot ? holder.id : challenger.isBot ? challenger.id : null
  };

  const duelPayload = {
    duelId: `${room.id}-${question.id}-${startAt}`,
    question: {
      id: question.id,
      text: question.text,
      options: question.options
    },
    players: [holder.id, challenger.id]
  };

  if (!holder.isBot) {
    io.to(holder.id).emit("start-duel", duelPayload);
  }
  if (!challenger.isBot) {
    io.to(challenger.id).emit("start-duel", duelPayload);
  }

  // Duel voi bot: chi gui cau hoi cho nguoi choi that.
  // Neu nguoi choi tra loi dung => gianh bong.
  // Neu sai/het gio => bot gianh bong.
}

function pushLoserAway(winner, loser) {
  const dx = loser.x - winner.x;
  const dy = loser.y - winner.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;

  loser.x = clamp(loser.x + nx * 50, loser.radius, FIELD_WIDTH - loser.radius);
  loser.y = clamp(loser.y + ny * 50, loser.radius, FIELD_HEIGHT - loser.radius);
}

function finishDuel(room, winnerId = null, reason = "finished") {
  const duel = room.match.duel;
  if (!duel) return;

  const holder = room.players[duel.holderId];
  const challenger = room.players[duel.challengerId];

  if (winnerId && holder && challenger) {
    if (winnerId === duel.holderId) {
      room.ballHolderId = duel.holderId;
    } else if (winnerId === duel.challengerId) {
      room.ballHolderId = duel.challengerId;
      pushLoserAway(challenger, holder);
    }
  } else {
    room.ballHolderId = duel.holderId;
  }

  room.match.phase = "PLAYING";
  room.match.duel = null;
  room.match.notice = "";

  io.to(room.id).emit("duel-result", {
    winnerId,
    holderIdAfterDuel: room.ballHolderId,
    reason
  });
}

function updateRoom(room) {
  if (room.match.phase === "PLAYING") {
    const allPlayers = Object.values(room.players);
    let pressureBots = null;

    if (room.gameMode !== "practice") {
      const bots = allPlayers.filter((p) => p.isBot);
      const pressureBotCount = Math.min(3, bots.length);
      const sortedBotsByBall = [...bots].sort(
        (a, b) => getDistance(a, room.ball) - getDistance(b, room.ball)
      );
      pressureBots = new Set(sortedBotsByBall.slice(0, pressureBotCount).map((bot) => bot.id));
    }

    for (const player of allPlayers) {
      if (player.isBot) {
        if (room.gameMode === "practice") {
          updatePracticeBotAI(room, player);
        } else {
          if (pressureBots?.has(player.id)) {
            // Nhom bot gan bong nhat se ap sat de tao suc ep lien tuc.
            updateBotAI(room, player);
          } else {
            // Bot xa bong giu vi tri va dich chuyen nhe theo bo cuc.
            const homeX =
              player.role === "GK"
                ? player.team === TEAM_RED
                  ? (PENALTY_RED_MIN_X + PENALTY_RED_MAX_X) / 2
                  : (PENALTY_BLUE_MIN_X + PENALTY_BLUE_MAX_X) / 2
                : player.role === "DF"
                  ? 655
                  : player.role === "MF"
                    ? 565
                    : 480;
            const dx = homeX - player.x;
            const moveX = Math.sign(dx) * Math.min(Math.abs(dx), 0.7);
            player.x += moveX;
            applyMovementBounds(player);
          }
        }
      } else {
        updatePlayerMovement(player);
      }
    }
    updateFreeBall(room);
    captureBallIfTouching(room);
    handleBoundaryChecks(room);
    updateBallToHolder(room);

    // Bot doi thu dang giu bong va da ap sat vong cam Doi Do => tu dong sut.
    const holder = room.ballHolderId ? room.players[room.ballHolderId] : null;
    if (holder?.isBot && holder.team === TEAM_BLUE && holder.x < 170) {
      kickBallToward(
        room,
        0,
        (GOAL_Y_MIN + GOAL_Y_MAX) / 2,
        SHOOT_SPEED,
        TEAM_BLUE,
        holder.id,
        null
      );
    }

    // Practice: bot dong doi nhan bong thi uu tien chuyen lai cho nguoi choi that.
    if (room.gameMode === "practice" && holder?.isBot && holder.team === TEAM_RED) {
      const human = room.practiceOwnerId ? room.players[room.practiceOwnerId] : null;
      if (human) {
        const distToHuman = getDistance(holder, human);
        if (distToHuman < 340) {
          kickBallToward(room, human.x, human.y, PASS_SPEED, TEAM_RED, holder.id, human.id);
        } else if (holder.x > FIELD_WIDTH - 190) {
          // Neu khong thay phuong an chuyen, bot tu sut khi da tien sat khung thanh doi Xanh.
          kickBallToward(room, FIELD_WIDTH, (GOAL_Y_MIN + GOAL_Y_MAX) / 2, SHOOT_SPEED, TEAM_RED, holder.id);
        }
      }
    }

    startDuel(room);
  } else if (room.match.duel) {
    const elapsed = Date.now() - room.match.duel.startAt;
    if (elapsed >= DUEL_TIMEOUT_MS) {
      if (room.match.duel.botOnlyDuel && room.match.duel.botParticipantId) {
        finishDuel(room, room.match.duel.botParticipantId, "timeout-bot-wins");
      } else {
        finishDuel(room, null, "timeout");
      }
    }
  } else if (room.match.phase === "GK_DUEL" && room.match.gkDuel) {
    const elapsed = Date.now() - room.match.gkDuel.startAt;
    if (elapsed >= GK_DUEL_TIMEOUT_MS) {
      finishGKDuel(room, null, "timeout-corner");
    }
  } else if (room.match.setPiece) {
    // Bong chet: chi cho phep cau thu thuc hien da phat di chuyen.
    const takerId = room.match.setPiece.takerId;
    Object.values(room.players).forEach((player) => {
      if (player.id !== takerId) {
        player.input = { up: false, down: false, left: false, right: false };
      }
    });
    if (takerId && room.players[takerId]) {
      const taker = room.players[takerId];
      if (taker.isBot) {
        updateBotAI(room, taker);
        botExecuteSetPiece(room);
      } else {
        updatePlayerMovement(taker);
      }
    }
    if (room.match.setPiece?.type === "THROW_IN" && room.ballHolderId) {
      updateBallToHolder(room);
    }
  }

  io.to(room.id).emit("gameState", buildRoomGameState(room));
}

function removePlayerFromRoom(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socketId);
    return;
  }

  const removedPlayer = room.players[socketId];
  delete room.players[socketId];
  socketToRoom.delete(socketId);

  if (!removedPlayer) return;

  if (room.ballHolderId === socketId) {
    room.ballHolderId = null;
    room.ball.x = FIELD_WIDTH / 2;
    room.ball.y = FIELD_HEIGHT / 2;
    room.ball.vx = 0;
    room.ball.vy = 0;
    room.lastTouchPlayerId = null;
  }

  if (room.botCarrierId === socketId) {
    room.botCarrierId = null;
  }
  if (room.botPassTargetId === socketId) {
    room.botPassTargetId = null;
  }

  if (room.match.phase === "DUEL" && room.match.duel) {
    const { holderId, challengerId } = room.match.duel;
    if (socketId === holderId || socketId === challengerId) {
      const winnerId = socketId === holderId ? challengerId : holderId;
      if (room.players[winnerId]) {
        finishDuel(room, winnerId, "opponent-disconnected");
      } else {
        finishDuel(room, null, "duel-cancelled");
      }
    }
  }

  if (Object.keys(room.players).length === 0) {
    rooms.delete(roomId);
  } else {
    if (room.gameMode === "1vsBot") {
      const humanCount = Object.values(room.players).filter((player) => !player.isBot).length;
      if (humanCount === 0) {
        rooms.delete(roomId);
      }
    }
    if (room.gameMode === "practice") {
      const humanCount = Object.values(room.players).filter((player) => !player.isBot).length;
      if (humanCount === 0) {
        rooms.delete(roomId);
      }
    }
    if (room.gameMode === "1vs11") {
      const humanCount = Object.values(room.players).filter((player) => !player.isBot).length;
      if (humanCount === 0) {
        rooms.delete(roomId);
      }
    }
    io.to(roomId).emit("playerLeft", socketId);
  }

  emitRoomListToAll();
}

function joinRoom(socket, roomId, playerName, preferredTeam) {
  const room = rooms.get(roomId);
  if (!room) {
    socket.emit("room-error", { message: "Phong khong ton tai." });
    return;
  }

  let team = null;
  const humanPlayers = Object.values(room.players).filter((player) => !player.isBot);

  if (room.gameMode === "1vsBot") {
    // 1vsMay: phong chi cho 1 nguoi that doi dau 11 bot.
    if (humanPlayers.length >= 1) {
      socket.emit("room-full", { message: "Che do 1 vs May chi cho phep 1 nguoi choi." });
      return;
    }
    team = TEAM_RED;
  } else if (room.gameMode === "practice") {
    // Practice: phong tap chi 1 nguoi choi that.
    if (humanPlayers.length >= 1) {
      socket.emit("room-full", { message: "Phong Practice chi cho phep 1 nguoi choi that." });
      return;
    }
    team = TEAM_RED;
  } else {
    // 11vs11: nguoi choi tu chon doi; doi day thi chi cho phep doi con lai.
    if (Object.keys(room.players).length >= MAX_PLAYERS) {
      socket.emit("room-full", { message: "Phong da du 22 nguoi choi." });
      return;
    }
    const resolved = resolvePreferredTeam(room, preferredTeam);
    if (!resolved.team) {
      socket.emit("room-full", { message: resolved.error });
      return;
    }
    team = resolved.team;
  }

  removePlayerFromRoom(socket.id);

  const player = createPlayer(socket.id, room, team, playerName);
  room.players[socket.id] = player;
  socketToRoom.set(socket.id, room.id);
  socket.join(room.id);

  socket.emit("init", {
    myId: socket.id,
    ...buildRoomGameState(room)
  });

  io.to(room.id).emit("playerJoined", player);

  // Che do 1vsMay: tao ngay 11 bot ben doi Xanh neu phong chua co bot.
  if (room.gameMode === "1vsBot") {
    const hasBot = Object.values(room.players).some((p) => p.isBot);
    if (!hasBot) {
      createBossRaidBots(room);
      createCompanionBot(room);
      Object.values(room.players)
        .filter((p) => p.isBot)
        .forEach((bot) => io.to(room.id).emit("playerJoined", bot));
    }
  }

  if (room.gameMode === "practice") {
    room.practiceOwnerId = socket.id;
    const hasPracticeBot = Object.values(room.players).some((p) => String(p.id).startsWith("practice_"));
    if (!hasPracticeBot) {
      createPracticeBots(room, room.practiceConfig.teammates, room.practiceConfig.opponents);
      Object.values(room.players)
        .filter((p) => p.isBot)
        .forEach((bot) => io.to(room.id).emit("playerJoined", bot));
    }
  }

  emitRoomListToAll();
}

io.on("connection", (socket) => {
  socket.emit("room-list", getRoomListPayload());

  socket.on("set-player-profile", ({ playerName }) => {
    socketProfiles.set(socket.id, {
      playerName: String(playerName || "").trim()
    });
  });

  socket.on("request-room-list", () => {
    socket.emit("room-list", getRoomListPayload());
  });

  socket.on("request-room-info", ({ roomId }) => {
    const normalizedId = String(roomId || "").trim();
    const room = rooms.get(normalizedId);
    if (!room) {
      socket.emit("room-info", { exists: false, roomId: normalizedId });
      return;
    }
    socket.emit("room-info", {
      exists: true,
      roomId: room.id,
      name: room.name,
      gameMode: room.gameMode,
      players: Object.keys(room.players).length,
      capacity: MAX_PLAYERS,
      ...getTeamAvailability(room)
    });
  });

  socket.on("create-room", ({ roomId, playerName, gameMode, preferredTeam, autoJoin = true }) => {
    let finalRoomId =
      String(roomId || "").trim() || `room-${Date.now()}-${++roomCounter}`;
    // Chap nhan ca gia tri cu de tranh vo tuong thich.
    let normalizedMode = "11vs11";
    if (gameMode === "1vsBot") normalizedMode = "1vsBot";
    if (gameMode === "11vs11" || gameMode === "1vs11" || gameMode === "Custom") {
      normalizedMode = "11vs11";
    }
    if (gameMode === "practice" || gameMode === "Practice") {
      normalizedMode = "practice";
    }

    // 11 vs 11 luon su dung 1 phong duy nhat gom 22 nguoi (11/11).
    if (normalizedMode === "11vs11") {
      finalRoomId = FIXED_11VS11_ROOM_ID;
    }

    const roomName = normalizedMode === "11vs11" ? "Phong 11 vs 11" : `Phong ${finalRoomId}`;

    if (!rooms.has(finalRoomId)) {
      const newRoom = createEmptyRoom(finalRoomId, roomName);
      newRoom.gameMode = normalizedMode;
      rooms.set(finalRoomId, newRoom);
    }

    // Neu autoJoin = false: chi tao phong, khong vao tran dau.
    if (autoJoin === false) {
      emitRoomListToAll();
      socket.emit("room-created", {
        exists: true,
        roomId: finalRoomId
      });
      return;
    }

    const profileName = socketProfiles.get(socket.id)?.playerName;
    joinRoom(socket, finalRoomId, playerName || profileName, preferredTeam);
  });

  socket.on("create-practice-room", ({ playerName, teammates, opponents }) => {
    const finalRoomId = `practice-${Date.now()}-${++roomCounter}`;
    const roomName = `San tap ${finalRoomId}`;
    const room = createEmptyRoom(finalRoomId, roomName);
    room.gameMode = "practice";
    room.practiceConfig = {
      teammates: Math.max(0, Math.min(10, Number(teammates) || 0)),
      opponents: Math.max(1, Math.min(11, Number(opponents) || 1))
    };
    rooms.set(finalRoomId, room);

    const profileName = socketProfiles.get(socket.id)?.playerName;
    joinRoom(socket, finalRoomId, playerName || profileName);
  });

  socket.on("join-room", ({ roomId, playerName, preferredTeam }) => {
    const profileName = socketProfiles.get(socket.id)?.playerName;
    joinRoom(socket, String(roomId || "").trim(), playerName || profileName, preferredTeam);
  });

  // 11vs11: vao phong tu dong (khong can nhap ma phong).
  // Server se chon 1 phong con slot, uu tien phong ma doi nguoi choi dang chon con du slot.
  socket.on("join-any-room", ({ gameMode, playerName, preferredTeam }) => {
    const mode = gameMode === "1vsBot" ? "1vsBot" : gameMode === "practice" ? "practice" : "11vs11";
    if (mode !== "11vs11") {
      socket.emit("room-error", { message: "Chi ho tro join tu dong cho che do 11 vs 11." });
      return;
    }

    const candidates = Array.from(rooms.values())
      .filter((r) => r.gameMode === "11vs11" && Object.keys(r.players).length < MAX_PLAYERS)
      .map((r) => {
        const t = getTeamAvailability(r);
        const preferredAvailable =
          (preferredTeam === TEAM_RED && !t.redFull) || (preferredTeam === TEAM_BLUE && !t.blueFull);
        return { room: r, preferredAvailable, totalPlayers: Object.keys(r.players).length };
      });

    if (candidates.length === 0) {
      socket.emit("room-full", { message: "Chua co phong 11 vs 11 nao con slot." });
      return;
    }

    // Uu tien phong co doi dang chon con slot; sau do uu tien phong co tong so nguoi it hon.
    candidates.sort((a, b) => {
      if (a.preferredAvailable !== b.preferredAvailable) return a.preferredAvailable ? -1 : 1;
      return a.totalPlayers - b.totalPlayers;
    });

    const chosen = candidates[0].room;
    const profileName = socketProfiles.get(socket.id)?.playerName;
    joinRoom(socket, chosen.id, playerName || profileName, preferredTeam);
  });

  // 11vs11: vao phong co dinh duy nhat.
  socket.on("join-fixed-11vs11", ({ playerName, preferredTeam }) => {
    const roomId = FIXED_11VS11_ROOM_ID;
    if (!rooms.has(roomId)) {
      const newRoom = createEmptyRoom(roomId, "Phong 11 vs 11");
      newRoom.gameMode = "11vs11";
      rooms.set(roomId, newRoom);
    }
    const profileName = socketProfiles.get(socket.id)?.playerName;
    joinRoom(socket, roomId, playerName || profileName, preferredTeam);
  });

  // Frontend moi yeu cau su dung su kien move.
  socket.on("move", (inputState) => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    if (room.match.phase !== "PLAYING") {
      const setPiece = room.match.setPiece;
      if (!setPiece || setPiece.takerId !== socket.id) return;
    }

    player.input = {
      up: Boolean(inputState?.up),
      down: Boolean(inputState?.down),
      left: Boolean(inputState?.left),
      right: Boolean(inputState?.right)
    };
  });

  // Tuong thich nguoc voi frontend cu van gui playerInput.
  socket.on("playerInput", (inputState) => {
    socket.emit("server-hint", {
      message: "Nen dung su kien move cho frontend React moi."
    });
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    if (room.match.phase !== "PLAYING") {
      const setPiece = room.match.setPiece;
      if (!setPiece || setPiece.takerId !== socket.id) return;
    }
    player.input = {
      up: Boolean(inputState?.up),
      down: Boolean(inputState?.down),
      left: Boolean(inputState?.left),
      right: Boolean(inputState?.right)
    };
  });

  // Su kien sut/chuyen de dua bong chet tro lai bong song.
  socket.on("kick-ball", () => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room) return;

    // Neu dang bong chet va dung nguoi co quyen da => dua ve PLAYING.
    if (room.match.setPiece) {
      startLiveBall(room, socket.id, socket);
      return;
    }

    // Neu dang choi thuong va cau thu dang dan bong thi cho phep chuyen/sut.
    if (room.match.phase === "PLAYING" && room.ballHolderId === socket.id) {
      const player = room.players[socket.id];
      if (!player) return;

      const dirX = player.direction.dx || (player.team === TEAM_RED ? 1 : -1);
      const dirY = player.direction.dy || 0;
      const length = Math.hypot(dirX, dirY) || 1;
      room.ballHolderId = null;
      room.ball.vx = (dirX / length) * BALL_FREE_SPEED;
      room.ball.vy = (dirY / length) * BALL_FREE_SPEED;
      room.lastTouchTeam = player.team;
      room.lastTouchPlayerId = player.id;
      if (room.gameMode === "1vsBot" && player.team === TEAM_BLUE) {
        room.botCarrierId = player.id;
      } else if (room.gameMode === "1vsBot") {
        room.botPassTargetId = null;
      }
    }
  });

  socket.on("shoot-ball", ({ mouseX, mouseY }) => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room) return;

    const shooter = room.players[socket.id];
    if (!shooter) return;

    const numericX = Number(mouseX);
    const numericY = Number(mouseY);
    if (!Number.isFinite(numericX) || !Number.isFinite(numericY)) return;

    const targetX = clamp(numericX, 0, FIELD_WIDTH);
    const targetY = clamp(numericY, 0, FIELD_HEIGHT);
    const setPiece = room.match.setPiece;

    if (setPiece && setPiece.takerId === socket.id) {
      if (setPiece.type === "THROW_IN") {
        if (room.ballHolderId !== socket.id) return;
        if (!consumeEnergy(shooter, SET_PIECE_ENERGY_COST)) {
          emitActionDenied(socket, "Khong du energy de nem bien.");
          return;
        }
        kickBallToward(room, targetX, targetY, THROW_IN_SPEED, shooter.team, shooter.id);
        finishSetPieceKick(room, shooter, THROW_IN_SPEED);
        return;
      }

      if (setPiece.type === "CORNER_KICK") {
        if (!consumeEnergy(shooter, SET_PIECE_ENERGY_COST)) {
          emitActionDenied(socket, "Khong du energy de thuc hien phat goc.");
          return;
        }
        kickBallToward(room, targetX, targetY, SHOOT_SPEED, shooter.team, shooter.id);
        finishSetPieceKick(room, shooter, SHOOT_SPEED);
        return;
      }
    }

    if (room.match.phase !== "PLAYING") return;
    if (room.ballHolderId !== socket.id) return;

    if (!consumeEnergy(shooter, SHOOT_ENERGY_COST)) {
      emitActionDenied(socket, "Khong du energy de sut bong.");
      return;
    }

    // Neu huong sut vao khung thanh doi thu -> kich hoat GK Duel.
    const towardBlueGoal = shooter.team === TEAM_RED && targetX > FIELD_WIDTH / 2 && targetY >= GOAL_Y_MIN && targetY <= GOAL_Y_MAX;
    const towardRedGoal = shooter.team === TEAM_BLUE && targetX < FIELD_WIDTH / 2 && targetY >= GOAL_Y_MIN && targetY <= GOAL_Y_MAX;
    if (towardBlueGoal || towardRedGoal) {
      const defendingTeam = shooter.team === TEAM_RED ? TEAM_BLUE : TEAM_RED;
      const started = startGKDuel(room, shooter, defendingTeam);
      if (started) return;
    }

    kickBallToward(room, targetX, targetY, SHOOT_SPEED, shooter.team, shooter.id, null);
  });

  socket.on("pass-ball", ({ targetPlayerId }) => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room || room.match.phase !== "PLAYING") return;
    if (room.ballHolderId !== socket.id) return;

    const passer = room.players[socket.id];
    const receiver = room.players[targetPlayerId];
    if (!passer || !receiver) return;
    if (passer.team !== receiver.team) return;
    if (!consumeEnergy(passer, PASS_ENERGY_COST)) {
      emitActionDenied(socket, "Khong du energy de chuyen bong.");
      return;
    }

    // Chuyen bong truc tiep toi dong doi duoc chi dinh.
    kickBallToward(room, receiver.x, receiver.y, PASS_SPEED, passer.team, passer.id, receiver.id);
  });

  socket.on("recharge-energy", () => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    rechargeEnergy(player);
  });

  socket.on("submit-gk-answer", ({ answer }) => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room || room.match.phase !== "GK_DUEL" || !room.match.gkDuel) return;
    const gk = room.match.gkDuel;
    const isParticipant = socket.id === gk.shooterId || socket.id === gk.goalkeeperId;
    if (!isParticipant || !["A", "B", "C", "D"].includes(answer)) return;
    if (gk.answers[socket.id]) return;

    gk.answers[socket.id] = {
      answer,
      submittedAt: Date.now(),
      isCorrect: answer === gk.correctAnswer
    };

    if (gk.answers[socket.id].isCorrect) {
      finishGKDuel(room, socket.id, "correct-fastest");
    }
  });

  socket.on("submit-answer", ({ answer }) => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room || room.match.phase !== "DUEL" || !room.match.duel) return;

    const duel = room.match.duel;
    const isParticipant = socket.id === duel.holderId || socket.id === duel.challengerId;
    if (!isParticipant || !["A", "B", "C", "D"].includes(answer)) return;
    if (duel.answers[socket.id]) return;

    duel.answers[socket.id] = {
      answer,
      submittedAt: Date.now(),
      isCorrect: answer === duel.correctAnswer
    };

    // Neu duel voi bot: chi can ket qua cua nguoi choi.
    // - Tra loi dung => nguoi choi thang.
    // - Tra loi sai => bot thang ngay.
    if (duel.botOnlyDuel && duel.botParticipantId) {
      if (duel.answers[socket.id].isCorrect) {
        finishDuel(room, socket.id, "human-correct");
      } else {
        finishDuel(room, duel.botParticipantId, "human-wrong-bot-wins");
      }
      return;
    }

    if (duel.answers[socket.id].isCorrect) {
      finishDuel(room, socket.id, "correct-answer");
      return;
    }

    const bothAnswered = duel.answers[duel.holderId] && duel.answers[duel.challengerId];
    if (bothAnswered) {
      finishDuel(room, null, "both-wrong");
    }
  });

  socket.on("disconnect", () => {
    removePlayerFromRoom(socket.id);
    socketProfiles.delete(socket.id);
  });
});

function gameLoop() {
  for (const room of rooms.values()) {
    updateRoom(room);
  }
}

app.get("/", (_, res) => {
  res.json({
    message: "Backend multiplayer room-based dang chay",
    originAllowed: ALLOWED_ORIGINS,
    rooms: getRoomListPayload()
  });
});

setInterval(gameLoop, 1000 / TICK_RATE);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server dang chay tai port ${PORT}`);
  console.log(`CORS cho phep: ${ALLOWED_ORIGINS.join(", ")}`);
});
