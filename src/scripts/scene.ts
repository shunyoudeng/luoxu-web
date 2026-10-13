/**
 * LUOXU "纷杂 → 有序" — a GPU particle field.
 *
 * One cloud of points (≈90k desktop / ≈56k touch) carries six shapes at once, one per chapter: a drifting nebula
 * (纷杂), stacked message strata (ORDER), the glyphs 珞序 (NAME), Luojia ridges drawn as contour lines (product),
 * a closed orb with an orbit (privacy), a twisted ribbon (download). Scroll position picks the blend; every point
 * leaves on its own small delay and rides a flow field between shapes, so transitions read as one breath.
 *
 * All motion runs in the vertex shader — the CPU only writes a handful of uniforms per frame, so the page scroll
 * (Lenis on desktop, native on touch) never competes with the scene. Text blocks are passed as screen rectangles
 * and points fade behind them. Depth of field: points off the focal plane grow and dim (bokeh, not blur passes).
 * Reduced motion renders one still frame; no WebGL leaves the CSS background.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, ShaderMaterial, Points, BufferGeometry, BufferAttribute, Color,
  ColorManagement, Vector2, Vector3, Vector4, MathUtils, NormalBlending, CatmullRomCurve3,
} from 'three';
import {spring, damp} from './damp';

const MAX_RECTS = 12;
const SHAPES = 12;
const MAX_SEQ = 12;

/* Drone route: one camera pose (position, look-at) per shape. Each page flies a spline through the poses of its own
   shape sequence: left/right, forward and up between chapters; nothing spins on its own. */
const POSES: [number[], number[]][] = [
  [[0, 5, 60], [0, 0, 0]],          // 0 nebula, seen from slightly above
  [[-15, 6, 50], [3, 0, -4]],       // 1 strata from the left
  [[7, 1, 50], [0, 1, 0]],          // 2 the glyphs, almost frontal
  [[-12, 10, 42], [4, -5, -12]],    // 3 over the ridges, looking down the valleys
  [[14, 7, 34], [-3, -7, -18]],     // 4 low over the sea, banking right
  [[-6, 3, 48], [0, 0, 0]],         // 5 the orb and its rings
  [[12, 8, 46], [0, 0, 0]],         // 6 the local lattice, from above right
  [[-10, -4, 44], [0, 2, 0]],       // 7 the helix, from low left
  [[5, 15, 50], [0, 0, 0]],         // 8 up and back over the ribbon
  [[-3, 3, 44], [0, 0, 0]],         // 9 three rings, close and level
  [[6, 18, 44], [0, -2, 0]],        // 10 tree rings, looking down
  [[-8, 12, 46], [0, -1, 0]],       // 11 the flower
];
/* Portrait screens frame every shape on its own: the frame is less than half as wide as it is tall, so one global
   step back would either crop the wide forms or shrink the narrow ones. Per shape: the share of the screen width it
   may fill (0: let it bleed past the edges, as the nebula, ridges and sea are meant to) and a camera roll in degrees
   that lays wide forms along the diagonal. The distance itself is measured from the points (frameShapes). */
const PORTRAIT: [number, number][] = [
  [0, 0], [.96, -6], [.94, 0], [0, 0], [0, 0], [.86, -26], [.8, 8], [.92, 14], [.9, -20], [.9, -14], [.92, 6], [.9, -8],
];
/* Colours per shape (light paper): body and accent. Green leads; each form adds one quiet note of its own. */
const SHAPE_COLS: [string, string][] = [
  ['#26352D', '#2F7A66'], ['#22463B', '#3C8A74'], ['#173A31', '#2F7A66'], ['#2E5E50', '#7DAF96'],
  ['#1F5560', '#3E9188'], ['#26352D', '#2F7A66'], ['#24493E', '#B48A4C'], ['#245D50', '#5B7FAE'],
  ['#26352D', '#3C8A74'], ['#26352D', '#2F7A66'], ['#34573F', '#A8834A'], ['#2F6B57', '#B48BA6'],
];
/* Shape sequence per page (body[data-scene]); the home page maps chapters explicitly (HOME_ANCHORS). */
const SEQS: Record<string, number[]> = {
  download: [8, 4, 9], changelog: [10, 7, 3], story: [2, 11, 3, 0], privacy: [5, 6, 1], calm: [11, 4],
};
const DEG = Math.PI / 180;

/* Soft clearing behind text, evaluated per point (vertex stage) from its screen position. */
const QUIET_GLSL = /* glsl */ `
uniform vec4 uRects[${MAX_RECTS}]; uniform float uRectK[${MAX_RECTS}]; uniform int uRectN; uniform vec3 uRes; uniform float uPad;
float quiet(vec2 p){
  float q=0.;
  for(int i=0;i<${MAX_RECTS};i++){
    if(i>=uRectN)break;
    vec4 r=uRects[i]; vec2 c=(r.xy+r.zw)*.5, h=(r.zw-r.xy)*.5;
    float rad=min(min(h.x,h.y),uPad*1.4);
    vec2 d=abs(p-c)-h+rad; float sd=length(max(d,0.))+min(max(d.x,d.y),0.)-rad;
    float k=1.-smoothstep(-uPad*.5,uPad*1.6,sd);
    q+=(1.-q)*k*k*(3.-2.*k)*uRectK[i];
  }
  return q;
}`;

