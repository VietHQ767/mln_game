import { useEffect, useRef, type MouseEvent } from "react";
import type { GameState } from "../types";

interface GameCanvasProps {
  gameState: GameState;
  onShootBall: (mouseX: number, mouseY: number) => void;
  onPassBall: (targetPlayerId: string) => void;
}

export default function GameCanvas({ gameState, onShootBall, onPassBall }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale tu toa do server (800x500) sang kich thuoc full man hinh cua client.
    const scaleX = canvas.width / gameState.field.width;
    const scaleY = canvas.height / gameState.field.height;
    const sx = (value: number) => value * scaleX;
    const sy = (value: number) => value * scaleY;

    const drawPitch = () => {
      const margin = 20;
      const pitchLeft = sx(margin);
      const pitchTop = sy(margin);
      const pitchWidth = sx(gameState.field.width - margin * 2);
      const pitchHeight = sy(gameState.field.height - margin * 2);
      const pitchRight = pitchLeft + pitchWidth;
      const pitchBottom = pitchTop + pitchHeight;
      const centerX = sx(gameState.field.width / 2);
      const centerY = sy(gameState.field.height / 2);

      // Kich thuoc cac khu vuc theo ti le 800x500 de giong anh mau.
      const penaltyDepth = sx(120);
      const penaltyWidth = sy(300);
      const sixYardDepth = sx(40);
      const sixYardWidth = sy(140);
      const goalDepth = sx(8);
      const goalWidth = sy(50);
      const penaltySpotOffset = sx(80);
      const centerCircleR = sx(65);
      const penaltyArcR = sx(70);
      const cornerArcR = sx(9);

      ctx.fillStyle = "#008d00";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, sx(2));
      ctx.strokeRect(pitchLeft, pitchTop, pitchWidth, pitchHeight);

      // Duong giua san.
      ctx.beginPath();
      ctx.moveTo(centerX, pitchTop);
      ctx.lineTo(centerX, pitchBottom);
      ctx.stroke();

      // Vong trong giua san va cham giao bong.
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerCircleR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, sx(2.2), 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Khu 16m50 trai/phai.
      const penaltyTop = centerY - penaltyWidth / 2;
      ctx.strokeRect(pitchLeft, penaltyTop, penaltyDepth, penaltyWidth);
      ctx.strokeRect(pitchRight - penaltyDepth, penaltyTop, penaltyDepth, penaltyWidth);

      // Khu 5m50 trai/phai.
      const sixYardTop = centerY - sixYardWidth / 2;
      ctx.strokeRect(pitchLeft, sixYardTop, sixYardDepth, sixYardWidth);
      ctx.strokeRect(pitchRight - sixYardDepth, sixYardTop, sixYardDepth, sixYardWidth);

      // Khung thanh nho nam ngoai bien ngang.
      const goalTop = centerY - goalWidth / 2;
      ctx.strokeRect(pitchLeft - goalDepth, goalTop, goalDepth, goalWidth);
      ctx.strokeRect(pitchRight, goalTop, goalDepth, goalWidth);

      // Cham phat den.
      const leftPenaltyX = pitchLeft + penaltySpotOffset;
      const rightPenaltyX = pitchRight - penaltySpotOffset;
      ctx.beginPath();
      ctx.arc(leftPenaltyX, centerY, sx(2.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightPenaltyX, centerY, sx(2.2), 0, Math.PI * 2);
      ctx.fill();

      // Cung phat den (chi ve phan nam ngoai khu 16m50).
      ctx.beginPath();
      ctx.arc(leftPenaltyX, centerY, penaltyArcR, -0.95, 0.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightPenaltyX, centerY, penaltyArcR, Math.PI - 0.95, Math.PI + 0.95);
      ctx.stroke();

      // Cung goc 4 goc san.
      ctx.beginPath();
      ctx.arc(pitchLeft, pitchTop, cornerArcR, 0, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pitchRight, pitchTop, cornerArcR, Math.PI / 2, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pitchLeft, pitchBottom, cornerArcR, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pitchRight, pitchBottom, cornerArcR, Math.PI, Math.PI * 1.5);
      ctx.stroke();
    };

    const drawPlayer = () => {
      Object.values(gameState.players).forEach((player) => {
        const isGoalkeeper = player.role === "GK";
        // Mau thu mon khac biet: Do = vang neon, Xanh = cam; cau thu thuong giu mau doi.
        const teamColor = isGoalkeeper
          ? player.team === "RED"
            ? "#FFFF00"
            : "#FF8C00"
          : player.team === "RED"
            ? "#ff4d4f"
            : "#4d7dff";
        const playerRadius = Math.max(5, sx(player.radius * 0.55));
        const holderRingRadius = playerRadius + Math.max(2, sx(2.2));
        const selfRingRadius = playerRadius + Math.max(4, sx(4.5));
        ctx.beginPath();
        ctx.arc(sx(player.x), sy(player.y), playerRadius, 0, Math.PI * 2);
        ctx.fillStyle = teamColor;
        ctx.fill();

        // Vien to cho thu mon de de nhan biet tren nen san xanh.
        if (isGoalkeeper) {
          ctx.beginPath();
          ctx.arc(sx(player.x), sy(player.y), playerRadius + Math.max(1.5, sx(1.5)), 0, Math.PI * 2);
          ctx.strokeStyle = player.team === "RED" ? "#FFD700" : "#FF6B00";
          ctx.lineWidth = Math.max(1.5, sx(1.8));
          ctx.stroke();
        }

        if (player.id === gameState.ballHolderId) {
          ctx.beginPath();
          ctx.arc(sx(player.x), sy(player.y), holderRingRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffe066";
          ctx.lineWidth = Math.max(1.5, sx(1.6));
          ctx.stroke();
        }

        if (player.id === gameState.myId) {
          ctx.beginPath();
          ctx.arc(sx(player.x), sy(player.y), selfRingRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1.5, sx(1.8));
          ctx.stroke();
        }

        ctx.font = `${Math.max(9, sx(9))}px Arial`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        // Hien thi nhan "GK" ben canh ten de phan biet thu mon.
        const gkTag = isGoalkeeper ? "GK " : "";
        const label = player.isBot ? `${gkTag}BOT ${player.name}` : `${gkTag}${player.name}`;
        ctx.fillText(label, sx(player.x), sy(player.y) - playerRadius - Math.max(5, sy(5)));

        // Thanh nang luong nho ben duoi ten (vang), toi da 100.
        const energy = Math.max(0, Math.min(100, player.energy ?? 100));
        const barW = Math.max(26, sx(30));
        const barH = Math.max(3, sy(3));
        const barX = sx(player.x) - barW / 2;
        const barY = sy(player.y) + playerRadius + Math.max(3, sy(3));

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = "#ffd54f";
        ctx.fillRect(barX, barY, (barW * energy) / 100, barH);
      });
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(sx(gameState.ball.x), sy(gameState.ball.y), sx(gameState.ball.radius || 9), 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#1f1f1f";
      ctx.stroke();
    };

    drawPitch();
    drawPlayer();
    drawBall();

    if (gameState.match.phase === "DUEL") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffe082";
      ctx.font = "bold 28px Arial";
      ctx.fillText("DUEL - QUIZ BATTLE", canvas.width / 2, sy(55));
    }
  }, [gameState]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  function mapClientToField(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const ratioX = (clientX - rect.left) / rect.width;
    const ratioY = (clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(gameState.field.width, ratioX * gameState.field.width)),
      y: Math.max(0, Math.min(gameState.field.height, ratioY * gameState.field.height))
    };
  }

  function handleCanvasMouseDown(event: MouseEvent<HTMLCanvasElement>) {
    const mousePos = mapClientToField(event.clientX, event.clientY);
    if (!mousePos) return;

    // Click trai: sut theo huong chuot.
    if (event.button === 0) {
      onShootBall(mousePos.x, mousePos.y);
      return;
    }

    // Click phai: tim dong doi gan diem click de chuyen.
    if (event.button === 2 && gameState.myId) {
      const myPlayer = gameState.players[gameState.myId];
      if (!myPlayer) return;

      const teammates = Object.values(gameState.players).filter(
        (player) => player.team === myPlayer.team && player.id !== myPlayer.id
      );

      const target = teammates.find((player) => {
        const dx = mousePos.x - player.x;
        const dy = mousePos.y - player.y;
        return Math.hypot(dx, dy) < player.radius;
      });

      if (target) {
        onPassBall(target.id);
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      className="fixed inset-0 h-screen w-screen"
      onContextMenu={(event) => event.preventDefault()}
      onMouseDown={handleCanvasMouseDown}
    />
  );
}
