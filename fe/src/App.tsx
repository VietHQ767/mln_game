import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import BackgroundMusic from "./components/BackgroundMusic";
import ButtonSoundEffects from "./components/ButtonSoundEffects";
import GameCanvas from "./components/GameCanvas";
import SettingsButton from "./components/SettingsButton";
import HomePage from "./components/HomePage";
import MainMenu from "./components/MainMenu";
import QuizModal from "./components/QuizModal";
import EnergyCharger from "./components/EnergyCharger";
import ScoreBoard from "./components/ScoreBoard";
import type { DuelPayload, GameState } from "./types";

type GameMode = "4vs4";
type TeamChoice = "RED" | "BLUE";

// URL backend: production lấy từ Vercel env VITE_BACKEND_URL, local mặc định localhost:3000.
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

// 4 vs 4 luôn sử dụng 1 phòng duy nhất.
const FIXED_4VS4_ROOM_ID = "4vs4-room";

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
  const [showHomePage, setShowHomePage] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") ?? "");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>("4vs4");
  const [selectedTeam, setSelectedTeam] = useState<TeamChoice>("RED");
  const pendingNoticeRef = useRef<string | null>(null);
  const joinTimeoutRef = useRef<number | null>(null);
  const [teamAvailability, setTeamAvailability] = useState({
    exists: false,
    redCount: 0,
    blueCount: 0,
    maxTeamSize: 4,
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
      alert(`Không thể kết nối tới server (${SOCKET_URL}). Kiểm tra backend và file .env.`);
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
        maxTeamSize: payload.maxTeamSize ?? 4,
        redFull: Boolean(payload.redFull),
        blueFull: Boolean(payload.blueFull)
      });
    });

    socket.on("init", (payload: Omit<GameState, "myId"> & { myId: string }) => {
      if (joinTimeoutRef.current) {
        window.clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      setGameState({ ...payload, myId: payload.myId });
      // Chỉ ẩn menu khi server xác nhận vào phòng thành công.
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
      alert(data?.message ?? "Phòng đã đầy.");
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

  // Cập nhật thông tin số người trong 2 đội khi đang ở menu mode 4 vs 4.
  useEffect(() => {
    if (!showMenu || selectedMode !== "4vs4") return;

    const request = () => {
      socket.emit("request-room-info", { roomId: FIXED_4VS4_ROOM_ID });
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

    if (mode === "4vs4") {
      setSelectedTeam("RED");
    }
  };

  const handleJoinFixedRoom = () => {
    if (selectedMode !== "4vs4") {
      alert("Hãy chọn chế độ 4 vs 4 trước khi vào phòng.");
      return;
    }
    if (!socket.connected) {
      alert(`Chưa kết nối server (${SOCKET_URL}). Kiểm tra backend đang chạy.`);
      return;
    }
    const finalName = playerName.trim() || "Player";
    localStorage.setItem("playerName", finalName);
    socket.emit("set-player-profile", { playerName: finalName });

    pendingNoticeRef.current = "Vào phòng thành công!";
    if (joinTimeoutRef.current) {
      window.clearTimeout(joinTimeoutRef.current);
    }
    joinTimeoutRef.current = window.setTimeout(() => {
      joinTimeoutRef.current = null;
      alert(
        "Không nhận phản hồi từ server khi vào phòng. Hãy restart backend (npm run dev trong be/) hoặc đợi deploy backend mới."
      );
      setShowMenu(true);
    }, 8000);
    socket.emit("join-fixed-4vs4", { playerName: finalName, preferredTeam: selectedTeam });
  };

  const handlePlayAgain = () => {
    socket.emit("reset-match");
  };

  const handleBackToMenu = () => {
    setShowMenu(true);
    setShowHomePage(false);
  };

  const handleStartFromHome = () => {
    setShowHomePage(false);
    setShowMenu(true);
  };

  const handleExit = () => {
    setShowHomePage(true);
    setShowMenu(false);
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
      <BackgroundMusic active={showHomePage || showMenu} />
      <ButtonSoundEffects active={showHomePage || showMenu} />
      <SettingsButton active={showHomePage || showMenu} />
      {showHomePage ? (
        <HomePage onStart={handleStartFromHome} />
      ) : showMenu ? (
        <div className="relative min-h-screen">
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
        </div>
      ) : (
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="relative min-h-screen w-full">
            <GameCanvas
              gameState={gameState}
              onShootBall={handleShootBall}
              onPassBall={handlePassBall}
            />
            <ScoreBoard
              red={gameState.score?.RED ?? 0}
              blue={gameState.score?.BLUE ?? 0}
              winTarget={gameState.match.winTarget}
            />
            <div
              className={`pointer-events-none fixed left-1/2 z-20 w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl bg-black/45 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur ${
                showEnergyCharger ? "top-44" : "top-4"
              }`}
            >
              {gameState.match.notice ||
                (!gameState.match.kickoffDone && gameState.match.phase === "PLAYING"
                  ? "Chờ đợi cả hai đội để bắt đầu trận đấu..."
                  : gameState.match.phase === "PLAYING"
                  ? "Bóng đang sống"
                  : gameState.match.phase === "DUEL" && gameState.match.duel?.isGoalQuiz
                    ? "Xác nhận ghi bàn - trả lời câu hỏi!"
                    : gameState.match.phase === "DUEL" && gameState.match.duel?.isKickoff
                    ? "Tranh quyền giữ bóng - trả lời câu hỏi!"
                    : gameState.match.phase === "DUEL"
                    ? "Đang duel tranh chấp bóng"
                    : gameState.match.phase === "THROW_IN"
                      ? gameState.match.setPiece?.takerId === gameState.myId
                        ? "Ném biên - click vào đồng đội để chuyền bóng"
                        : "Ném biên - di chuyển nhưng không lại gần người ném"
                      : gameState.match.phase === "CORNER_KICK"
                        ? gameState.match.setPiece?.takerId === gameState.myId
                          ? "Phạt góc - click chuột để đá (hoặc SPACE)"
                          : "Phạt góc - di chuyển nhưng không lại gần người đá phạt"
                        : gameState.match.phase === "GOAL_KICK"
                          ? "Đang phát bóng lên"
                          : gameState.match.phase === "POST_GOAL"
                            ? gameState.match.postGoal?.receiverId === gameState.myId
                              ? "Đứng trước khung thành - chờ 3 giây để tiếp tục"
                              : "Ghi bàn - chờ 3 giây, cầu thủ về vị trí cũ"
                          : gameState.match.phase === "FINISHED"
                            ? gameState.match.notice || "Trận đấu đã kết thúc"
                          : "Bóng đang sống")}
            </div>
            {gameState.match.phase === "FINISHED" && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="w-[min(92vw,24rem)] rounded-2xl border border-amber-400/40 bg-slate-900 p-6 text-center shadow-2xl">
                  <h2 className="mb-2 text-2xl font-bold text-amber-300">Kết thúc trận đấu</h2>
                  <p className="mb-1 text-lg font-semibold text-white">
                    {gameState.match.winnerTeam === "RED"
                      ? "Đội Đỏ thắng!"
                      : gameState.match.winnerTeam === "BLUE"
                        ? "Đội Xanh thắng!"
                        : "Hòa?"}
                  </p>
                  <p className="mb-6 text-sm text-slate-300">
                    Tỷ số: {gameState.score?.RED ?? 0} - {gameState.score?.BLUE ?? 0}
                    {gameState.match.winTarget ? ` (mục tiêu ${gameState.match.winTarget} điểm)` : ""}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={handlePlayAgain}
                      className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Chơi lại
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToMenu}
                      className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      Về menu
                    </button>
                  </div>
                </div>
              </div>
            )}
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