const VERT = /* glsl */ `
// Only three shapes can be on screen at once (a point's delay spans ±0.17 of a segment), so the CPU binds just those
// three shape buffers to slots aP0..aP2 (sequence entries uBase, uBase+1, uBase+2). Per frame the GPU reads 3 shapes
// instead of 12: a quarter of the vertex bandwidth, same picture.
attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec2 aSeed;
uniform float uMorph,uTime,uVel,uPx,uFocus,uIntro,uQuiet,uScale,uTheme,uSeqN,uBase;
uniform vec2 uMouse,uMouseV; uniform vec3 uCA[3],uCB[3],uSea,uIri,uCalm;
varying float vA; varying vec3 vCol; varying float vSoft;
${QUIET_GLSL}
vec3 flow(vec3 p,float t){
  return vec3(sin(p.y*.21+t*.7)+sin(p.z*.17-t*.5)+sin(p.x*.09+t*.3),
              sin(p.z*.19+t*.6)+sin(p.x*.23+t*.4)+sin(p.y*.08-t*.35),
              sin(p.x*.18-t*.55)+sin(p.y*.15+t*.65)+sin(p.z*.07+t*.25));
}
vec3 slot(float j){return vec3(step(j,.5),step(.5,j)*step(j,1.5),step(1.5,j));}
void main(){
  float s=aSeed.x;
  // each point leaves on its own small delay; eased within a segment so shapes hold while being read
  float m=clamp(uMorph+(s-.5)*.34,0.,uSeqN-1.);
  float i0=floor(m), f=m-i0, e=f*f*f*(f*(f*6.-15.)+10.);
  vec3 w=slot(clamp(i0-uBase,0.,2.))*(1.-e)+slot(clamp(min(i0+1.,uSeqN-1.)-uBase,0.,2.))*e;
  vec3 p=aP0*w.x+aP1*w.y+aP2*w.z;
  vec3 cA=uCA[0]*w.x+uCA[1]*w.y+uCA[2]*w.z, cB=uCB[0]*w.x+uCB[1]*w.y+uCB[2]*w.z;
  float w4=dot(w,uSea), w9=dot(w,uIri);
  // the sea keeps moving: long swells plus a cross chop
  p.y+=w4*(sin(p.x*.16+p.z*.05+uTime*.55)*1.3+sin(p.z*.31-uTime*.8+p.x*.04)*.6+sin((p.x+p.z)*.5+uTime*1.3)*.18);
  float tr=sin(f*3.14159);                                   // 0 on a shape, 1 halfway between two
  float t=uTime*.35+s*6.2831;
  p+=flow(p*.55+s*3.,t)*(.07+tr*tr*2.6+uVel*.9)*(.45+s);
  p+=vec3(sin(t*1.3),cos(t*1.1),sin(t*.9))*(.05+.05*dot(w,uCalm));  // idle breathing
  float intro=uIntro*uIntro*(3.-2.*uIntro);
  p=mix(normalize(p+.001)*(.4+s*1.5)+flow(p,t)*1.5,p,intro); // the field blooms from a seed on entry
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vec4 clip=projectionMatrix*mv;
  // the pointer moves through the field like a hand through water: a ragged parting, a slow eddy, and a wake
  // dragged along the direction of travel. Radius and strength vary per point so the edge never reads as a circle.
  vec2 ndc=clip.xy/clip.w; float asp=uRes.x/uRes.y; vec2 dm=ndc-uMouse; dm.x*=asp;
  float md=length(dm), spd=min(length(uMouseV),3.);
  float rad=(.11+.09*aSeed.y)*(1.+spd*.25)+.025*sin(uTime*1.7+s*30.);
  float fall=exp(-md*md/(rad*rad));
  vec2 dir=dm/(md+.0001), tang=vec2(-dir.y,dir.x);
  vec2 off=dir*fall*(.03+.06*s)*(.65+.35*sin(uTime*.9+s*12.))
          +tang*fall*.035*(s-.5)*(1.+spd)
          +uMouseV*fall*(.012+.03*aSeed.y);
  off.x/=asp;
  clip.xy+=off*clip.w;
  gl_Position=clip;
  float d=-mv.z;
  float coc=abs(d-uFocus)/uFocus;                            // depth of field: circle of confusion
  float big=pow(aSeed.y,6.)*2.4;
  gl_PointSize=uPx*uScale*(1.1+big+coc*7.)*(55./d);
  vec2 sp=vec2((ndc.x*.5+.5)*uRes.x,(.5-ndc.y*.5)*uRes.y);
  vA=(.62+big*.18)/(1.+coc*coc*30.)*(1.-quiet(sp)*uQuiet)*mix(.25,1.,intro);
  vA*=.85+.15*sin(uTime*(1.5+s*3.)+s*40.);                   // a slow shimmer
  vSoft=clamp(coc*3.,0.,1.);
  // a point too faint to see (deep bokeh, behind text, off screen) costs no fill: zero size, the GPU skips it
  gl_PointSize=(vA<.006||abs(ndc.x)>1.15||abs(ndc.y)>1.15)?0.:min(gl_PointSize,64.*uPx);
  vCol=mix(cA,cB,step(.78,aSeed.y));
  // the closing rings carry a soft iridescence (green · blue · violet · amber), drifting along each ring
  vec3 iri=.5+.5*cos(6.2831*(s*.6+uTime*.03+vec3(.0,.33,.67)));
  iri=mix(vec3(.16,.48,.42),vec3(.32,.42,.86),iri.x)*.7+mix(vec3(.62,.38,.84),vec3(.92,.58,.36),iri.y)*.3*iri.z;
  vCol=mix(vCol,iri,w9*.9);
  // on the night chapter every colour turns to light: same hue, lifted towards mint-white
  vCol=mix(vCol,vec3(.80,.91,.86)+(vCol-vec3(.2,.36,.3))*.5,uTheme);
}`;
const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uDotA,uDotB; varying float vA; varying vec3 vCol; varying float vSoft;
void main(){
  vec2 c=gl_PointCoord-.5; float r=length(c); if(r>.5)discard;
  float a=mix(smoothstep(.5,.32,r),smoothstep(.5,0.,r)*.8,vSoft);
  gl_FragColor=vec4(vCol,vA*a);
}`;

/* Ambient streams: a few dozen threads of coloured motes drifting slowly through the whole space, independent of
   the chapter shapes, so no view is ever empty paper. Brand colours only (green, mint, Luojia amber, mist blue). */
const STREAM_VERT = /* glsl */ `
attribute vec4 aThread; attribute vec2 aSeed;
uniform float uTime,uPx,uFocus,uQuiet,uTheme,uIntro,uScale; uniform vec3 uC0,uC1,uC2,uC3;
varying vec3 vCol; varying float vA; varying float vSoft;
${QUIET_GLSL}
void main(){
  const float L=150.;
  float x=mod(aSeed.x*L+uTime*aThread.w,L)-L*.5;
  float edge=smoothstep(L*.5,L*.36,abs(x));
  vec3 p=vec3(x,aThread.x+sin(x*.045+aThread.z+uTime*.1)*5.+sin(x*.12+aThread.z*2.)*1.1,aThread.y+cos(x*.03+aThread.z)*7.);
  p+=position*(1.+sin(uTime*.4+aSeed.x*30.)*.3);       // each thread is a loose braid, not a line
  vec4 mv=modelViewMatrix*vec4(p,1.); vec4 clip=projectionMatrix*mv; gl_Position=clip;
  float d=-mv.z; float coc=abs(d-uFocus)/uFocus;
  gl_PointSize=uPx*uScale*(1.6+coc*6.)*(55./max(d,1.));
  vec2 ndc=clip.xy/clip.w; vec2 sp=vec2((ndc.x*.5+.5)*uRes.x,(.5-ndc.y*.5)*uRes.y);
  float k=aSeed.y; vCol=k<.4?uC0:k<.68?uC1:k<.86?uC2:uC3;
  vA=mix(.34,.5,uTheme)*edge/(1.+coc*coc*12.)*(1.-quiet(sp)*uQuiet)*uIntro*step(.5,d)*(.75+.25*sin(uTime*1.7+aSeed.x*50.));
  vSoft=clamp(coc*3.,0.,1.);
}`;

// Shaders write final sRGB values directly, so keep colours un-converted.
ColorManagement.enabled = false;
const palette = {
  light: {bg: new Color('#F7F6F2'), a: new Color('#26352D'), b: new Color('#2F7A66'),
    s: ['#3C8A74', '#7FC2A8', '#D3A465', '#7E9FC4'].map(c => new Color(c))},
  dark: {bg: new Color('#16231D'), a: new Color('#DCE8E0'), b: new Color('#9FE0C6'),
    s: ['#6FC7A6', '#BFE8D6', '#E7C28A', '#A9C4E6'].map(c => new Color(c))},
};

/* ── shapes (world units: the frame is ~44 units tall at the focal plane) */
const rnd = Math.random;
const gauss = () => {let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());};
type Fill = (a: Float32Array, n: number) => void;
const turn = (a: Float32Array, rx: number, ry: number, rz = 0) => {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rx), Math.sin(rx), Math.cos(ry), Math.sin(ry), Math.cos(rz), Math.sin(rz)];
  for (let i = 0; i < a.length; i += 3) {
    let x = a[i], y = a[i + 1], z = a[i + 2];
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    [x, y] = [x * cz - y * sz, x * sz + y * cz];
    a[i] = x; a[i + 1] = y; a[i + 2] = z;
  }
};
const nebula: Fill = (a, n) => {
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i % 9 === 0) { // far dust
      const r = 26 + rnd() * 40, th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * .6; z = r * Math.sin(ph) * Math.sin(th) - 10;
    } else {
      const r = 1.2 + 23 * Math.pow(rnd(), .72), th = (i % 3) * 2.0944 + r * .3 + gauss() * .3 * (1 + 6 / (r + 2));
      x = Math.cos(th) * r; z = Math.sin(th) * r; y = gauss() * (.45 + 2.4 * Math.exp(-r * .16));
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  turn(a, -1.0, 0, .28);
};
const strata: Fill = (a, n) => {
  const rows = 9;
  for (let i = 0; i < n; i++) {
    const row = i % rows;
    let x = 0;
    for (let k = 0; k < 6; k++) { // message "pills" with gaps between them
      x = -22 + rnd() * 44;
      if (Math.sin(x * .36 + row * 1.7) + Math.sin(x * .13 + row * 3.1) > -1.05) break;
    }
    a[i * 3] = x * (1 - Math.abs(row - 4) * .03);
    a[i * 3 + 1] = (row - (rows - 1) / 2) * 2.7 + gauss() * .07;
    a[i * 3 + 2] = gauss() * .22 - row * .5;
  }
  turn(a, .16, -.38);
};
const glyph = (pts: number[], W: number, H: number): Fill => (a, n) => {
  const width = 34, height = width * H / W, count = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const k = (rnd() * count) | 0;
    a[i * 3] = ((pts[k * 2] + rnd()) / W - .5) * width;
    a[i * 3 + 1] = -((pts[k * 2 + 1] + rnd()) / H - .5) * height + 1;
    a[i * 3 + 2] = gauss() * .55;
  }
  turn(a, 0, -.16);
};
const ridges: Fill = (a, n) => {
  const L = 46;
  for (let i = 0; i < n; i++) {
    const line = (rnd() * L) | 0, z = -30 + line * 44 / L, x = (rnd() - .5) * 92;
    const A = 5 + (14 - z) * .3;
    const h = A * (.6 * Math.exp(-(((x + 20 + z * .3) / 10) ** 2)) + .85 * Math.exp(-(((x - 4 - z * .2) / 13) ** 2))
      + .55 * Math.exp(-(((x - 30) / 9) ** 2))) + .7 * Math.sin(x * .2 + z * .3);
    a[i * 3] = x; a[i * 3 + 1] = h - 11 + gauss() * .05; a[i * 3 + 2] = z;
  }
  turn(a, .2, 0);
};
const orb: Fill = (a, n) => {
  const shell = Math.floor(n * .58);
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i < shell) {
      const yy = 1 - (i + .5) / shell * 2, r = Math.sqrt(1 - yy * yy), th = i * 2.39996, R = 12.5 + gauss() * .12;
      x = Math.cos(th) * r * R; y = yy * R; z = Math.sin(th) * r * R;
    } else {
      // Saturn-like rings: a dense inner band, a gap, a broad outer band and a faint halo
      const b = rnd();
      const R = b < .55 ? 16.8 + Math.pow(rnd(), .7) * 2.8 : b < .9 ? 20.6 + rnd() * 2.6 : 24 + rnd() * 1.4;
      const th = rnd() * Math.PI * 2;
      x = Math.cos(th) * R; y = gauss() * .09; z = Math.sin(th) * R;
      const c = Math.cos(.42), s = Math.sin(.42); [y, z] = [y * c - z * s, y * s + z * c];
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  turn(a, 0, 0, -.18);
};
const sea: Fill = (a, n) => {
  const L = 64;
  for (let i = 0; i < n; i++) {
    const row = (rnd() * L) | 0;
    a[i * 3] = (rnd() - .5) * 110; a[i * 3 + 1] = -7 + gauss() * .04; a[i * 3 + 2] = -46 + row * 60 / L + gauss() * .08;
  }
};
const ribbon: Fill = (a, n) => {
  for (let i = 0; i < n; i++) {
    const t = rnd() * Math.PI * 2, w = (rnd() - .5) * 9, tw = t * 1.5, R = 17;
    const off = Math.cos(tw) * w, up = Math.sin(tw) * w + gauss() * .1;
    a[i * 3] = Math.cos(t) * (R + off); a[i * 3 + 1] = up; a[i * 3 + 2] = Math.sin(t) * (R + off);
  }
  turn(a, .55, 0, .12);
};

/* three interlaced rings: Android, Apple, HarmonyOS */
const trio: Fill = (a, n) => {
  for (let i = 0; i < n; i++) {
    const k = i % 3, t = rnd() * Math.PI * 2, R = 11 + gauss() * .1, tube = gauss() * .18;
    let x = Math.cos(t) * (R + tube), y = Math.sin(t) * (R + tube), z = gauss() * .18;
    const tilt = .9, c = Math.cos(tilt), s = Math.sin(tilt); [y, z] = [y * c - z * s, y * s + z * c];
    const ang = k * 2.0944, ca = Math.cos(ang), sa = Math.sin(ang); [x, z] = [x * ca + z * sa, -x * sa + z * ca];
    // each ring sits a little off-centre so the three cross in six places, not two
    a[i * 3] = x + Math.cos(ang) * 3.2; a[i * 3 + 1] = y + Math.sin(ang * 2) * 1.2; a[i * 3 + 2] = z - Math.sin(ang) * 3.2;
  }
  turn(a, .32, 0);
};

/* local-first: a crystal lattice — nodes and the edges between them, data kept in one ordered place */
const lattice: Fill = (a, n) => {
  const G = 7, S = 3.4, h = (G - 1) / 2;
  for (let i = 0; i < n; i++) {
    const nx = (rnd() * G) | 0, ny = (rnd() * G) | 0, nz = (rnd() * G) | 0;
    let x = (nx - h) * S, y = (ny - h) * S, z = (nz - h) * S;
    if (rnd() < .42) {x += gauss() * .12; y += gauss() * .12; z += gauss() * .12;} // node
    else { // edge towards a neighbour
      const t = rnd() * S, ax = (rnd() * 3) | 0;
      if (ax === 0 && nx < G - 1) x += t; else if (ax === 1 && ny < G - 1) y += t; else if (nz < G - 1) z += t;
      x += gauss() * .04; y += gauss() * .04; z += gauss() * .04;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  turn(a, .52, .62);
};
/* built to last: a double helix with rungs */
const helix: Fill = (a, n) => {
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (rnd() < .74) {
      y = (rnd() - .5) * 44; const th = y * .3 + (i & 1) * Math.PI, R = 7 + gauss() * .22;
      x = Math.cos(th) * R; z = Math.sin(th) * R;
    } else {
      y = (Math.floor(rnd() * 28) - 13.5) * 1.6; const th = y * .3, u = rnd() * 2 - 1;
      x = Math.cos(th) * 7 * u; z = Math.sin(th) * 7 * u; y += gauss() * .05;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  turn(a, .12, 0, .42);
};
/* changelog: tree rings — every version one more ring */
const treeRings: Fill = (a, n) => {
  const K = 15;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.pow(rnd(), .8) * K), th = rnd() * Math.PI * 2;
    const r = 1.6 + k * 1.45 + .4 * Math.sin(3 * th + k) + .22 * Math.sin(7 * th + k * 2) + gauss() * .06;
    a[i * 3] = Math.cos(th) * r; a[i * 3 + 1] = gauss() * .14 - k * .05; a[i * 3 + 2] = Math.sin(th) * r;
  }
  turn(a, .5, 0, .08);
};
/* a layered flower: three whorls of petals opening around a small core */
const flower: Fill = (a, n) => {
  const layers = [[15, 2.5, 5, 0], [10.5, 5, 5, .63], [6.5, 7, 6, .2]];
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (rnd() < .06) {const r = 1.6 * Math.cbrt(rnd()), th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1); x = r * Math.sin(ph) * Math.cos(th); y = 6 + r * Math.cos(ph); z = r * Math.sin(ph) * Math.sin(th);}
    else {
      const [R, H, P, off] = layers[(rnd() * 3) | 0], th = rnd() * Math.PI * 2;
      const petal = Math.pow(Math.abs(Math.cos(P / 2 * th + off)), .8), u = Math.sqrt(rnd());
      const r = u * R * (.25 + .75 * petal);
      x = Math.cos(th) * r; z = Math.sin(th) * r; y = u * u * H + gauss() * .05;
    }
    a[i * 3] = x; a[i * 3 + 1] = y - 4; a[i * 3 + 2] = z;
  }
  turn(a, .62, 0);
};

async function glyphPoints() {
  const W = 640, H = 300;
  try {await Promise.race([document.fonts.load('900 220px "LX Serif"', '珞序'), new Promise(r => setTimeout(r, 900))]);} catch {/* system serif */}
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', {willReadFrequently: true});
  if (!g) return null;
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 250px "LX Serif","Songti SC","Noto Serif SC","STSong","SimSun",serif`;
  g.fillText('珞序', W / 2, H / 2 + 8);
  const d = g.getImageData(0, 0, W, H).data, pts: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
  return pts.length > 200 ? {pts, W, H} : null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {const t = clamp01((v - a) / (b - a));return t * t * (3 - 2 * t);};
