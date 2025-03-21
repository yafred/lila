export interface GameData {
  game: Game;
  player: Player;
  opponent: Player;
  tournament?: Tournament;
  simul?: Simul;
  swiss?: Swiss;
  takebackable: boolean;
  moretimeable: boolean;
  clock?: Clock;
  correspondence?: CorrespondenceClock;
}

export interface Game {
  id: string;
  status: Status;
  player: Color;
  turns: number;
  fen: FEN;
  startedAtTurn?: number;
  source: Source;
  speed: Speed;
  variant: Variant;
  winner?: Color;
  drawOffers?: number[];
  moveCentis?: number[];
  initialFen?: string;
  importedBy?: string;
  threefold?: boolean;
  fiftyMoves?: boolean;
  boosted?: boolean;
  rematch?: string;
  rated?: boolean;
  perf: string;
  rules?: GameRule[];
}
export declare type GameRule = 'noAbort' | 'noRematch' | 'noGiveTime' | 'noClaimWin';

export interface Status {
  id: StatusId;
  name: StatusName;
}

export type StatusName =
  | 'created'
  | 'started'
  | 'aborted'
  | 'mate'
  | 'resign'
  | 'stalemate'
  | 'timeout'
  | 'draw'
  | 'outoftime'
  | 'noStart'
  | 'cheat'
  | 'variantEnd'
  | 'unknownFinish';

export type StatusId = number;

export interface Player {
  id: string;
  name: string | null;
  user?: PlayerUser;
  spectator?: boolean;
  color: Color;
  proposingTakeback?: boolean;
  offeringRematch?: boolean;
  offeringDraw?: boolean;
  ai?: number;
  onGame: boolean;
  lastDrawOfferAtPly?: Ply;
  isGone: number | boolean;
  blurs?: Blurs;
  hold?: Hold;
  ratingDiff?: number;
  checks?: number;
  rating?: number;
  provisional?: boolean;
  engine?: boolean;
  berserk?: boolean;
  version: number;
  image?: string;
  blindfold?: boolean;
}

export interface TournamentRanks {
  white: number;
  black: number;
}

export interface Tournament {
  id: string;
  berserkable: boolean;
  ranks?: TournamentRanks;
  running?: boolean;
  nbSecondsForFirstMove?: number;
  top?: TourPlayer[];
  team?: Team;
}

export interface TourPlayer {
  n: string; // name
  s: number; // score
  t?: string; // title
  f: boolean; // fire
  w: boolean; // withdraw
}

export interface Team {
  name: string;
}

export interface Simul {
  id: string;
  name: string;
  hostId: string;
  nbPlaying: number;
}

export interface Swiss {
  id: string;
  running?: boolean;
  ranks?: TournamentRanks;
}

export interface Clock {
  running: boolean;
  initial: number;
  increment: number;
}
export interface CorrespondenceClock {
  daysPerTurn: number;
  increment: number;
  white: number;
  black: number;
}

export type Source = 'import' | 'lobby' | 'pool' | 'friend' | 'ai' | 'local';

export interface PlayerUser {
  id: string;
  online: boolean;
  username: string;
  patron?: boolean;
  title?: string;
  flair?: Flair;
  perfs: {
    [key: string]: Perf;
  };
}

export interface Perf {
  games: number;
  rating: number;
  rd: number;
  prog: number;
  prov?: boolean;
}

export interface Ctrl {
  data: GameData;
}

export interface Blurs {
  nb: number;
  percent: number;
  bits?: string;
}

export interface Hold {
  ply: number;
  mean: number;
  sd: number;
}

export type ContinueMode = 'friend' | 'ai';

export interface GameView {
  status(ctrl: Ctrl): string;
}

export interface CheckState {
  ply: Ply;
  check?: boolean | Key;
}

export interface CheckCount {
  white: number;
  black: number;
}

export type MaterialDiffSide = {
  [role in Role]: number;
};

export interface MaterialDiff {
  white: MaterialDiffSide;
  black: MaterialDiffSide;
}
