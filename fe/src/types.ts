export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Player {
  id: string;
  name: string;
  team: "RED" | "BLUE";
  x: number;
  y: number;
  radius: number;
  color?: string;
  input?: PlayerInput;
  isBot?: boolean;
  role?: string;
  energy?: number;
  frozenUntil?: number;
  goals?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
}

export interface Question {
  id: string;
  text: string;
  options: Record<"A" | "B" | "C" | "D", string>;
}

export interface DuelPayload {
  duelId: string;
  question: Question;
  players: string[];
  kind?: "kickoff" | "possession" | "goal";
}

export interface GKDuelPayload {
  duelId: string;
  question: Question;
  shooterId: string;
  goalkeeperId: string;
}

export interface MatchState {
  phase:
    | "PLAYING"
    | "PRE_KICKOFF_WAIT"
    | "DUEL"
    | "THROW_IN"
    | "CORNER_KICK"
    | "GOAL_KICK"
    | "POST_GOAL"
    | "FINISHED";
  notice?: string;
  kickoffDone?: boolean;
  kickoffWaitUntil?: number | null;
  kickoffQuizEnabled?: boolean;
  testModeEnabled?: boolean;
  winnerTeam?: "RED" | "BLUE" | null;
  winTarget?: number;
  postGoal?: {
    receiverId: string | null;
    receivingTeam: "RED" | "BLUE";
    resumeAt: number;
  } | null;
  duel?: {
    holderId: string;
    challengerId: string;
    questionId: string;
    isKickoff?: boolean;
    isGoalQuiz?: boolean;
  } | null;
  setPiece?: {
    type: "THROW_IN" | "CORNER_KICK" | "GOAL_KICK";
    team: "RED" | "BLUE";
    takerId: string | null;
  } | null;
}

export interface Room {
  id: string;
  name: string;
  players: number;
  capacity: number;
  gameMode?: string;
  redCount?: number;
  blueCount?: number;
  maxTeamSize?: number;
  redFull?: boolean;
  blueFull?: boolean;
}

export interface RoomInfo extends Room {
  exists: boolean;
  roomId: string;
}

export interface GameState {
  myId: string | null;
  players: Record<string, Player>;
  ball: Ball;
  field: {
    width: number;
    height: number;
  };
  match: MatchState;
  ballHolderId: string | null;
  score?: {
    RED: number;
    BLUE: number;
  };
}