const KEY = 'luoxu:scene';
const progress = (p: number) => dispatchEvent(new CustomEvent('luoxu:progress', {detail: p}));

/* Home chapters → shape index. Other pages spread their SEQS entry over their top-level sections. */
const HOME_ANCHORS: [string, number][] = [
  ['.hero3', 0], ['.order-stage', 1], ['.story-stage', 2], ['.preview-chapter', 3], ['.chapter-tint', 4], ['.privacy-story', 5],
  ['.chapter-local', 6], ['.chapter-last', 7], ['.chapter-download', 8], ['.ready-stage', 9],
];

/* Text blocks the background makes room for, with how much it yields (0..1). */
const QUIET_SELECTORS: [string, number][] = [
  ['.hero3-copy', .9], ['.mega', .32], ['.order-head', .9], ['.order-steps', .85], ['.order-note', .7],
  ['.story-hw', .5], ['.drift-field', .62], ['.story-caps', .9], ['.story-line', .9], ['.poster-h', .6], ['.poster-tail', .85],
  ['.chapter-head', .9], ['.preview-copy', .9], ['.more-link', .8], ['.download-copy', .92], ['.open-source h2', .9], ['.os-copy', .9],
  ['.privacy-copy', .85], ['.architecture-note', .8], ['.page-header', .55], ['.story-intro', .9], ['.story-sec', .9],
  ['.install-guide', .9], ['.section-head', .7], ['.testing-grid', .88], ['.download-faq', .85], ['.release-entry', .7],
  ['.feedback', .88], ['.ready-head', .9], ['.ready-list', .85], ['.ready-foot', .8], ['.footer-top', .85], ['.footer-note', .8],
];

