/**
 * Critically damped smoothing (Game Programming Gems 4, §1.10 — the "SmoothDamp" spring).
 * Adapted from pmndrs/maath 0.10.8 `easing.damp` (MIT, https://github.com/pmndrs/maath/tree/maath@0.10.8).
 * See THIRD_PARTY_NOTICES.md. A spring with weight: it accelerates out of rest, decelerates into the
 * target and never overshoots, independent of frame rate.
 */
export interface Spring {value: number; velocity: number}
export const spring = (value = 0): Spring => ({value, velocity: 0});

const exp = (t: number) => 1 / (1 + t + .48 * t * t + .235 * t * t * t);

export function damp(s: Spring, target: number, smoothTime: number, dt: number, maxSpeed = Infinity) {
  smoothTime = Math.max(.0001, smoothTime);
  const omega = 2 / smoothTime;
  const t = exp(omega * dt);
  const maxChange = maxSpeed * smoothTime;
  const change = Math.min(Math.max(s.value - target, -maxChange), maxChange);
  const to = s.value - change;
  const temp = (s.velocity + omega * change) * dt;
  s.velocity = (s.velocity - omega * temp) * t;
  let out = to + (change + temp) * t;
  if (target - s.value > 0 === out > target) {out = target; s.velocity = 0;}
  s.value = out;
  return out;
}
