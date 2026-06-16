import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import GameCanvas from "./components/GameCanvas";
import MainMenu from "./components/MainMenu";
import QuizModal from "./components/QuizModal";
import EnergyCharger from "./components/EnergyCharger";
import ScoreBoard from "./components/ScoreBoard";
import type { DuelPayload, GameState } from "./types";

type GameMode = "11vs11";
type TeamChoice = "RED" | "BLUE";

// URL backend: production lay tu Vercel env VITE_BACKEND_URL, local mac dinh localhost:3000.
const LOCAL_BACKEND_URL = "http://localhost:3000";
const rawBackendUrl = String(
  import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_SOCKET_URL || ""
).trim();
const isPlaceholderBackendUrl =
  rawBackendUrl.length === 0 ||
  rawBackendUrl.includes("your-backend.onrender.com") ||
  rawBackendUrl.includes("your-app.vercel.app");
const SOCKET_URL = isPlaceholderBackendUrl ? LOCAL_BACKEND_URL : rawBackendUrl;

const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"]
});

// 11 vs 11 luon su dung 1 phong duy nhat.
const FIXED_11VS11_ROOM_ID = "11vs11-room";

const initialGameState: GameState = {
  myId: null,
  players: {},
  ball: { x: 400, y: 250, radius: 9 },
  field: { width: 800, height: 500 },
  match: { phase: "PLAYING", kickoffDone: false },
  ballHolderId: null,
  score: { RED: 0, BLUE: 0 }
};