export interface SceneHandle {dispose(): void}

export async function startScene(canvas: HTMLCanvasElement, opts: {reduced: boolean; mobile: boolean}): Promise<SceneHandle | null> {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: false});
  } catch { return null; }
  if (!renderer.getContext()) return null;
  progress(.15);

  const mobile = opts.mobile;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2);
  renderer.setPixelRatio(pixelRatio);
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, .5, 400);

  // ── geometry: one buffer per shape; three of them are bound to the slots at any time
  const N = mobile ? 56000 : 90000;
  const geo = new BufferGeometry();
  const glyphData = await glyphPoints();
  progress(.4);
  const fills: Fill[] = [nebula, strata, glyphData ? glyph(glyphData.pts, glyphData.W, glyphData.H) : orb, ridges, sea, orb,
    lattice, helix, ribbon, trio, treeRings, flower];
  const shapeAttrs: BufferAttribute[] = [];
  for (const [i, fill] of fills.entries()) {
    const a = new Float32Array(N * 3);
    fill(a, N);
    shapeAttrs.push(new BufferAttribute(a, 3));
    await new Promise<void>(r => setTimeout(r, 0)); // keep input responsive while building
    progress(.4 + .4 * (i + 1) / SHAPES);
  }
  geo.setAttribute('position', shapeAttrs[0]); // draw count only; the shader reads the slots
  ['aP0', 'aP1', 'aP2'].forEach(k => geo.setAttribute(k, shapeAttrs[0]));
  const seed = new Float32Array(N * 2);
  for (let i = 0; i < seed.length; i++) seed[i] = rnd();
  geo.setAttribute('aSeed', new BufferAttribute(seed, 2));

  const rects = Array.from({length: MAX_RECTS}, () => new Vector4());
  const U = {
    uMorph: {value: 0}, uTime: {value: 0}, uVel: {value: 0}, uPx: {value: pixelRatio}, uFocus: {value: 62}, uIntro: {value: 0},
    uScale: {value: 1}, uTheme: {value: 0}, uMouse: {value: new Vector2(9, 9)}, uMouseV: {value: new Vector2()},
    uRects: {value: rects}, uRectK: {value: new Array(MAX_RECTS).fill(0)}, uRectN: {value: 0},
    uRes: {value: new Vector3(1, 1, 0)}, uPad: {value: 90}, uQuiet: {value: 1},
    uSeqN: {value: 1}, uBase: {value: 0},
    uCA: {value: [new Color(), new Color(), new Color()]}, uCB: {value: [new Color(), new Color(), new Color()]},
    uSea: {value: new Vector3()}, uIri: {value: new Vector3()}, uCalm: {value: new Vector3()},
  };
  const mat = new ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthTest: false, depthWrite: false, blending: NormalBlending});
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);

  // ── ambient streams behind the shapes
  const T = mobile ? 34 : 56, PER = mobile ? 60 : 80, SN = T * PER;
  const sGeo = new BufferGeometry();
  const jit = new Float32Array(SN * 3), thread = new Float32Array(SN * 4), sSeed = new Float32Array(SN * 2);
  for (let t = 0; t < T; t++) {
    const y0 = (rnd() - .5) * 46, z0 = -42 + rnd() * 72, ph = rnd() * 6.28, sp = (1 + rnd() * 2.4) * (rnd() < .5 ? -1 : 1), col = rnd();
    for (let k = 0; k < PER; k++) {
      const i = t * PER + k;
      jit[i * 3] = gauss() * .5; jit[i * 3 + 1] = gauss() * .5; jit[i * 3 + 2] = gauss() * .5;
      thread.set([y0, z0, ph, sp], i * 4);
      // motes gather in loose clusters along their thread; one thread mostly keeps one colour
      sSeed[i * 2] = (Math.floor(k / 8) * .1 + rnd() * .05 + t * .37) % 1;
      sSeed[i * 2 + 1] = rnd() < .8 ? col : rnd();
    }
  }
  sGeo.setAttribute('position', new BufferAttribute(jit, 3));
  sGeo.setAttribute('aThread', new BufferAttribute(thread, 4));
  sGeo.setAttribute('aSeed', new BufferAttribute(sSeed, 2));
  const SU = {
    uTime: U.uTime, uPx: U.uPx, uFocus: U.uFocus, uQuiet: U.uQuiet, uTheme: U.uTheme, uIntro: U.uIntro, uScale: U.uScale,
    uRects: U.uRects, uRectK: U.uRectK, uRectN: U.uRectN, uRes: U.uRes, uPad: U.uPad,
    uC0: {value: new Color()}, uC1: {value: new Color()}, uC2: {value: new Color()}, uC3: {value: new Color()},
  };
  const sMat = new ShaderMaterial({vertexShader: STREAM_VERT, fragmentShader: FRAG, uniforms: SU, transparent: true, depthTest: false, depthWrite: false, blending: NormalBlending});
  const streams = new Points(sGeo, sMat);
  streams.frustumCulled = false;
  streams.renderOrder = 0;
  scene.add(streams);

  // ── state: the page's shape sequence, its scroll anchors and dark zones
  let zones: {top: number; bottom: number}[] = [];
  let anchors: {y: number; i: number}[] = [];          // i: index into seq
  let pageAnchors: {el: HTMLElement; i: number}[] = [];
  let seq: number[] = [0], leadN = 0, maxScroll = 1, vh = innerHeight;
  let posCurve = new CatmullRomCurve3([new Vector3(), new Vector3(0, 0, 1)]), lookCurve = posCurve;
  /* The page's sequence. `from` (the shape on screen as the page arrives) goes in front, so a new page — or a reload —
     opens by morphing out of whatever the visitor last saw. */
  const setSeq = (from: number | null) => {
    const key = document.body.dataset.scene || 'calm';
    let base: number[] = [];
    pageAnchors = [];
    if (key === 'home') {
      for (const [sel, g] of HOME_ANCHORS) {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) {pageAnchors.push({el, i: base.length}); base.push(g);}
      }
      if (!base.length) base = [0];
    } else {
      base = SEQS[key] ?? SEQS.calm;
      const secs = Array.from(document.querySelectorAll<HTMLElement>('main > *'));
      base.forEach((_, i) => {
        const el = secs[Math.round(i * (secs.length - 1) / Math.max(1, base.length - 1))];
        if (el) pageAnchors.push({el, i});
      });
    }
    leadN = from != null && from !== base[0] ? 1 : 0;
    seq = (leadN ? [from as number, ...base] : base.slice()).slice(0, MAX_SEQ);
    pageAnchors.forEach(a => {a.i += leadN;});
    U.uSeqN.value = seq.length;
    boundBase = -1;
    buildCurves();
  };
  /* Each pose steps back (or in) along its own line of sight by the shape's framing factor. */
  const fitK = new Array<number>(SHAPES).fill(1);
  let portrait = false;
  const buildCurves = () => {
    const pts = seq.length > 1 ? seq : [seq[0], seq[0]];
    lookCurve = new CatmullRomCurve3(pts.map(g => new Vector3(...POSES[g][1])), false, 'centripetal');
    posCurve = new CatmullRomCurve3(pts.map(g => {
      const look = new Vector3(...POSES[g][1]);
      return new Vector3(...POSES[g][0]).sub(look).multiplyScalar(fitK[g]).add(look);
    }), false, 'centripetal');
  };
  /* Portrait framing: project a sample of each shape from its pose (with its roll) and set the distance at which the
     shape's outer edge (99th percentile: a few stray points may leave) meets its share of the width, and never runs off
     the top or bottom. */
  const probe = new PerspectiveCamera(40, 1, .5, 400), pv = new Vector3(), pl = new Vector3();
  const frameShapes = () => {
    portrait = camera.aspect < .9;
    const wide = 1 / Math.pow(Math.min(1, camera.aspect), .6);
    probe.aspect = camera.aspect; probe.updateProjectionMatrix();
    const xs: number[] = [], ys: number[] = [], q = (v: number[]) => v.sort((a, b) => a - b)[Math.floor(v.length * .99)] || 1;
    for (let g = 0; g < SHAPES; g++) {
      const [fit, rollDeg] = PORTRAIT[g];
      if (!portrait || !fit) {fitK[g] = wide; continue;}
      const a = shapeAttrs[g].array as Float32Array;
      pl.set(...(POSES[g][1] as [number, number, number]));
      let k = wide;
      for (let pass = 0; pass < 2; pass++) { // perspective makes it slightly non-linear; a second pass settles it
        probe.position.set(...(POSES[g][0] as [number, number, number])).sub(pl).multiplyScalar(k).add(pl);
        probe.lookAt(pl); probe.rotateZ(rollDeg * DEG); probe.updateMatrixWorld();
        xs.length = ys.length = 0;
        for (let i = 0; i < N; i += 29) {
          pv.fromArray(a, i * 3).project(probe);
          if (pv.z < 1) {xs.push(Math.abs(pv.x)); ys.push(Math.abs(pv.y));}
        }
        k *= Math.max(q(xs) / fit, q(ys) / .84);
      }
      fitK[g] = MathUtils.clamp(k, .8, 3.4);
    }
    buildCurves();
  };
  /* Bind the three sequence entries around the playhead. The window only moves once every point has left its first
     slot (uMorph - 0.17 crossed an integer), so a swap is never visible. Buffers are already on the GPU: a rebind. */
  let boundBase = -1;
  const COLS = SHAPE_COLS.map(([a, b]) => [new Color(a), new Color(b)]);
  const bindSlots = (m: number) => {
    const b = Math.max(0, Math.min(Math.max(0, seq.length - 3), Math.floor(m - .17)));
    if (b === boundBase) return;
    boundBase = b; U.uBase.value = b;
    const flags = (g: number) => [0, 1, 2].map(k => (seq[Math.min(seq.length - 1, b + k)] === g ? 1 : 0)) as [number, number, number];
    for (let k = 0; k < 3; k++) {
      const g = seq[Math.min(seq.length - 1, b + k)];
      geo.setAttribute(`aP${k}`, shapeAttrs[g]);
      (U.uCA.value as Color[])[k].copy(COLS[g][0]); (U.uCB.value as Color[])[k].copy(COLS[g][1]);
    }
    U.uSea.value.set(...flags(4)); U.uIri.value.set(...flags(9)); U.uCalm.value.set(...flags(0));
  };
  const measure = () => {
    vh = innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    zones = Array.from(document.querySelectorAll<HTMLElement>('[data-tone=dark]')).map(el => {
      const r = el.getBoundingClientRect();
      return {top: r.top + scrollY, bottom: r.top + scrollY + r.height};
    });
    anchors = [];
    for (const {el, i} of pageAnchors) {
      // on phones a chapter opens with an open screen (.scene-gap, before it or first inside it): its shape forms there
      const gap = el.querySelector<HTMLElement>(':scope > .scene-gap')
        ?? (el.previousElementSibling?.classList.contains('scene-gap') ? el.previousElementSibling as HTMLElement : null);
      const r = (gap?.offsetHeight ? gap : el).getBoundingClientRect();
      const y = !anchors.length ? 0 : Math.min(maxScroll, Math.max(0, r.top + scrollY + Math.min(r.height, vh * 1.4) * .5 - vh * .5));
      if (!anchors.length || y > anchors[anchors.length - 1].y + 1) anchors.push({y, i});
    }
  };
  const targetMorph = () => {
    const y = scrollY;
    if (!anchors.length) return seq.length - 1;
    if (y <= anchors[0].y) return anchors[0].i;
    for (let k = 1; k < anchors.length; k++) {
      const a = anchors[k - 1], b = anchors[k];
      if (y <= b.y) return a.i + (b.i - a.i) * smooth(.18, .82, (y - a.y) / (b.y - a.y));
    }
    return anchors[anchors.length - 1].i;
  };  const themeNow = () => {
    let t = 0;
    // a dark chapter that opens with a phone's scene gap is already night by the time the gap is centred
    const lead = portrait ? vh * .3 : 0;
    for (const z of zones) {
      const enter = smooth(z.top - vh * .55 - lead, z.top + vh * .05 - lead, scrollY);
      const leave = 1 - smooth(z.bottom - vh * .6, z.bottom - vh * .1, scrollY);
      t = Math.max(t, enter * leave);
    }
    return t;
  };

  // ── quiet mask: only text blocks near the viewport are measured
  const quietEls = new Map<Element, number>();
  const visible = new Set<Element>();
  let ro: ResizeObserver | null = null;
  const scanQuiet = () => {
    io.disconnect(); visible.clear();
    quietEls.forEach((_, el) => ro?.unobserve(el)); quietEls.clear();
    for (const [sel, k] of QUIET_SELECTORS) document.querySelectorAll(sel).forEach(el => quietEls.set(el, k));
    quietEls.forEach((_, el) => {io.observe(el); ro?.observe(el);});
    rectsDirty = true;
  };
  let rectsDirty = true, rectScroll = -1, measuredAt = -1e9;
  const CARRY = .33;
  const io = new IntersectionObserver(es => {
    es.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    rectsDirty = true;
  }, {rootMargin: '25% 0px'});
  /* Text blocks that move by transform (scrubbed headings, gliding stages) are re-measured a few times a second while
     the page moves, and never while it rests. (A MutationObserver on style changes would receive thousands of records
     per frame from the per-character heading reveals.) */
  let rectAt = 0;
  document.fonts.ready.then(() => {rectsDirty = true;});
  const updateRects = () => {
    const y = scrollY;
    // plain scrolling carries the measured clearings along; a fresh layout read only on change or every third screen
    if (!rectsDirty && Math.abs(y - measuredAt) < vh * CARRY) {
      if (rectScroll !== y) {
        const dy = (rectScroll - y) * renderer.getPixelRatio();
        for (let i = 0; i < U.uRectN.value; i++) {rects[i].y += dy; rects[i].w += dy;}
        rectScroll = y;
      }
      return;
    }
    rectsDirty = false;rectScroll = measuredAt = y;
    let n = 0;
    const pr = renderer.getPixelRatio();
    const K = U.uRectK.value as number[];
    const band = 120 + vh * CARRY;
    const push = (l: number, t: number, r: number, b: number, k: number) => {
      if (n >= MAX_RECTS || b < -band || t > vh + band || r - l < 2) return;
      rects[n].set(l * pr, t * pr, r * pr, b * pr); K[n] = k; n++;
    };
    for (const el of visible) {
      const r = el.getBoundingClientRect(), k = quietEls.get(el) ?? .85;
      if (el.classList.contains('drift-field')) {
        const kids = Array.from(el.children) as HTMLElement[], half = kids.length / 2;
        [kids.slice(0, half), kids.slice(half)].forEach(col => {
          if (!col.length) return;
          let l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity;
          for (const c of col) {l = Math.min(l, c.offsetLeft); t = Math.min(t, c.offsetTop); rr = Math.max(rr, c.offsetLeft + c.offsetWidth); b = Math.max(b, c.offsetTop + c.offsetHeight);}
          push(r.left + l, r.top + t, r.left + rr, r.top + b, k);
        });
      } else push(r.left, r.top, r.right, r.bottom, k);
    }
    U.uRectN.value = n;
    U.uPad.value = (mobile ? 56 : 84) * pr;
  };

  let stored: {g: number; theme: number} | null = null;
  try {stored = JSON.parse(sessionStorage.getItem(KEY) || 'null');} catch {/* private mode */}
  if (stored && !(stored.g >= 0 && stored.g < SHAPES)) stored = null;
  setSeq(stored && !opts.reduced ? stored.g : null);
  measure();
  const morph = spring(leadN ? 0 : targetMorph());
  const shownShape = () => seq[Math.min(seq.length - 1, Math.max(0, Math.round(morph.value)))];
  let theme = stored ? stored.theme : themeNow();
  const intro = spring(stored ? 1 : 0);
  let introOn = !document.documentElement.classList.contains('gate');
  addEventListener('luoxu:enter', () => {introOn = true;}, {once: true});
  const mx = spring(), my = spring(), roll = spring(), vel = spring();
  let mouseX = 0, mouseY = 0, ndcX = 9, ndcY = 9, lastY = scrollY, velocity = 0, section = -1, still = 0, floatW = 0;
  const camP = new Vector3(), camL = new Vector3(), fwd = new Vector3(), right = new Vector3(), UP = new Vector3(0, 1, 0);

  const ptr = (e: PointerEvent) => {
    mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = (e.clientY / innerHeight) * 2 - 1;
    if (e.pointerType === 'mouse') {ndcX = mouseX; ndcY = -mouseY;}
  };
  const leave = () => {ndcX = ndcY = 9;};
  const gyro = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    mouseX = MathUtils.clamp(e.gamma / 30, -1, 1); mouseY = MathUtils.clamp((e.beta - 50) / 40, -1, 1);
  };
  // on touch the finger is the hand in the water: the field parts under it while it rests or scrolls the page
  const touch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) {ndcX = (t.clientX / innerWidth) * 2 - 1; ndcY = 1 - (t.clientY / innerHeight) * 2;}
  };
  const untouch = (e: TouchEvent) => {if (!e.touches.length) leave();};
  window.addEventListener('pointermove', ptr, {passive: true});
  document.documentElement.addEventListener('pointerleave', leave);
  if (mobile) {
    addEventListener('touchstart', touch, {passive: true}); addEventListener('touchmove', touch, {passive: true});
    addEventListener('touchend', untouch, {passive: true}); addEventListener('touchcancel', untouch, {passive: true});
  }
  // tilting the phone turns the camera; iOS asks first, inside the tap that enters the site
  const DOE = (window as {DeviceOrientationEvent?: {requestPermission?: () => Promise<string>}}).DeviceOrientationEvent;
  if (mobile && DOE) {
    if (typeof DOE.requestPermission !== 'function') addEventListener('deviceorientation', gyro, {passive: true});
    else addEventListener('luoxu:enter', () => {
      DOE.requestPermission!().then(s => {if (s === 'granted') addEventListener('deviceorientation', gyro, {passive: true});}, () => undefined);
    }, {once: true});
  }

  let lastW = innerWidth, lastH = innerHeight;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    rectsDirty = true;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frameShapes();
    (U.uRes.value as Vector3).set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio(), 0);
    measure();
    lastW = w; lastH = h;
  };
  resize();
  ro = new ResizeObserver(() => {
    rectsDirty = true;
    if (innerWidth !== lastW || innerHeight !== lastH) resize(); else measure();
  });
  ro.observe(document.documentElement);
  scanQuiet();
  // client-side navigation: same canvas, new page — rebuild the sequence from the shape on screen
  let scannedBody = document.body;
  const rescan = () => {
    if (document.body === scannedBody) return;
    scannedBody = document.body;
    setSeq(shownShape()); morph.value = 0; morph.velocity = 0; section = -1;
    scanQuiet(); measure();
  };
  document.addEventListener('astro:page-load', rescan);

  const cA = new Color();
  let lastTheme = -1;
  function mixTheme(t: number) {
    if (Math.abs(t - lastTheme) < .0005) return;
    lastTheme = t;
    const L = palette.light, D = palette.dark;
    const bg = cA.copy(L.bg).lerp(D.bg, t);
    renderer.setClearColor(bg, 1);
    document.documentElement.style.setProperty('--scene-bg', '#' + bg.getHexString());
    [SU.uC0, SU.uC1, SU.uC2, SU.uC3].forEach((u, i) => u.value.copy(L.s[i]).lerp(D.s[i], t));
    U.uQuiet.value = MathUtils.lerp(1, .85, t); U.uTheme.value = t;
    document.documentElement.dataset.theme = t > .5 ? 'dark' : 'light';
  }

  /* Adaptive quality, judged against the display's own refresh: a 60 Hz panel (or a laptop in power-saving mode that
     drops to 60 Hz) is not "slow" just because its frames take 16.7 ms. Only frames that miss vsync count, and any
     step down waits until the page is at rest, so it can never hitch a scroll. */
  let vsync = 1000 / 60, vsyncN = 0, vsyncMin = 1e9;
  let running = true, raf = 0, last = performance.now(), time = 0, slow = 0, frames = 0, drawN = N, pendingDrop = false;
  let lastInput = 0, skipTick = 0, skipped = false;
  const wake = () => {lastInput = performance.now();};
  addEventListener('scroll', wake, {passive: true}); addEventListener('pointermove', wake, {passive: true});
  addEventListener('wheel', wake, {passive: true}); addEventListener('touchstart', wake, {passive: true});
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    /* At rest on a fast display (≥ 90 Hz) the field only drifts; drawing every other refresh still gives 60+ fps there
       and halves the GPU's work while nobody is touching the page. Any input restores full rate on the next frame. */
    const idle = vsync < 11 && still > 2 && now - lastInput > 1500 && Math.abs(morph.velocity) < 1e-3;
    if (idle && (++skipTick & 1)) {skipped = true; return;}
    const dtMs = now - last;
    const dt = Math.min(.05, dtMs / 1000); last = now; time += dt;
    const after = skipped; skipped = false;

    if (!after && dtMs > 2 && dtMs < 40) {
      // the refresh interval is the shortest interval seen (robust to occasional misses)
      vsyncMin = Math.min(vsyncMin, dtMs);
      if (++vsyncN % 120 === 0) {vsync = vsyncMin; vsyncMin = 1e9;}
    }
    if (frames > 180 && !after) { // ignore warm-up (first frames, first scroll while caches fill)
      if (dtMs > vsync * 1.7) slow++; else slow = Math.max(0, slow - .5);
      if (slow > 45) {pendingDrop = true; slow = 0;}
    }
    ++frames;
    if (pendingDrop && still > .8) {
      pendingDrop = false;
      if (drawN > N * .6) {drawN = Math.floor(drawN * .85); geo.setDrawRange(0, drawN);}
      else if (pixelRatio > 1.25) {
        pixelRatio = Math.max(1.25, pixelRatio - .25); renderer.setPixelRatio(pixelRatio); U.uPx.value = pixelRatio;
        renderer.setSize(innerWidth, innerHeight, false);
        (U.uRes.value as Vector3).set(innerWidth * pixelRatio, innerHeight * pixelRatio, 0); rectsDirty = true;
      }
    }

    const y = scrollY;
    velocity += ((y - lastY) / Math.max(dt, .001) / vh - velocity) * Math.min(1, dt * 8); lastY = y;
    const m = damp(morph, targetMorph(), mobile ? .55 : .7, dt);
    const si = Math.round(m), sec = seq[Math.min(seq.length - 1, Math.max(0, si))];
    if (si >= leadN && sec !== section) {section = sec; dispatchEvent(new CustomEvent('luoxu:section', {detail: sec}));}
    theme += (themeNow() - theme) * (1 - Math.exp(-dt * 6));
    damp(mx, mouseX, .9, dt); damp(my, mouseY, .9, dt);
    damp(roll, MathUtils.clamp(-velocity * .04, -.06, .06), .5, dt);
    U.uVel.value = damp(vel, Math.min(2.5, Math.abs(velocity)), .35, dt);
    if (introOn) U.uIntro.value = damp(intro, 1, 1.1, dt);

    // drone camera: the spline carries it between chapter poses; the pointer turns the head; at rest it floats
    still = Math.abs(velocity) < .02 ? still + dt : 0;
    floatW += ((still > .6 ? 1 : 0) - floatW) * (1 - Math.exp(-dt * (still > .6 ? .8 : 6)));
    const u = seq.length > 1 ? clamp01(m / (seq.length - 1)) : 0;
    posCurve.getPoint(u, camP); lookCurve.getPoint(u, camL);
    // the two shapes in play blend their portrait framing: roll, and a point size that keeps pace with the distance
    const s0 = Math.max(0, Math.floor(m)), sf = smooth(0, 1, m - s0);
    const g0 = seq[Math.min(seq.length - 1, s0)], g1 = seq[Math.min(seq.length - 1, s0 + 1)];
    const lean = portrait ? MathUtils.lerp(PORTRAIT[g0][1], PORTRAIT[g1][1], sf) * DEG : 0;
    const kNow = MathUtils.lerp(fitK[g0], fitK[g1], sf);
    U.uScale.value = (mobile ? 1.15 : 1) * Math.sqrt(kNow);
    fwd.subVectors(camL, camP).normalize(); right.crossVectors(fwd, UP).normalize();
    const sway = Math.sqrt(kNow); // a farther camera sways farther, so tilting a phone moves the shape as much
    camP.addScaledVector(right, mx.value * 1.8 * sway).addScaledVector(UP, (-my.value * .9 + Math.sin(time * .9) * .4 * floatW) * sway)
      .addScaledVector(right, Math.sin(time * .43) * .5 * floatW * sway);
    camera.position.copy(camP); camera.lookAt(camL);
    camera.rotateY(-mx.value * 2.5 * DEG); camera.rotateX(-my.value * 2.4 * DEG); camera.rotateZ(roll.value - mx.value * 1.75 * DEG + lean);
    U.uFocus.value = camP.distanceTo(camL);
    points.rotation.set(Math.sin(time * .11) * .025, Math.sin(time * .07) * .05, 0);
    const M = U.uMouse.value, MV = U.uMouseV.value, px = M.x, py = M.y, inside = Math.abs(ndcX) < 2;
    if (inside && Math.abs(px) >= 2) M.set(ndcX, ndcY); // entering the window: no streak from off-screen
    // the parting sits under the cursor (only a frame of easing); the wake keeps a short memory of the motion
    M.x += (ndcX - M.x) * (1 - Math.exp(-dt * 45));
    M.y += (ndcY - M.y) * (1 - Math.exp(-dt * 45));
    const kv = 1 - Math.exp(-dt * 14);
    MV.x += ((inside ? (M.x - px) / Math.max(dt, .001) : 0) - MV.x) * kv;
    MV.y += ((inside ? (M.y - py) / Math.max(dt, .001) : 0) - MV.y) * kv;
    U.uMorph.value = m;
    bindSlots(m);
    U.uTime.value = time;
    if (still < .3 && now - rectAt > 250) {rectAt = now; rectsDirty = true;}
    updateRects();
    mixTheme(theme);
    renderer.render(scene, camera);
    if (frames === 2) {live(); progress(1);}
  }
  /* The field is up: html.webgl opens the phone's scene gaps. Whatever the reader is looking at stays put (the gaps
     above it would push it down), and scroll-driven motion re-measures. */
  function live() {
    const ref = document.elementFromPoint(innerWidth / 2, innerHeight / 2), top = ref?.getBoundingClientRect().top ?? 0;
    document.documentElement.classList.add('webgl');
    const shift = ref ? ref.getBoundingClientRect().top - top : 0;
    if (Math.abs(shift) > 1) scrollBy(0, shift);
    measure();
    dispatchEvent(new Event('luoxu:layout'));
  }

  const onVis = () => {running = !document.hidden; last = performance.now();};
  document.addEventListener('visibilitychange', onVis);
  const save = () => {try {sessionStorage.setItem(KEY, JSON.stringify({g: shownShape(), theme}));} catch {/* ignore */}};
  addEventListener('pagehide', save);
  addEventListener('load', measure);
  // layout settles late (fonts, split text); after that the ResizeObserver on <html> catches every height change
  const remeasure = setInterval(measure, 1500);
  setTimeout(() => clearInterval(remeasure), 6000);

  await renderer.compileAsync(scene, camera);
  // Upload every shape buffer now, behind the loader, by drawing a single point with each bound once. Otherwise the
  // first time a chapter's shape comes into play its ~1 MB buffer would be uploaded mid-scroll.
  geo.setDrawRange(0, 1);
  for (const a of shapeAttrs) {geo.setAttribute('aP0', a); renderer.render(scene, camera);}
  geo.setDrawRange(0, drawN); boundBase = -1;
  progress(.92);
  last = performance.now();
  if (opts.reduced) {
    intro.value = U.uIntro.value = 1;
    const still = () => {morph.value = targetMorph(); theme = themeNow(); frame(performance.now()); cancelAnimationFrame(raf);};
    still();
    addEventListener('scroll', still, {passive: true});
    live(); still(); progress(1);
  } else raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf); clearInterval(remeasure); ro.disconnect(); io.disconnect(); save();
      removeEventListener('pointermove', ptr); removeEventListener('deviceorientation', gyro);
      removeEventListener('touchstart', touch); removeEventListener('touchmove', touch);
      removeEventListener('touchend', untouch); removeEventListener('touchcancel', untouch);
      ['scroll', 'pointermove', 'wheel', 'touchstart'].forEach(t => removeEventListener(t, wake));
      document.documentElement.removeEventListener('pointerleave', leave); document.removeEventListener('astro:page-load', rescan);
      document.removeEventListener('visibilitychange', onVis); removeEventListener('pagehide', save);
      geo.dispose(); mat.dispose(); sGeo.dispose(); sMat.dispose(); renderer.dispose();
    },
  };
}
