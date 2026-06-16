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
// 4 vs 4 su dung 1 phong duy nhat.
const FIXED_4VS4_ROOM_ID = "4vs4-room";
const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 500;
const FIELD_MARGIN = 20;
const PLAY_MIN_X = FIELD_MARGIN;
const PLAY_MAX_X = FIELD_WIDTH - FIELD_MARGIN;
const PLAY_MIN_Y = FIELD_MARGIN;
const PLAY_MAX_Y = FIELD_HEIGHT - FIELD_MARGIN;
const GOAL_Y_MIN = 200;
const GOAL_Y_MAX = 300;

// Vong cam dia (ve tren san, khong con thu mon).
const PENALTY_RED_MIN_X = 0;
const PENALTY_RED_MAX_X = 150;
const PENALTY_BLUE_MIN_X = 650;
const PENALTY_BLUE_MAX_X = 800;
const PENALTY_MIN_Y = 100;
const PENALTY_MAX_Y = 400;

const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 3;
const BALL_RADIUS = 9;
const MAX_PLAYERS = 8;
const MAX_TEAM_SIZE = 4;
const DRIBBLE_DISTANCE = PLAYER_RADIUS + BALL_RADIUS + 2;
const BALL_FREE_SPEED = 6.2;
const SHOOT_SPEED = 15;
const PASS_SPEED = 11;
const THROW_IN_SPEED = 8.5;
const CORNER_KEEP_OUT_DISTANCE = 90;
const ENERGY_MAX = 100;
const PASS_ENERGY_COST = 15;
const SHOOT_ENERGY_COST = 25;
const SET_PIECE_ENERGY_COST = 10;
const ENERGY_RECHARGE_AMOUNT = 30;
const DUEL_TRIGGER_DISTANCE = 30;
const DUEL_TIMEOUT_MS = 10000;
const DUEL_FREEZE_MS = 3000;
const DUEL_COOLDOWN_MS = 3000;
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

// Gioi han cau thu trong khu vuc san choi.
function clampFieldPosition(player) {
  player.x = clamp(player.x, PLAY_MIN_X + player.radius, PLAY_MAX_X - player.radius);
  player.y = clamp(player.y, PLAY_MIN_Y + player.radius, PLAY_MAX_Y - player.radius);
}

function applyMovementBounds(player) {
  clampFieldPosition(player);
}

function placeSetPieceTaker(taker, type, spot) {
  if (type === "THROW_IN") {
    const onTopSideline = spot.y <= PLAY_MIN_Y + 1;
    taker.x = clamp(spot.x, PLAY_MIN_X + taker.radius, PLAY_MAX_X - taker.radius);
    taker.y = clamp(
      onTopSideline ? PLAY_MIN_Y + taker.radius : PLAY_MAX_Y - taker.radius,
      PLAY_MIN_Y + taker.radius,
      PLAY_MAX_Y - taker.radius
    );
    taker.direction = { dx: 0, dy: onTopSideline ? 1 : -1 };
    return;
  }

  if (type === "CORNER_KICK") {
    const onLeftGoalLine = spot.x <= PLAY_MIN_X + 1;
    taker.x = clamp(
      onLeftGoalLine ? PLAY_MIN_X + taker.radius : PLAY_MAX_X - taker.radius,
      PLAY_MIN_X + taker.radius,
      PLAY_MAX_X - taker.radius
    );
    taker.y = clamp(spot.y, PLAY_MIN_Y + taker.radius, PLAY_MAX_Y - taker.radius);
    const toCenterX = FIELD_WIDTH / 2 - taker.x;
    const toCenterY = FIELD_HEIGHT / 2 - taker.y;
    const len = Math.hypot(toCenterX, toCenterY) || 1;
    taker.direction = { dx: toCenterX / len, dy: toCenterY / len };
  }
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function enforceSetPieceKeepOut(taker, player) {
  if (!taker || player.id === taker.id) return;

  const minDistance = taker.radius + player.radius + CORNER_KEEP_OUT_DISTANCE;
  const dx = player.x - taker.x;
  const dy = player.y - taker.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= minDistance || distance < 0.001) return;

  const push = (minDistance - distance) / distance;
  player.x += dx * push;
  player.y += dy * push;
  applyMovementBounds(player);
}

