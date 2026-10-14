/**
 * Analytical damped spring (closed-form solution of x'' + 2ζω₀x' + ω₀²x = 0).
 * Adapted from quickLiquid `packages/quick-liquid/src/animations/spring.ts`
 * (https://github.com/amarnath3003/quickLiquid, commit fbb19b5f1cd4097e62831da44df0bee0097433ca).
 * Trimmed to the solver; `configure` and `jump` added. See THIRD_PARTY_NOTICES.md.
 *
 * MIT License
 *
 * Copyright (c) 2026 Amarnath
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export interface SpringConfig {stiffness: number; damping: number; mass?: number}

/** Exact position at any time, so a 60 Hz and a 120 Hz display trace the same curve. */
export class Spring {
  private value_: number; private target_: number; private velocity_ = 0;
  private start = -1; private startValue = 0; private startVelocity = 0; private rest = true;
  private omega0 = 0; private zeta = 0; private omegaD = 0;

  constructor(value = 0, config: SpringConfig = {stiffness: 300, damping: 26}) {
    this.value_ = value; this.target_ = value; this.configure(config);
  }

  /** Change stiffness/damping mid-flight, keeping the current position and velocity. */
  configure({stiffness, damping, mass = 1}: SpringConfig) {
    this.startValue = this.value_; this.startVelocity = this.velocity_; this.start = -1;
    this.omega0 = Math.sqrt(stiffness / mass);
    this.zeta = damping / (2 * Math.sqrt(stiffness * mass));
    this.omegaD = this.zeta < 1 ? this.omega0 * Math.sqrt(1 - this.zeta * this.zeta) : 0;
  }

  setTarget(target: number) {
    if (target === this.target_ && this.rest) return;
    this.startValue = this.value_; this.startVelocity = this.velocity_; this.start = -1;
    this.target_ = target; this.rest = false;
  }

  /** Snap without animation (reduced motion, resize, first layout). */
  jump(value: number) {
    this.value_ = this.target_ = this.startValue = value;
    this.velocity_ = this.startVelocity = 0; this.rest = true;
  }

  /** Advance to `now` (ms, rAF timestamp). Returns true while still moving. */
  tick(now: number): boolean {
    if (this.rest) return false;
    if (this.start < 0) this.start = now;
    const t = (now - this.start) / 1000, x0 = this.startValue - this.target_, v0 = this.startVelocity;
    const {omega0: w0, zeta: z, omegaD: wd} = this;
    let x: number, v: number;
    if (z < 1) {
      const env = Math.exp(-z * w0 * t), cos = Math.cos(wd * t), sin = Math.sin(wd * t);
      const A = x0, B = (v0 + z * w0 * x0) / wd;
      x = env * (A * cos + B * sin);
      v = env * ((B * wd - A * z * w0) * cos - (A * wd + B * z * w0) * sin);
    } else if (z === 1) {
      const env = Math.exp(-w0 * t);
      x = env * (x0 + (v0 + w0 * x0) * t);
      v = env * (v0 * (1 - w0 * t) - x0 * w0 * w0 * t);
    } else {
      const r = Math.sqrt(z * z - 1), s1 = -w0 * (z - r), s2 = -w0 * (z + r);
      const A = (v0 - s2 * x0) / (s1 - s2), B = x0 - A;
      x = A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
      v = A * s1 * Math.exp(s1 * t) + B * s2 * Math.exp(s2 * t);
    }
    this.value_ = this.target_ + x; this.velocity_ = v;
    // Sub-pixel rest thresholds: nothing visible is cut off when the spring snaps home.
    if (Math.abs(x) < .05 && Math.abs(v) < .5) {this.jump(this.target_); return false;}
    return true;
  }

  get value() {return this.value_;}
  get target() {return this.target_;}
}
