import type { Ball, FoulType, GamePhase, Player, ReplayFrame, Shot } from './types';

export interface SlowMotionSnapshot {
  balls: Ball[];
  phase: GamePhase;
  currentShot: Shot | null;
  currentPlayerId: number;
  players: Player[];
  foul: FoulType;
  foulMessage: string | null;
  freeBall: boolean;
  targetBallHint: string | null;
  shotHistory: Shot[];
  turnNumber: number;
  groupsAssigned: boolean;
}

export interface SlowMotionState {
  active: boolean;
  frames: ReplayFrame[];
  frameIndex: number;
  accumulator: number;
  finished: boolean;
  hitBallIds: number[];
  snapshot: SlowMotionSnapshot | null;
}

export const SLOW_MOTION_FACTOR = 4;
export const SLOW_MOTION_FRAME_INTERVAL = 1 / 60;
export const SLOW_MOTION_END_DELAY_MS = 400;

export function extractHitBallIds(shotHistory: Shot[]): number[] {
  const ids = new Set<number>();
  if (shotHistory.length === 0) return [];
  const lastShot = shotHistory[shotHistory.length - 1];
  for (const hit of lastShot.hits) {
    ids.add(hit.ballId);
  }
  for (const pocketedId of lastShot.pocketedBalls) {
    ids.add(pocketedId);
  }
  return Array.from(ids);
}

export function createInitialSlowMotionState(): SlowMotionState {
  return {
    active: false,
    frames: [],
    frameIndex: 0,
    accumulator: 0,
    finished: false,
    hitBallIds: [],
    snapshot: null,
  };
}

export function computeSlowMotionTick(
  frames: ReplayFrame[],
  frameIndex: number,
  accumulator: number,
  dt: number,
): {
  frameIndex: number;
  accumulator: number;
  finished: boolean;
  balls: Ball[] | null;
} {
  if (frames.length === 0) {
    return { frameIndex: 0, accumulator: 0, finished: true, balls: null };
  }

  const slowInterval = SLOW_MOTION_FRAME_INTERVAL * SLOW_MOTION_FACTOR;
  let acc = accumulator + dt;
  let idx = frameIndex;

  while (acc >= slowInterval && idx < frames.length - 1) {
    acc -= slowInterval;
    idx++;
  }

  if (idx >= frames.length - 1) {
    const lastFrame = frames[frames.length - 1];
    return {
      frameIndex: frames.length - 1,
      accumulator: 0,
      finished: true,
      balls: JSON.parse(JSON.stringify(lastFrame.balls)),
    };
  }

  const before = frames[idx];
  const after = frames[idx + 1];
  const t = acc / slowInterval;

  const balls: Ball[] = before.balls.map((bb, i) => {
    const ab = after.balls[i] || bb;
    return {
      ...bb,
      pos: {
        x: bb.pos.x + (ab.pos.x - bb.pos.x) * t,
        y: bb.pos.y + (ab.pos.y - bb.pos.y) * t,
      },
      pocketed: t < 0.5 ? bb.pocketed : ab.pocketed,
    };
  });

  return {
    frameIndex: idx,
    accumulator: acc,
    finished: false,
    balls,
  };
}

export function collectTrajectoryPoints(
  frames: ReplayFrame[],
  currentIndex: number,
  hitBallIds: number[],
): Map<number, { x: number; y: number }[]> {
  const endIdx = Math.min(currentIndex + 1, frames.length);
  const trackedIds = new Set<number>([0, ...hitBallIds]);
  const trajectories = new Map<number, { x: number; y: number }[]>();

  for (const ballId of trackedIds) {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < endIdx; i++) {
      const frame = frames[i];
      const ball = frame.balls.find((b) => b.id === ballId);
      if (ball && !ball.pocketed) {
        points.push({ x: ball.pos.x, y: ball.pos.y });
      }
    }
    if (points.length >= 2) {
      trajectories.set(ballId, points);
    }
  }

  return trajectories;
}