function applyMoveInput(room, player, inputState) {
  const setPiece = room.match.setPiece;
  if (
    setPiece?.takerId === player.id &&
    (setPiece.type === "THROW_IN" || setPiece.type === "CORNER_KICK")
  ) {
    player.input = { up: false, down: false, left: false, right: false };
    return;
  }

  if (room.match.phase !== "PLAYING") {
    if (
      (setPiece?.type === "CORNER_KICK" || setPiece?.type === "THROW_IN") &&
      setPiece.takerId !== player.id
    ) {
      // Cac cau thu khac duoc di chuyen trong phat goc / nem bien.
    } else if (!setPiece || setPiece.takerId !== player.id) {
      return;
    }
  }

  player.input = {
    up: Boolean(inputState?.up),
    down: Boolean(inputState?.down),
    left: Boolean(inputState?.left),
    right: Boolean(inputState?.right)
  };
}

function findTeammateNearPoint(room, team, exceptId, x, y, hitRadius = 42) {
  return Object.values(room.players)
    .filter((player) => player.team === team && player.id !== exceptId)
    .reduce((nearest, player) => {
      const distance = getDistance(player, { x, y });
      if (distance > hitRadius + player.radius) return nearest;
      if (!nearest || distance < getDistance(nearest, { x, y })) return player;
      return nearest;
    }, null);
}

function executeThrowInPass(room, taker, receiver, socket = null) {
  if (!taker || !receiver) return false;
  if (taker.team !== receiver.team || taker.id === receiver.id) return false;
  if (room.match.setPiece?.type !== "THROW_IN" || room.match.setPiece.takerId !== taker.id) return false;
  if (room.ballHolderId !== taker.id) return false;
  if (!consumeEnergy(taker, SET_PIECE_ENERGY_COST)) {
    if (socket) emitActionDenied(socket, "Khong du energy de nem bien.");
    return false;
  }

  kickBallToward(room, receiver.x, receiver.y, THROW_IN_SPEED, taker.team, taker.id, receiver.id);
  finishSetPieceKick(room, taker, THROW_IN_SPEED);
  return true;
}

function pickRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

function pickWrongAnswer(correctAnswer) {
  const options = ["A", "B", "C", "D"];
  const wrongOptions = options.filter((option) => option !== correctAnswer);
  return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
}

function isPlayerFrozen(player) {
  return (player.frozenUntil ?? 0) > Date.now();
}

function freezePlayer(player, durationMs = DUEL_FREEZE_MS) {
  if (!player) return;
  player.frozenUntil = Date.now() + durationMs;
  player.input = { up: false, down: false, left: false, right: false };
}

function createEmptyRoom(roomId, roomName) {
  return {
    id: roomId,
    name: roomName || `Room ${roomId}`,
    gameMode: "4vs4",
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
    duelCooldownUntil: 0,
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
      kickoffDone: false
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

function setPlayerHomePosition(player) {
  player.homeX = player.x;
  player.homeY = player.y;
}

function resetPlayersToHomePositions(room) {
  Object.values(room.players).forEach((player) => {
    if (player.homeX == null || player.homeY == null) {
      const spawn = spawnForTeam(player.team);
      player.homeX = spawn.x;
      player.homeY = spawn.y;
    }

    player.x = player.homeX;
    player.y = player.homeY;
    player.input = { up: false, down: false, left: false, right: false };
    player.frozenUntil = 0;
    player.direction = { dx: player.team === TEAM_RED ? 1 : -1, dy: 0 };
    applyMovementBounds(player);
  });
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
    energy: ENERGY_MAX,
    frozenUntil: 0,
    homeX: spawn.x,
    homeY: spawn.y
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
    energy: ENERGY_MAX,
    frozenUntil: 0,
    homeX: spawn.x,
    homeY: spawn.y
  };
}

function createBossRaidBots(room) {
  // So do 4-4-2 tren nua san phai (doi Xanh), khong co thu mon.
  const formation = [
    { id: "bot_1", role: "DF", x: 680, y: 250 },
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
      energy: ENERGY_MAX,
      frozenUntil: 0,
      homeX: botData.x,
      homeY: botData.y
    };
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
    energy: ENERGY_MAX,
    frozenUntil: 0
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
      energy: ENERGY_MAX,
      frozenUntil: 0
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
      energy: ENERGY_MAX,
      frozenUntil: 0
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
            questionId: room.match.duel.questionId,
            isKickoff: Boolean(room.match.duel.isKickoff)
          }
        : null,
      kickoffDone: Boolean(room.match.kickoffDone)
    },
    ballHolderId: room.ballHolderId,
    score: room.score
  };
}