export default function App() {
  const [showMenu, setShowMenu] = useState(true);
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") ?? "");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamChoice>("RED");
  const pendingNoticeRef = useRef<string | null>(null);
  const [teamAvailability, setTeamAvailability] = useState({
    exists: false,
    redCount: 0,
    blueCount: 0,
    maxTeamSize: 11,
    redFull: false,
    blueFull: false
  });
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [duelData, setDuelData] = useState<DuelPayload | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showEnergyCharger, setShowEnergyCharger] = useState(false);
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
    socket.on("connect_error", () => {
      alert(`Khong the ket noi toi server (${SOCKET_URL}). Kiem tra backend va file .env.`);
      setShowMenu(true);
    });

    socket.on("room-info", (payload: {
      exists?: boolean;
      redCount?: number;
      blueCount?: number;
      maxTeamSize?: number;
      redFull?: boolean;
      blueFull?: boolean;
    }) => {
      if (!payload?.exists) {
        setTeamAvailability((prev) => ({
          ...prev,
          exists: false,
          redCount: 0,
          blueCount: 0,
          redFull: false,
          blueFull: false
        }));
        return;
      }

      setTeamAvailability({
        exists: true,
        redCount: payload.redCount ?? 0,
        blueCount: payload.blueCount ?? 0,
        maxTeamSize: payload.maxTeamSize ?? 11,
        redFull: Boolean(payload.redFull),
        blueFull: Boolean(payload.blueFull)
      });
    });

    socket.on("init", (payload: Omit<GameState, "myId"> & { myId: string }) => {
      setGameState({ ...payload, myId: payload.myId });
      // Chi an menu khi server xac nhan vao phong thanh cong.
      setShowMenu(false);
      const notice = pendingNoticeRef.current;
      if (notice) {
        alert(notice);
        pendingNoticeRef.current = null;
      }
    });
    socket.on("gameState", (payload: Omit<GameState, "myId">) => {
      setGameState((prev) => ({ ...prev, ...payload }));
    });
    socket.on("room-error", (payload: { message?: string }) => {
      if (payload?.message) alert(payload.message);
      setShowMenu(true);
    });
    socket.on("start-duel", (payload: DuelPayload) => {
      setDuelData(payload);
      setHasAnswered(false);
    });
    socket.on("duel-result", () => {
      setDuelData(null);
      setHasAnswered(false);
    });
    socket.on("action-denied", (payload: { message?: string }) => {
      if (payload?.message) alert(payload.message);
    });
    socket.on("room-full", (data: { message?: string }) => {
      alert(data?.message ?? "Phong da day.");
      setShowMenu(true);
    });

    return () => {
      socket.off("connect_error");
      socket.off("room-info");
      socket.off("init");
      socket.off("gameState");
      socket.off("room-error");
      socket.off("start-duel");
      socket.off("duel-result");
      socket.off("action-denied");
      socket.off("room-full");
    };
  }, []);

  // Cap nhat thong tin so nguoi trong 2 doi khi dang o menu mode 11 vs 11.
  useEffect(() => {
    if (!showMenu || selectedMode !== "11vs11") return;

    const request = () => {
      socket.emit("request-room-info", { roomId: FIXED_11VS11_ROOM_ID });
    };

    request();
    const intervalId = window.setInterval(request, 3000);
    return () => window.clearInterval(intervalId);
  }, [showMenu, selectedMode]);

  useEffect(() => {
    if (showMenu) setShowEnergyCharger(false);
  }, [showMenu]);

  useEffect(() => {
    const emitInput = (next: typeof inputState) => {
      socket.emit("move", next);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (showMenu) return;

      if (event.code === "Space") {
        event.preventDefault();
        const isThrowInTaker =
          gameState.match.phase === "THROW_IN" &&
          gameState.match.setPiece?.takerId === gameState.myId &&
          gameState.ballHolderId === gameState.myId;
        if (!isThrowInTaker) {
          socket.emit("kick-ball");
        }
        return;
      }

      if (event.code === "KeyQ") {
        event.preventDefault();
        setShowEnergyCharger((prev) => !prev);
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
  }, [keyMap, showMenu, gameState]);

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);

    if (mode === "11vs11") {
      setSelectedTeam("RED");
    }
  };

  const handleJoinFixedRoom = () => {
    if (selectedMode !== "11vs11") return;
    const finalName = playerName.trim() || "Player";
    localStorage.setItem("playerName", finalName);
    socket.emit("set-player-profile", { playerName: finalName });

    pendingNoticeRef.current = "Vao phong thanh cong!";
    socket.emit("join-fixed-11vs11", { playerName: finalName, preferredTeam: selectedTeam });
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

  function handleShootBall(mouseX: number, mouseY: number) {
    if (!gameState.myId) return;
    const isSetPieceTaker = gameState.match.setPiece?.takerId === gameState.myId;
    const isCornerKick =
      gameState.match.phase === "CORNER_KICK" && isSetPieceTaker;
    const isThrowIn =
      gameState.match.phase === "THROW_IN" &&
      isSetPieceTaker &&
      gameState.ballHolderId === gameState.myId;

    if (isThrowIn) return;

    if (!isCornerKick) {
      if (gameState.match.phase !== "PLAYING") return;
      if (gameState.ballHolderId !== gameState.myId) return;
    }
    socket.emit("shoot-ball", { mouseX, mouseY });
  }

  function handlePassBall(targetPlayerId: string) {
    if (!gameState.myId) return;

    const isThrowInTaker =
      gameState.match.phase === "THROW_IN" &&
      gameState.match.setPiece?.takerId === gameState.myId &&
      gameState.ballHolderId === gameState.myId;

    if (!isThrowInTaker) {
      if (gameState.match.phase !== "PLAYING") return;
      if (gameState.ballHolderId !== gameState.myId) return;
    }

    socket.emit("pass-ball", { targetPlayerId });
  }

  return (
    <>
      {showMenu ? (
        <MainMenu
          playerName={playerName}
          selectedMode={selectedMode}
          selectedTeam={selectedTeam}
            teamRedCount={teamAvailability.redCount}
            teamBlueCount={teamAvailability.blueCount}
            teamMaxSize={teamAvailability.maxTeamSize}
            teamRedFull={teamAvailability.redFull}
            teamBlueFull={teamAvailability.blueFull}
          onPlayerNameChange={setPlayerName}
          onSelectMode={handleSelectMode}
          onSelectTeam={setSelectedTeam}
          onJoinFixedRoom={handleJoinFixedRoom}
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
            <ScoreBoard red={gameState.score?.RED ?? 0} blue={gameState.score?.BLUE ?? 0} />
            <div
              className={`pointer-events-none fixed left-1/2 z-20 w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl bg-black/45 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur ${
                showEnergyCharger ? "top-44" : "top-4"
              }`}
            >
              {gameState.match.notice ||
                (!gameState.match.kickoffDone && gameState.match.phase === "PLAYING"
                  ? "Cho doi ca hai doi de bat dau tran dau..."
                  : gameState.match.phase === "PLAYING"
                  ? "Bong dang song"
                  : gameState.match.phase === "DUEL" && gameState.match.duel?.isKickoff
                    ? "Tranh quyen giu bong - tra loi cau hoi!"
                    : gameState.match.phase === "DUEL"
                    ? "Dang duel tranh chap bong"
                    : gameState.match.phase === "THROW_IN"
                      ? gameState.match.setPiece?.takerId === gameState.myId
                        ? "Nem bien - click vao dong doi de chuyen bong"
                        : "Nem bien - di chuyen nhung khong lai gan nguoi nem"
                      : gameState.match.phase === "CORNER_KICK"
                        ? gameState.match.setPiece?.takerId === gameState.myId
                          ? "Phat goc - click chuot de da (hoac SPACE)"
                          : "Phat goc - di chuyen nhung khong lai gan nguoi da phat"
                        : gameState.match.phase === "GOAL_KICK"
                          ? "Dang phat bong len"
                          : "Bong dang song")}
            </div>
            <QuizModal duelData={duelData} answered={hasAnswered} onSubmitAnswer={submitAnswer} />
            <EnergyCharger
              open={showEnergyCharger}
              onClose={() => setShowEnergyCharger(false)}
              onRecharge={() => socket.emit("recharge-energy")}
            />
          </div>
        </div>
      )}
    </>
  );
}
