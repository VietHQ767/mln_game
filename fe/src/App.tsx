import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import GameCanvas from "./components/GameCanvas";
import MainMenu from "./components/MainMenu";
import QuizModal from "./components/QuizModal";
import EnergyCharger from "./components/EnergyCharger";
import GKQuizModal from "./components/GKQuizModal";
import type { DuelPayload, GKDuelPayload, GameState, Room } from "./types";

type GameMode = "1vsBot" | "11vs11" | "Practice";

// URL backend: local mac dinh, production lay tu Vercel env VITE_SOCKET_URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"]
});

const initialGameState: GameState = {
  myId: null,
  players: {},
  ball: { x: 400, y: 250, radius: 9 },
  field: { width: 800, height: 500 },
  match: { phase: "PLAYING" },
  ballHolderId: null
};

export default function App() {
  const [showMenu, setShowMenu] = useState(true);
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") ?? "");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [practiceTeammates, setPracticeTeammates] = useState(0);
  const [practiceOpponents, setPracticeOpponents] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([
    { id: "room-1", name: "Phong Lop A", players: 0, capacity: 22 },
    { id: "room-2", name: "Phong Lop B", players: 0, capacity: 22 }
  ]);
  const [showRoomList, setShowRoomList] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [duelData, setDuelData] = useState<DuelPayload | null>(null);
  const [gkDuelData, setGkDuelData] = useState<GKDuelPayload | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [hasAnsweredGk, setHasAnsweredGk] = useState(false);
  const [inputState, setInputState] = useState({
    up: false,
    down: false,
    left: false,
    right: false
  });

  const keyMap = useMemo(
    () =>
      ({
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        a: "left",
        A: "left",
        s: "down",
        S: "down",
        d: "right",
        D: "right"
      }) as const,
    []
  );

  useEffect(() => {
    socket.on("init", (payload: Omit<GameState, "myId"> & { myId: string }) => {
      setGameState({ ...payload, myId: payload.myId });
    });
    socket.on("gameState", (payload: Omit<GameState, "myId">) => {
      setGameState((prev) => ({ ...prev, ...payload }));
    });
    socket.on("room-list", (roomData: Room[]) => {
      if (Array.isArray(roomData) && roomData.length > 0) {
        setRooms(roomData);
      }
    });
    socket.on("start-duel", (payload: DuelPayload) => {
      setDuelData(payload);
      setHasAnswered(false);
    });
    socket.on("duel-result", () => {
      setDuelData(null);
      setHasAnswered(false);
    });
    socket.on("start-gk-duel", (payload: GKDuelPayload) => {
      setGkDuelData(payload);
      setHasAnsweredGk(false);
    });
    socket.on("gk-duel-result", () => {
      setGkDuelData(null);
      setHasAnsweredGk(false);
    });
    socket.on("action-denied", (payload: { message?: string }) => {
      if (payload?.message) alert(payload.message);
    });
    socket.on("room-full", (data: { message?: string }) => {
      alert(data?.message ?? "Phong da day.");
      setShowMenu(true);
    });

    return () => {
      socket.off("init");
      socket.off("gameState");
      socket.off("room-list");
      socket.off("start-duel");
      socket.off("duel-result");
      socket.off("start-gk-duel");
      socket.off("gk-duel-result");
      socket.off("action-denied");
      socket.off("room-full");
    };
  }, []);

  useEffect(() => {
    const emitInput = (next: typeof inputState) => {
      socket.emit("move", next);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (showMenu) return;

      if (event.code === "Space") {
        event.preventDefault();
        socket.emit("kick-ball");
        return;
      }

      const dir = keyMap[event.key as keyof typeof keyMap];
      if (!dir) return;
      setInputState((prev) => {
        if (prev[dir]) return prev;
        const next = { ...prev, [dir]: true };
        emitInput(next);
        return next;
      });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (showMenu) return;
      if (event.code === "Space") return;
      const dir = keyMap[event.key as keyof typeof keyMap];
      if (!dir) return;
      setInputState((prev) => {
        if (!prev[dir]) return prev;
        const next = { ...prev, [dir]: false };
        emitInput(next);
        return next;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [keyMap, showMenu]);

  const startSession = (mode: "create-room" | "join-room", gameMode: GameMode, roomId?: string) => {
    const finalName = playerName.trim() || "Player";
    localStorage.setItem("playerName", finalName);
    socket.emit("set-player-profile", { playerName: finalName });

    if (mode === "create-room") {
      const generatedRoomId = roomId || `${gameMode.toLowerCase()}-${Date.now()}`;
      socket.emit("create-room", {
        roomId: generatedRoomId,
        playerName: finalName,
        gameMode
      });
    } else if (roomId) {
      socket.emit("join-room", { roomId, playerName: finalName, gameMode });
    }

    setShowMenu(false);
  };

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);

    // Che do 1vsBot vao tran ngay khi bam nut.
    if (mode === "1vsBot") {
      startSession("create-room", mode, `bot-${Date.now()}`);
      return;
    }

    socket.emit("request-room-list");
  };

  const handleCreateModeRoom = () => {
    if (selectedMode !== "11vs11") return;
    const roomId = roomCode.trim() || `${selectedMode.toLowerCase()}-${Date.now()}`;
    setRoomCode(roomId);
    startSession("create-room", selectedMode, roomId);
  };

  const handleCreatePracticeRoom = () => {
    const finalName = playerName.trim() || "Player";
    localStorage.setItem("playerName", finalName);
    socket.emit("set-player-profile", { playerName: finalName });

    socket.emit("create-practice-room", {
      playerName: finalName,
      teammates: Math.max(0, Math.min(10, practiceTeammates)),
      opponents: Math.max(1, Math.min(11, practiceOpponents))
    });
    setShowMenu(false);
  };

  const handleJoinByCode = () => {
    if (selectedMode !== "11vs11") return;
    if (!roomCode.trim()) {
      alert("Vui long nhap ma phong.");
      return;
    }
    startSession("join-room", selectedMode, roomCode.trim());
  };

  const handleExit = () => {
    window.close();
    document.body.innerHTML =
      "<h2 style='color:white;text-align:center;margin-top:20vh'>Da thoat game.</h2>";
  };

  const submitAnswer = (answer: "A" | "B" | "C" | "D") => {
    if (!duelData || hasAnswered) return;
    setHasAnswered(true);
    socket.emit("submit-answer", { answer });
  };

  const submitGkAnswer = (answer: "A" | "B" | "C" | "D") => {
    if (!gkDuelData || hasAnsweredGk) return;
    setHasAnsweredGk(true);
    socket.emit("submit-gk-answer", { answer });
  };

  function handleShootBall(mouseX: number, mouseY: number) {
    if (!gameState.myId) return;
    if (gameState.ballHolderId !== gameState.myId) return;
    socket.emit("shoot-ball", { mouseX, mouseY });
  }

  function handlePassBall(targetPlayerId: string) {
    if (!gameState.myId) return;
    if (gameState.ballHolderId !== gameState.myId) return;
    socket.emit("pass-ball", { targetPlayerId });
  }

  return (
    <>
      {showMenu ? (
        <MainMenu
          playerName={playerName}
          selectedMode={selectedMode}
          roomCode={roomCode}
          practiceTeammates={practiceTeammates}
          practiceOpponents={practiceOpponents}
          rooms={rooms}
          showRoomList={showRoomList}
          onPlayerNameChange={setPlayerName}
          onSelectMode={handleSelectMode}
          onRoomCodeChange={setRoomCode}
          onPracticeTeammatesChange={(value) => setPracticeTeammates(Number.isFinite(value) ? value : 0)}
          onPracticeOpponentsChange={(value) => setPracticeOpponents(Number.isFinite(value) ? value : 1)}
          onCreatePracticeRoom={handleCreatePracticeRoom}
          onCreateModeRoom={handleCreateModeRoom}
          onJoinByCode={handleJoinByCode}
          onToggleRoomList={() => {
            socket.emit("request-room-list");
            setShowRoomList((prev) => !prev);
          }}
          onJoinRoom={(roomId) => {
            const modeToUse = selectedMode === "1vsBot" || !selectedMode ? "11vs11" : selectedMode;
            startSession("join-room", modeToUse, roomId);
          }}
          onExit={handleExit}
        />
      ) : (
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="relative min-h-screen w-full">
            <GameCanvas
              gameState={gameState}
              onShootBall={handleShootBall}
              onPassBall={handlePassBall}
            />
            <div className="pointer-events-none fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl bg-black/45 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur">
              {gameState.match.notice ||
                (gameState.match.phase === "PLAYING"
                  ? "Bong dang song"
                  : gameState.match.phase === "DUEL"
                    ? "Dang duel tranh chap bong"
                    : gameState.match.phase === "THROW_IN"
                      ? "Dang nem bien - bam SPACE de dua bong vao"
                      : gameState.match.phase === "CORNER_KICK"
                        ? "Dang phat goc - bam SPACE de da"
                        : "Dang phat bong len - bam SPACE de da")}
            </div>
            <QuizModal duelData={duelData} answered={hasAnswered} onSubmitAnswer={submitAnswer} />
            <GKQuizModal data={gkDuelData} answered={hasAnsweredGk} onSubmit={submitGkAnswer} />
            <EnergyCharger onRecharge={() => socket.emit("recharge-energy")} />
          </div>
        </div>
      )}
    </>
  );
}