function updatePlayerMovement(player) {
  if (isPlayerFrozen(player)) {
    player.input = { up: false, down: false, left: false, right: false };
    return;
  }

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
  if (isPlayerFrozen(bot)) {
    bot.input = { up: false, down: false, left: false, right: false };
    return;
  }

  const target = room.ballHolderId ? room.players[room.ballHolderId] || room.ball : room.ball;
  const targetX = target.x;
  const targetY = target.y;

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
  if (isPlayerFrozen(bot)) return;

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

function hasHumanOnTeam(room, team) {
  return Object.values(room.players).some((player) => player.team === team && !player.isBot);
}

function getKickoffRepresentative(room, team) {
  const center = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
  return getSetPieceTaker(room, team, center);
}

function maybeStartKickoff(room) {
  if (room.gameMode !== "4vs4") return;
  if (room.match.kickoffDone || room.match.duel) return;

  if (!hasHumanOnTeam(room, TEAM_RED) || !hasHumanOnTeam(room, TEAM_BLUE)) {
    room.match.notice = "Cho doi nguoi choi ca hai doi de bat dau tran dau...";
    return;
  }

  const redRep = getKickoffRepresentative(room, TEAM_RED);
  const blueRep = getKickoffRepresentative(room, TEAM_BLUE);
  if (!redRep || !blueRep) return;

  startKickoffDuel(room, redRep, blueRep);
}

function startKickoffDuel(room, redRep, blueRep) {
  const question = pickRandomQuestion();
  const startAt = Date.now();

  room.ballHolderId = null;
  room.ball.x = FIELD_WIDTH / 2;
  room.ball.y = FIELD_HEIGHT / 2;
  room.ball.vx = 0;
  room.ball.vy = 0;

  room.match.phase = "DUEL";
  room.match.notice = "Bat dau tran dau - tra loi cau hoi de tranh quyen giu bong!";
  room.match.duel = {
    holderId: redRep.id,
    challengerId: blueRep.id,
    questionId: question.id,
    correctAnswer: question.correctAnswer,
    startAt,
    answers: {},
    isKickoff: true,
    botOnlyDuel: false,
    botParticipantId: null,
    botAnswerAt: null,
    botWillBeCorrect: false
  };

  const duelPayload = {
    duelId: `kickoff-${room.id}-${question.id}-${startAt}`,
    kind: "kickoff",
    question: {
      id: question.id,
      text: question.text,
      options: question.options
    },
    players: [redRep.id, blueRep.id]
  };

  io.to(redRep.id).emit("start-duel", duelPayload);
  io.to(blueRep.id).emit("start-duel", duelPayload);
}

function captureBallIfTouching(room) {
  if (!room.match.kickoffDone) return;
  if (room.ballHolderId) return;
  if (room.match.phase !== "PLAYING") return;

  const touchingPlayers = Object.values(room.players)
    .filter((player) => !isPlayerFrozen(player))
    .filter((player) => getDistance(player, room.ball) <= player.radius + BALL_RADIUS)
    .sort((a, b) => {
      if (a.isBot !== b.isBot) return a.isBot ? 1 : -1;
      return 0;
    });

  for (const player of touchingPlayers) {
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

function getOpponentTeam(team) {
  return team === TEAM_RED ? TEAM_BLUE : TEAM_RED;
}

function getCornerKickSpot(exitOnLeft, outY) {
  const goalCenterY = (GOAL_Y_MIN + GOAL_Y_MAX) / 2;
  const useTopCorner = outY < goalCenterY;
  return {
    x: exitOnLeft ? PLAY_MIN_X : PLAY_MAX_X,
    y: useTopCorner ? PLAY_MIN_Y : PLAY_MAX_Y
  };
}

function awardBallAfterGoal(room, scoredTeam) {
  const receivingTeam = getOpponentTeam(scoredTeam);

  resetPlayersToHomePositions(room);

  const center = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
  const receiver =
    getSetPieceTaker(room, receivingTeam, center) || getNearestPlayerInTeam(room, receivingTeam, center);

  room.match.phase = "PLAYING";
  room.match.setPiece = null;
  room.match.duel = null;
  room.botPassTargetId = null;

  if (!receiver) {
    room.ballHolderId = null;
    room.ball.x = FIELD_WIDTH / 2;
    room.ball.y = FIELD_HEIGHT / 2;
    room.ball.vx = 0;
    room.ball.vy = 0;
    room.lastTouchPlayerId = null;
    room.botCarrierId = null;
    return;
  }

  const offsetX = receivingTeam === TEAM_RED ? -35 : 35;
  receiver.x = clamp(
    FIELD_WIDTH / 2 + offsetX,
    PLAY_MIN_X + receiver.radius,
    PLAY_MAX_X - receiver.radius
  );
  receiver.y = clamp(FIELD_HEIGHT / 2, PLAY_MIN_Y + receiver.radius, PLAY_MAX_Y - receiver.radius);
  receiver.direction = { dx: receivingTeam === TEAM_RED ? 1 : -1, dy: 0 };

  room.ballHolderId = receiver.id;
  room.ball.vx = 0;
  room.ball.vy = 0;
  updateBallToHolder(room);
  room.lastTouchTeam = receivingTeam;
  room.lastTouchPlayerId = receiver.id;

  if (room.gameMode === "1vsBot" && receiver.team === TEAM_BLUE && receiver.isBot) {
    room.botCarrierId = receiver.id;
  } else {
    room.botCarrierId = null;
  }

  room.match.notice = `Vaoo! ${scoredTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} ghi ban! ${
    receivingTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"
  } nhan bong o giua san.`;
}

function getNearestPlayerInTeam(room, team, spot) {
  const teamPlayers = Object.values(room.players).filter((player) => player.team === team);
  if (teamPlayers.length === 0) return null;

  return teamPlayers.reduce((nearest, player) => {
    if (!nearest) return player;
    return getDistance(player, spot) < getDistance(nearest, spot) ? player : nearest;
  }, null);
}

function getSetPieceTaker(room, team, spot) {
  const candidates = Object.values(room.players).filter((player) => player.team === team);
  if (candidates.length === 0) return null;

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
    const inwardY = spot.y <= PLAY_MIN_Y + 1 ? spot.y + 120 : spot.y - 120;
    const receiver = findTeammateNearPoint(room, taker.team, taker.id, taker.x, inwardY, 220);
    if (!receiver) return;
    executeThrowInPass(room, taker, receiver);
    return;
  }

  if (type === "CORNER_KICK") {
    const goalX = taker.team === TEAM_RED ? PLAY_MAX_X : PLAY_MIN_X;
    const targetY = clamp(spot.y, GOAL_Y_MIN, GOAL_Y_MAX);
    kickBallToward(room, goalX, targetY, SHOOT_SPEED, taker.team, taker.id);
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

function awardGoalKick(room, defendingTeam, rawSpot, notice) {
  const onLeftGoal = defendingTeam === TEAM_RED;
  const kickX = onLeftGoal ? PLAY_MIN_X + 80 : PLAY_MAX_X - 80;
  const kickY = clamp(rawSpot.y, PENALTY_MIN_Y, PENALTY_MAX_Y);
  const spot = {
    x: onLeftGoal ? PLAY_MIN_X : PLAY_MAX_X,
    y: kickY
  };

  const taker = getSetPieceTaker(room, defendingTeam, { x: kickX, y: kickY });
  if (!taker) return;

  taker.x = clamp(
    kickX,
    PLAY_MIN_X + taker.radius,
    PLAY_MAX_X - taker.radius
  );
  taker.y = clamp(kickY, PENALTY_MIN_Y + taker.radius, PENALTY_MAX_Y - taker.radius);
  taker.direction = { dx: onLeftGoal ? 1 : -1, dy: 0 };

  room.match.phase = "PLAYING";
  room.match.duel = null;
  room.match.setPiece = null;
  room.match.notice = notice;
  room.ballHolderId = taker.id;
  room.ball.vx = 0;
  room.ball.vy = 0;
  room.lastTouchTeam = defendingTeam;
  room.lastTouchPlayerId = taker.id;
  room.botPassTargetId = null;
  updateBallToHolder(room);
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
      ? getSetPieceTaker(room, awardedTeam, spot)
      : getNearestPlayerInTeam(room, awardedTeam, spot);
  const takerId = taker ? taker.id : null;

  room.match.phase = type;
  room.match.duel = null;
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
    placeSetPieceTaker(taker, type, spot);
    if (type === "THROW_IN") {
      room.ballHolderId = taker.id;
      updateBallToHolder(room);
    }
  }
}

function startLiveBall(room, bySocketId, socket) {
  if (!room.match.setPiece || room.match.setPiece.takerId !== bySocketId) return;

  const taker = room.players[bySocketId];
  if (!taker) return;
  const setPieceType = room.match.setPiece.type;
  if (setPieceType === "THROW_IN") {
    emitActionDenied(socket, "Nem bien chi duoc chuyen cho dong doi.");
    return;
  }
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
    room.score[scoredTeam] += 1;
    awardBallAfterGoal(room, scoredTeam);
    return;
  }

  if (isOutHorizontal && !inGoalMouth) {
    const exitOnLeft = outX < PLAY_MIN_X;
    const attackingTeam = exitOnLeft ? TEAM_BLUE : TEAM_RED;
    const defendingTeam = getOpponentTeam(attackingTeam);
    const sideLabel = exitOnLeft ? "ben trai" : "ben phai";

    if (lastTouchTeam === defendingTeam) {
      const cornerSpot = getCornerKickSpot(exitOnLeft, outY);
      startSetPiece(
        room,
        "CORNER_KICK",
        attackingTeam,
        cornerSpot,
        `${attackingTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} duoc huong phat goc ${sideLabel}!`
      );
    } else {
      awardGoalKick(
        room,
        defendingTeam,
        { x: outX, y: outY },
        `${defendingTeam === TEAM_RED ? "Doi Do" : "Doi Xanh"} phat bong len trong vong cam ${sideLabel}!`
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

function startDuel(room) {
  if (!room.match.kickoffDone) return;
  if (room.match.phase !== "PLAYING" || room.match.setPiece || !room.ballHolderId) return;
  if (Date.now() < (room.duelCooldownUntil || 0)) return;

  const holder = room.players[room.ballHolderId];
  if (!holder || isPlayerFrozen(holder)) {
    if (!holder) room.ballHolderId = null;
    return;
  }

  const challenger = Object.values(room.players).find((player) => {
    if (player.id === holder.id) return false;
    if (player.team === holder.team) return false;
    if (isPlayerFrozen(player)) return false;
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
  room.match.notice = "Tranh chap bong - tra loi nhanh va dung de giu bong!";
  room.match.duel = {
    holderId: holder.id,
    challengerId: challenger.id,
    questionId: question.id,
    correctAnswer: question.correctAnswer,
    startAt,
    answers: {},
    botOnlyDuel: Boolean(holder.isBot || challenger.isBot),
    botParticipantId: holder.isBot ? holder.id : challenger.isBot ? challenger.id : null,
    botAnswerAt:
      holder.isBot || challenger.isBot
        ? startAt + 800 + Math.floor(Math.random() * 2200)
        : null,
    botWillBeCorrect: Math.random() < 0.45
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

  loser.x = clamp(loser.x + nx * 90, loser.radius, FIELD_WIDTH - loser.radius);
  loser.y = clamp(loser.y + ny * 90, loser.radius, FIELD_HEIGHT - loser.radius);
}

function tryResolveDuel(room) {
  const duel = room.match.duel;
  if (!duel || duel.resolved) return;

  const participantIds = [duel.holderId, duel.challengerId];
  const allAnswered = participantIds.every((id) => duel.answers[id]);
  if (!allAnswered) return;

  resolveDuelOutcome(room, "both-answered");
}

function resolveDuelOutcome(room, reason = "finished") {
  const duel = room.match.duel;
  if (!duel || duel.resolved) return;
  duel.resolved = true;

  const participantIds = [duel.holderId, duel.challengerId];
  for (const id of participantIds) {
    if (!duel.answers[id]) {
      duel.answers[id] = {
        answer: null,
        submittedAt: Date.now(),
        isCorrect: false
      };
    }
  }

  const correctIds = participantIds
    .filter((id) => duel.answers[id]?.isCorrect)
    .sort((a, b) => duel.answers[a].submittedAt - duel.answers[b].submittedAt);

  let winnerId;
  if (correctIds.length > 0) {
    winnerId = correctIds[0];
  } else {
    winnerId = duel.holderId;
  }

  const holder = room.players[duel.holderId];
  const challenger = room.players[duel.challengerId];
  const winner = room.players[winnerId];
  const loser = winnerId === duel.holderId ? challenger : holder;

  if (duel.isKickoff) {
    if (winner) {
      const offsetX = winner.team === TEAM_RED ? -35 : 35;
      winner.x = clamp(FIELD_WIDTH / 2 + offsetX, PLAY_MIN_X + winner.radius, PLAY_MAX_X - winner.radius);
      winner.y = clamp(FIELD_HEIGHT / 2, PLAY_MIN_Y + winner.radius, PLAY_MAX_Y - winner.radius);
      winner.direction = { dx: winner.team === TEAM_RED ? 1 : -1, dy: 0 };
    }

    room.ball.x = FIELD_WIDTH / 2;
    room.ball.y = FIELD_HEIGHT / 2;
    room.ball.vx = 0;
    room.ball.vy = 0;
    room.ballHolderId = winnerId;
    if (winner) updateBallToHolder(room);

    room.lastTouchTeam = winner?.team ?? null;
    room.lastTouchPlayerId = winnerId;
    room.match.kickoffDone = true;
    room.match.phase = "PLAYING";
    room.match.duel = null;
    room.match.notice =
      correctIds.length > 0
        ? `${winner?.team === TEAM_RED ? "Doi Do" : "Doi Xanh"} tra loi nhanh dung - gianh quyen giu bong!`
        : `${holder?.team === TEAM_RED ? "Doi Do" : "Doi Xanh"} duoc huong giu bong (ca hai sai)!`;

    io.to(room.id).emit("duel-result", {
      winnerId,
      holderIdAfterDuel: room.ballHolderId,
      reason
    });
    return;
  }

  if (correctIds.length > 0) {
    for (const id of participantIds) {
      if (id !== winnerId) {
        freezePlayer(room.players[id]);
      }
    }
  } else {
    for (const id of participantIds) {
      freezePlayer(room.players[id]);
    }
  }

  room.ballHolderId = winnerId;
  if (winner && loser) {
    pushLoserAway(winner, loser);
  }

  room.lastTouchTeam = winner?.team ?? holder?.team ?? null;
  room.lastTouchPlayerId = winnerId;

  if (room.gameMode === "1vsBot" && winner?.team === TEAM_BLUE) {
    room.botCarrierId = winner.id;
    room.botPassTargetId = null;
  } else if (room.gameMode === "1vsBot") {
    room.botCarrierId = null;
    room.botPassTargetId = null;
  }

  if (correctIds.length > 0) {
    room.match.notice =
      winnerId === duel.challengerId
        ? "Tra loi nhanh dung - gianh bong thanh cong!"
        : "Tra loi nhanh dung - giu bong thanh cong!";
  } else {
    room.match.notice = "Ca hai tra loi sai - dung yen 3 giay!";
  }

  room.match.phase = "PLAYING";
  room.match.duel = null;
  room.duelCooldownUntil = Date.now() + DUEL_COOLDOWN_MS;

  io.to(room.id).emit("duel-result", {
    winnerId,
    holderIdAfterDuel: room.ballHolderId,
    reason
  });
}

function finishDuel(room, forcedWinnerId = null, reason = "finished") {
  const duel = room.match.duel;
  if (!duel || duel.resolved) return;

  if (forcedWinnerId && room.players[forcedWinnerId]) {
    duel.resolved = true;
    const isKickoff = Boolean(duel.isKickoff);
    const holder = room.players[duel.holderId];
    const challenger = room.players[duel.challengerId];
    const winner = room.players[forcedWinnerId];
    const loser = forcedWinnerId === duel.holderId ? challenger : holder;

    if (isKickoff) {
      const offsetX = winner.team === TEAM_RED ? -35 : 35;
      winner.x = clamp(FIELD_WIDTH / 2 + offsetX, PLAY_MIN_X + winner.radius, PLAY_MAX_X - winner.radius);
      winner.y = clamp(FIELD_HEIGHT / 2, PLAY_MIN_Y + winner.radius, PLAY_MAX_Y - winner.radius);
      winner.direction = { dx: winner.team === TEAM_RED ? 1 : -1, dy: 0 };
      room.ball.x = FIELD_WIDTH / 2;
      room.ball.y = FIELD_HEIGHT / 2;
      room.ball.vx = 0;
      room.ball.vy = 0;
      room.ballHolderId = forcedWinnerId;
      updateBallToHolder(room);
      room.match.kickoffDone = true;
      room.match.notice = `${winner.team === TEAM_RED ? "Doi Do" : "Doi Xanh"} gianh quyen giu bong!`;
    } else {
      room.ballHolderId = forcedWinnerId;
      if (winner && loser) {
        pushLoserAway(winner, loser);
      }
      room.duelCooldownUntil = Date.now() + DUEL_COOLDOWN_MS;
      room.match.notice = "Doi thu roi tran - ban gianh bong!";
    }

    room.match.phase = "PLAYING";
    room.match.duel = null;

    io.to(room.id).emit("duel-result", {
      winnerId: forcedWinnerId,
      holderIdAfterDuel: room.ballHolderId,
      reason
    });
    return;
  }

  resolveDuelOutcome(room, reason);
}

function updateRoom(room) {
  if (room.match.phase === "PLAYING") {
    if (!room.match.kickoffDone && !room.match.duel) {
      maybeStartKickoff(room);
    }

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
              player.role === "DF"
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
    const duel = room.match.duel;

    if (
      duel.botParticipantId &&
      !duel.answers[duel.botParticipantId] &&
      duel.botAnswerAt &&
      Date.now() >= duel.botAnswerAt
    ) {
      const botAnswer = duel.botWillBeCorrect
        ? duel.correctAnswer
        : pickWrongAnswer(duel.correctAnswer);
      duel.answers[duel.botParticipantId] = {
        answer: botAnswer,
        submittedAt: Date.now(),
        isCorrect: botAnswer === duel.correctAnswer
      };
      tryResolveDuel(room);
    }

    const elapsed = Date.now() - duel.startAt;
    if (elapsed >= DUEL_TIMEOUT_MS) {
      resolveDuelOutcome(room, "timeout");
    }
  } else if (room.match.setPiece) {
    const setPiece = room.match.setPiece;
    const takerId = setPiece.takerId;
    const taker = takerId ? room.players[takerId] : null;

    if (setPiece.type === "THROW_IN") {
      if (taker) {
        taker.input = { up: false, down: false, left: false, right: false };
        placeSetPieceTaker(taker, "THROW_IN", setPiece.spot);
        if (room.ballHolderId !== taker.id) {
          room.ballHolderId = taker.id;
        }
        updateBallToHolder(room);
      }

      for (const player of Object.values(room.players)) {
        if (player.id === takerId) continue;
        if (player.isBot) {
          updateBotAI(room, player);
        } else {
          updatePlayerMovement(player);
        }
        if (taker) {
          enforceSetPieceKeepOut(taker, player);
        }
      }

      if (taker?.isBot) {
        botExecuteSetPiece(room);
      }
    } else if (setPiece.type === "CORNER_KICK") {
      if (taker) {
        taker.input = { up: false, down: false, left: false, right: false };
        placeSetPieceTaker(taker, "CORNER_KICK", setPiece.spot);
        room.ball.x = setPiece.spot.x;
        room.ball.y = setPiece.spot.y;
        room.ball.vx = 0;
        room.ball.vy = 0;
      }

      for (const player of Object.values(room.players)) {
        if (player.id === takerId) continue;
        if (player.isBot) {
          updateBotAI(room, player);
        } else {
          updatePlayerMovement(player);
        }
        if (taker) {
          enforceSetPieceKeepOut(taker, player);
        }
      }

      if (taker?.isBot) {
        botExecuteSetPiece(room);
      }
    } else if (taker) {
      Object.values(room.players).forEach((player) => {
        if (player.id !== takerId) {
          player.input = { up: false, down: false, left: false, right: false };
        }
      });
      if (taker.isBot) {
        updateBotAI(room, taker);
        botExecuteSetPiece(room);
      } else {
        updatePlayerMovement(taker);
      }
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

function normalizeFixed4vs4Room(room) {
  room.gameMode = "4vs4";
  room.botCarrierId = null;
  room.botPassTargetId = null;
  room.practiceOwnerId = null;

  Object.keys(room.players).forEach((playerId) => {
    const player = room.players[playerId];
    if (!player?.isBot) return;
    if (room.ballHolderId === playerId) {
      room.ballHolderId = null;
      room.ball.x = FIELD_WIDTH / 2;
      room.ball.y = FIELD_HEIGHT / 2;
      room.ball.vx = 0;
      room.ball.vy = 0;
    }
    delete room.players[playerId];
  });
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
    // 4vs4: nguoi choi tu chon doi; doi day thi chi cho phep doi con lai.
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
  maybeStartKickoff(room);
  io.to(room.id).emit("gameState", buildRoomGameState(room));
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
    let normalizedMode = "4vs4";
    if (gameMode === "1vsBot") normalizedMode = "1vsBot";
    if (gameMode === "4vs4" || gameMode === "11vs11" || gameMode === "1vs11" || gameMode === "Custom") {
      normalizedMode = "4vs4";
    }
    if (gameMode === "practice" || gameMode === "Practice") {
      normalizedMode = "practice";
    }

    // 4 vs 4 luon su dung 1 phong duy nhat gom 8 nguoi (4/4).
    if (normalizedMode === "4vs4") {
      finalRoomId = FIXED_4VS4_ROOM_ID;
    }

    const roomName = normalizedMode === "4vs4" ? "Phong 4 vs 4" : `Phong ${finalRoomId}`;

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

  // 4vs4: vao phong tu dong (khong can nhap ma phong).
  // Server se chon 1 phong con slot, uu tien phong ma doi nguoi choi dang chon con du slot.
  socket.on("join-any-room", ({ gameMode, playerName, preferredTeam }) => {
    const mode = gameMode === "1vsBot" ? "1vsBot" : gameMode === "practice" ? "practice" : "4vs4";
    if (mode !== "4vs4") {
      socket.emit("room-error", { message: "Chi ho tro join tu dong cho che do 4 vs 4." });
      return;
    }

    const candidates = Array.from(rooms.values())
      .filter((r) => r.gameMode === "4vs4" && Object.keys(r.players).length < MAX_PLAYERS)
      .map((r) => {
        const t = getTeamAvailability(r);
        const preferredAvailable =
          (preferredTeam === TEAM_RED && !t.redFull) || (preferredTeam === TEAM_BLUE && !t.blueFull);
        return { room: r, preferredAvailable, totalPlayers: Object.keys(r.players).length };
      });

    if (candidates.length === 0) {
      socket.emit("room-full", { message: "Chua co phong 4 vs 4 nao con slot." });
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

  // 4vs4: vao phong co dinh duy nhat.
  socket.on("join-fixed-4vs4", ({ playerName, preferredTeam }) => {
    const roomId = FIXED_4VS4_ROOM_ID;
    if (!rooms.has(roomId)) {
      const newRoom = createEmptyRoom(roomId, "Phong 4 vs 4");
      newRoom.gameMode = "4vs4";
      rooms.set(roomId, newRoom);
    } else {
      normalizeFixed4vs4Room(rooms.get(roomId));
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

    applyMoveInput(room, player, inputState);
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

    applyMoveInput(room, player, inputState);
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
    if (isPlayerFrozen(shooter)) {
      emitActionDenied(socket, "Ban dang bi dong bang, chua the sut bong.");
      return;
    }

    const numericX = Number(mouseX);
    const numericY = Number(mouseY);
    if (!Number.isFinite(numericX) || !Number.isFinite(numericY)) return;

    const targetX = clamp(numericX, 0, FIELD_WIDTH);
    const targetY = clamp(numericY, 0, FIELD_HEIGHT);
    const setPiece = room.match.setPiece;

    if (setPiece && setPiece.takerId === socket.id) {
      if (setPiece.type === "THROW_IN") {
        emitActionDenied(socket, "Nem bien chi duoc chuyen cho dong doi - click vao dong doi.");
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

    if (room.match.phase !== "PLAYING") {
      emitActionDenied(socket, "Chua the sut bong trong tinh huong nay.");
      return;
    }
    if (room.ballHolderId !== socket.id) return;

    if (!consumeEnergy(shooter, SHOOT_ENERGY_COST)) {
      emitActionDenied(socket, "Khong du energy de sut bong.");
      return;
    }

    kickBallToward(room, targetX, targetY, SHOOT_SPEED, shooter.team, shooter.id, null);
  });

  socket.on("pass-ball", ({ targetPlayerId }) => {
    const room = rooms.get(socketToRoom.get(socket.id));
    if (!room) return;

    const passer = room.players[socket.id];
    if (!passer) return;

    const isThrowInPass =
      room.match.setPiece?.type === "THROW_IN" &&
      room.match.setPiece.takerId === socket.id &&
      room.ballHolderId === socket.id;

    if (!isThrowInPass && room.match.phase !== "PLAYING") return;
    if (room.ballHolderId !== socket.id) return;

    const receiver = room.players[targetPlayerId];
    if (!receiver || passer.team !== receiver.team) return;

    if (isThrowInPass) {
      executeThrowInPass(room, passer, receiver, socket);
      return;
    }

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

    tryResolveDuel(room);
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
