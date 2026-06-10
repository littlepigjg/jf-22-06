import type { ReplayFrame } from './types';
import { BALL_RADIUS, BALL_COLORS } from './constants';
import { roundRect } from './draw-helpers';
import { collectTrajectoryPoints } from './slow-motion';

const CANVAS_W = 880;
const CANVAS_H = 480;

export function drawTrajectories(
  ctx: CanvasRenderingContext2D,
  frames: ReplayFrame[],
  currentIndex: number,
  hitBallIds: number[],
): void {
  if (frames.length < 2) return;

  const trajectories = collectTrajectoryPoints(frames, currentIndex, hitBallIds);

  for (const [ballId, points] of trajectories) {
    const colorInfo = BALL_COLORS[ballId];
    const isCue = ballId === 0;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = isCue ? 3.5 : 2.5;

    const grad = ctx.createLinearGradient(
      points[0].x,
      points[0].y,
      points[points.length - 1].x,
      points[points.length - 1].y,
    );
    if (isCue) {
      grad.addColorStop(0, 'rgba(245,208,75,0.15)');
      grad.addColorStop(1, 'rgba(245,208,75,0.9)');
    } else if (colorInfo) {
      grad.addColorStop(0, `${colorInfo.color}22`);
      grad.addColorStop(1, `${colorInfo.color}dd`);
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,0.1)');
      grad.addColorStop(1, 'rgba(255,255,255,0.7)');
    }
    ctx.strokeStyle = grad;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    if (isCue && points.length > 0) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, BALL_RADIUS + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245,208,75,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

export function drawSlowMotionBanner(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = 'rgba(14,116,144,0.25)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const w = 200;
  const h = 40;
  const x = (CANVAS_W - w) / 2;
  const y = 20;
  ctx.fillStyle = 'rgba(8,47,73,0.85)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56,189,248,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('慢动作回放 0.25x', x + w / 2, y + h / 2);
  ctx.restore();
}
