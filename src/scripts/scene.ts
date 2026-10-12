/**
 * LUOXU "Luojia, in layers" — an original three.js object.
 *
 * Six sculpted ridges stand one behind another like a shan-shui scroll: smooth clay forms with a soft side light,
 * a warm terminator, atmospheric rims and valley mist; nothing is simulated that the eye would have to read.
 * A few hundred motes drift between the ridges and settle into level strata (纷杂 → 有序) as the page begins.
 *
 * The background yields to the copy: the screen rectangles of visible text blocks are passed to the shaders,
 * which dissolve the ridges into mist behind them, so the type never needs a glow.
 *
 * Motion follows the drone.riotters.com recipe: scroll progress drives a camera spline through a critically damped
 * spring (weight, no overshoot); the pointer turns the camera (yaw / pitch / roll, never a slide); when the scroll
 * comes to rest the camera floats. Everything is a function of (smoothed progress, pointer, time), so reversing the
 * scroll reverses the motion. Reduced motion renders one still frame; no WebGL leaves the CSS ridges.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, SphereGeometry, ShaderMaterial, Mesh, Points, BufferGeometry,
  BufferAttribute, Color, ColorManagement, Vector3, Vector4, CatmullRomCurve3, MathUtils, BackSide, NormalBlending,
} from 'three';
import {spring, damp} from './damp';

const MAX_RECTS = 12;

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}`;

/* Soft "clearing" behind text, like mist pooling around the words: each block is a heavily rounded box with a wide,
   slightly irregular falloff, and the blocks merge additively so neighbouring clearings never show a seam. */
const QUIET_GLSL = /* glsl */ `
uniform vec4 uRects[${MAX_RECTS}]; uniform float uRectK[${MAX_RECTS}]; uniform int uRectN; uniform vec3 uRes; uniform float uPad;
float quiet(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y); float q=0.;
  float wob=(noise(p/(uPad*2.2)+uRes.z*.04)-.5)*uPad*.35;
  for(int i=0;i<${MAX_RECTS};i++){
    if(i>=uRectN)break;
    vec4 r=uRects[i]; vec2 c=(r.xy+r.zw)*.5, h=(r.zw-r.xy)*.5;
    float rad=min(min(h.x,h.y),uPad*1.4);
    vec2 d=abs(p-c)-h+rad; float sd=length(max(d,0.))+min(max(d.x,d.y),0.)-rad;
    float k=1.-smoothstep(-uPad*.6,uPad*1.9,sd+wob);
    q+=(1.-q)*k*k*(3.-2.*k)*uRectK[i];
  }
  return q;
}`;

const RIDGE_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying float vDepth;
void main(){
  vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal);
  vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv;
}`;

const RIDGE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uBg,uAlbedo,uAlbedoN,uWarm,uRim,uLight; uniform float uTheme,uFog,uTime,uQuiet;
varying vec3 vW; varying vec3 vN; varying float vDepth;
${NOISE_GLSL}
${QUIET_GLSL}
void main(){
  vec3 n=normalize(vN), V=normalize(cameraPosition-vW);
  vec3 alb=mix(uAlbedo,uAlbedoN,uTheme);
  // wrapped key light: a long, soft terminator instead of a hard shadow edge
  float wrap=clamp((dot(n,uLight)+.5)/1.5,0.,1.);
  float lit=smoothstep(.08,.98,wrap);
  vec3 shade=alb*mix(vec3(.66,.75,.74),vec3(.55,.68,.68),uTheme);
  vec3 col=mix(shade,alb*1.13+uWarm*.035,lit);
  col+=uWarm*exp(-pow((wrap-.46)/.11,2.))*.045*(1.-uTheme);      // warm light at the terminator
  float ao=mix(.84,1.,smoothstep(-1.,9.,vW.y));                      // feet of the ridge sit in shadow
  col*=ao;
  float fres=pow(1.-max(dot(n,V),0.),2.6);
  col=mix(col,uRim,fres*.42);                                        // air catching the silhouette
  col+=uRim*pow(max(dot(reflect(-uLight,n),V),0.),14.)*.05;          // matte sheen
  float g=noise(vW.xz*2.7+vW.y)*.55+noise(vW.xz*9.+vW.y*3.)*.45;     // fine clay grain
  col*=.972+.056*g;
  float mist=1.-smoothstep(-2.6,3.6+2.4*noise(vW.xz*.035+vec2(uTime*.012,0.)),vW.y);
  float fog=1.-exp(-pow(vDepth*uFog,1.55));
  col=mix(col,uBg,clamp(max(fog,mist*.78),0.,1.));
  col=mix(col,uBg,quiet()*uQuiet);
  col+=(hash(gl_FragCoord.xy+fract(uTime*7.))-.5)*(2.2/255.);        // dither: no banding in the gradients
  gl_FragColor=vec4(col,1.);
}`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){vDir=position;gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.);
  gl_Position.z=gl_Position.w;}`;
const SKY_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uBg,uHorizon,uSun,uSunDir; uniform float uSunAmt,uTime; varying vec3 vDir;
${NOISE_GLSL}
void main(){
  vec3 d=normalize(vDir);
  vec3 col=mix(uHorizon,uBg,smoothstep(-.04,.42,d.y));
  float s=max(dot(d,uSunDir),0.);
  col+=uSun*(smoothstep(.99955,.99975,s)*.55+pow(s,90.)*.22+pow(s,9.)*.07)*uSunAmt;
  col+=(hash(gl_FragCoord.xy+fract(uTime*7.))-.5)*(2.2/255.);
  gl_FragColor=vec4(col,1.);
}`;

const MOTE_VERT = /* glsl */ `
attribute vec3 aChaos; attribute vec3 aOrder; attribute float aSeed;
uniform float uChaos,uTime,uPx,uFog;
varying float vA;
void main(){
  float k=smoothstep(aSeed*.5,aSeed*.5+.5,1.-uChaos); k=k*k*(3.-2.*k);
  vec3 c=aChaos+vec3(sin(uTime*.31+aSeed*40.),cos(uTime*.23+aSeed*17.)*.6,sin(uTime*.19+aSeed*9.))*1.8;
  vec3 o=aOrder+vec3(sin(uTime*.15+aOrder.z*.05)*1.2,sin(uTime*.4+aOrder.x*.2)*.05,0.);
  vec4 mv=modelViewMatrix*vec4(mix(c,o,k),1.);
  float d=-mv.z;
  gl_PointSize=clamp(uPx*(1.+aSeed*1.6)*(60./d),1.,5.);
  vA=mix(.42,.6,k)*exp(-pow(d*uFog,1.55));
  gl_Position=projectionMatrix*mv;
}`;
const MOTE_FRAG = /* glsl */ `
precision highp float; uniform vec3 uDot; uniform float uQuiet; varying float vA;
${NOISE_GLSL}
${QUIET_GLSL}
void main(){vec2 c=gl_PointCoord-.5;float r=length(c);if(r>.5)discard;
  gl_FragColor=vec4(uDot,vA*smoothstep(.5,.1,r)*(1.-quiet()*uQuiet));}`;

// Shaders write final sRGB values directly, so keep colours un-converted.
ColorManagement.enabled = false;
const palette = {
  light: {bg: new Color('#F7F6F2'), horizon: new Color('#FBF7EE'), warm: new Color('#F3DFB8'), rim: new Color('#F4F3EC'), sun: new Color('#FFF8EA'), dot: new Color('#2D5E50')},
  dark: {bg: new Color('#16231D'), horizon: new Color('#1F3329'), warm: new Color('#BFE0D1'), rim: new Color('#2E4A3E'), sun: new Color('#BFE0D1'), dot: new Color('#BFE0D1')},
};

/* The ridges, near → far. Each is a long rounded crest whose skyline is a sum of a few gentle summits. The third
   (index 2) is the Luojia ridge: long, low, three soft summits. Colours step from deep green to warm white-green. */
interface Ridge {z: number; depth: number; peaks: [number, number, number][]; base: number; wave: number; light: string; dark: string}
const RIDGES: Ridge[] = [
  {z: -6, depth: 34, base: 2, wave: .9, peaks: [[-70, 30, 9], [-8, 44, 4.6], [62, 32, 10], [124, 40, 7]], light: '#2B5749', dark: '#132820'},
  {z: -40, depth: 38, base: 2.2, wave: 1.2, peaks: [[-104, 34, 9], [-40, 28, 12.5], [28, 36, 10], [96, 30, 11]], light: '#43705F', dark: '#183129'},
  {z: -80, depth: 44, base: 3, wave: 1.4, peaks: [[-36, 22, 16], [0, 19, 21], [33, 25, 16.5], [-98, 34, 10], [96, 32, 11.5]], light: '#5F8676', dark: '#1D392F'},
  {z: -128, depth: 52, base: 5, wave: 1.8, peaks: [[-78, 42, 24], [46, 48, 27], [150, 40, 18]], light: '#87A293', dark: '#213F34'},
  {z: -190, depth: 62, base: 8, wave: 2.2, peaks: [[-12, 72, 34], [128, 52, 30], [-140, 52, 27]], light: '#AEC0B3', dark: '#24443A'},
  {z: -262, depth: 76, base: 10, wave: 2.6, peaks: [[70, 92, 46], [-96, 84, 40]], light: '#CCD7CC', dark: '#264A3E'},
];
const WIDTH = 1100;
const profile = (r: Ridge, i: number, x: number) => {
  let h = r.base + r.wave * Math.sin(x * .045 + i * 1.7) + r.wave * .6 * Math.sin(x * .021 + i * 4.1);
  for (const [c, w, ph] of r.peaks) {const d = (x - c) / w; h += ph * Math.exp(-d * d);}
  return h;
};
/* Height of ridge i at world (x, z): a rounded crest that meanders gently in depth. */
const ridgeHeight = (i: number, x: number, z: number) => {
  const r = RIDGES[i];
  const zl = z - r.z + Math.sin(x * .018 + i) * r.depth * .12;
  const s = zl / (r.depth * .34);
  return profile(r, i, x) * Math.exp(-s * s) - 2.5;
};
const groundAt = (x: number, z: number) => {
  let h = -2.5;
  for (let i = 0; i < RIDGES.length; i++) if (Math.abs(z - RIDGES[i].z) < RIDGES[i].depth) h = Math.max(h, ridgeHeight(i, x, z));
  return h;
};

// Camera route (position / look-at). Home scroll 0→1 flies the whole thing; other pages use a slice.
// The route rises gently over each ridge in turn, ending high above the layers, looking down at their order.
const POS = [[0, 7.5, 50], [-12, 9.5, 30], [6, 15, 6], [-4, 17, -20], [12, 22, -44], [0, 27, -62], [-10, 33, -92], [0, 52, -78]]
  .map(v => new Vector3(...(v as [number, number, number])));
const LOOK = [[0, 10, -90], [6, 10, -96], [-6, 11, -110], [2, 13, -130], [-6, 14, -150], [0, 18, -190], [8, 18, -210], [0, 4, -170]]
  .map(v => new Vector3(...(v as [number, number, number])));
const posCurve = new CatmullRomCurve3(POS, false, 'centripetal');
const lookCurve = new CatmullRomCurve3(LOOK, false, 'centripetal');

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {const t = clamp01((v - a) / (b - a));return t * t * (3 - 2 * t);};
const KEY = 'luoxu:scene';
const DEG = Math.PI / 180;

/* Text blocks the background makes room for, with how much it yields (0..1). */
const QUIET_SELECTORS: [string, number][] = [
  ['.hero3-copy', .9], ['.mega', .32], ['.order-head', .9], ['.order-steps', .85], ['.order-note', .7],
  ['.story-hw', .62], ['.drift-field', .62], ['.story-caps', .9], ['.story-line', .9], ['.poster-h', .72], ['.poster-tail', .85],
  ['.chapter-head', .9], ['.preview-copy', .9], ['.more-link', .8], ['.download-copy', .92], ['.open-source h2', .9], ['.os-copy', .9],
  ['.privacy-copy', .85], ['.architecture-note', .8], ['.page-header', .92], ['.story-intro', .9], ['.story-sec', .9],
  ['.install-guide', .9], ['.section-head', .9], ['.testing-grid', .88], ['.download-faq', .85], ['.release-entry', .9],
  ['.feedback', .88], ['.footer-top', .85], ['.footer-note', .8],
];

export interface SceneHandle {dispose(): void}

export async function startScene(canvas: HTMLCanvasElement, opts: {reduced: boolean; mobile: boolean}): Promise<SceneHandle | null> {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({canvas, antialias: !opts.mobile, alpha: false, powerPreference: 'high-performance'});
  } catch { return null; }
  if (!renderer.getContext()) return null;

  const mobile = opts.mobile;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, .1, 600);

  // ── shared uniforms: theme, fog, the quiet mask
  const rects = Array.from({length: MAX_RECTS}, () => new Vector4());
  const shared = {
    uBg: {value: palette.light.bg.clone()}, uTheme: {value: 0}, uTime: {value: 0}, uFog: {value: mobile ? .0040 : .0036},
    uRects: {value: rects}, uRectK: {value: new Array(MAX_RECTS).fill(0)}, uRectN: {value: 0},
    uRes: {value: new Vector3(1, 1, 0)}, uPad: {value: 90}, uQuiet: {value: 1},
    uWarm: {value: palette.light.warm.clone()}, uRim: {value: palette.light.rim.clone()},
    uLight: {value: new Vector3(-.62, .52, -.36).normalize()},
  };

  // ── sky dome: paper above, a warmer band at the horizon, a low soft sun behind the Luojia ridge
  const skyMat = new ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, depthTest: true,
    uniforms: {uBg: shared.uBg, uTime: shared.uTime, uHorizon: {value: palette.light.horizon.clone()}, uSun: {value: palette.light.sun.clone()},
      uSunDir: {value: new Vector3(.3, .11, -1).normalize()}, uSunAmt: {value: 1}},
  });
  const skyGeo = new SphereGeometry(100, 32, 16);
  const sky = new Mesh(skyGeo, skyMat);
  // Paint only exposed sky after opaque terrain. Covered sky pixels no longer run
  // the expensive atmospheric shader; the far-plane depth keeps the picture identical.
  sky.renderOrder = RIDGES.length + 1; sky.frustumCulled = false;
  scene.add(sky);

  // ── ridges
  const segX = mobile ? 220 : 380, segZ = mobile ? 18 : 28;
  const ridgeMats: ShaderMaterial[] = [];
  const ridgeGeos: BufferGeometry[] = [];
  for (const [i, r] of RIDGES.entries()) {
    // Yield between the unchanged meshes so first-visit setup cannot monopolize input.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const g = new PlaneGeometry(WIDTH + i * 160, r.depth * 2, segX, segZ);
    g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position;
    for (let v = 0; v < pa.count; v++) {
      const x = pa.getX(v), z = pa.getZ(v) + r.z;
      pa.setXYZ(v, x, ridgeHeight(i, x, z), z);
    }
    g.computeVertexNormals();
    const m = new ShaderMaterial({
      vertexShader: RIDGE_VERT, fragmentShader: RIDGE_FRAG,
      uniforms: {...shared, uAlbedo: {value: new Color(r.light)}, uAlbedoN: {value: new Color(r.dark)}},
    });
    const mesh = new Mesh(g, m);
    mesh.renderOrder = i; // near first: early-z rejects most of the far layers
    scene.add(mesh);
    ridgeMats.push(m); ridgeGeos.push(g);
  }

  // ── a misted floor under the layers, so a steep (portrait) view never looks into the gaps between ridges
  const floorGeo = new PlaneGeometry(2400, 900, 1, 1);
  floorGeo.rotateX(-Math.PI / 2); floorGeo.translate(0, -2.6, -200);
  const floorMat = new ShaderMaterial({vertexShader: RIDGE_VERT, fragmentShader: RIDGE_FRAG,
    uniforms: {...shared, uAlbedo: {value: new Color(RIDGES[1].light)}, uAlbedoN: {value: new Color(RIDGES[1].dark)}}});
  const floor = new Mesh(floorGeo, floorMat);
  floor.renderOrder = RIDGES.length;
  scene.add(floor);
  ridgeMats.push(floorMat); ridgeGeos.push(floorGeo);

  // ── motes: scattered between the ridges, settling into level strata
  const N = mobile ? 220 : 520;
  const dg = new BufferGeometry();
  const aChaos = new Float32Array(N * 3), aOrder = new Float32Array(N * 3), aSeed = new Float32Array(N);
  const STRATA = [[-24, 6.5], [-60, 11], [-104, 15.5]];
  for (let i = 0; i < N; i++) {
    aChaos[i * 3] = (Math.random() - .5) * 120;
    aChaos[i * 3 + 1] = 2 + Math.random() * 22;
    aChaos[i * 3 + 2] = -110 + Math.random() * 140;
    const [sz, sy] = STRATA[i % STRATA.length];
    aOrder[i * 3] = (Math.random() - .5) * 150;
    aOrder[i * 3 + 1] = sy + (Math.random() - .5) * .25;
    aOrder[i * 3 + 2] = sz + (Math.random() - .5) * 3;
    aSeed[i] = Math.random();
  }
  dg.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
  dg.setAttribute('aChaos', new BufferAttribute(aChaos, 3));
  dg.setAttribute('aOrder', new BufferAttribute(aOrder, 3));
  dg.setAttribute('aSeed', new BufferAttribute(aSeed, 1));
  const moteMat = new ShaderMaterial({
    vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false, blending: NormalBlending,
    uniforms: {...shared, uChaos: {value: 1}, uPx: {value: pixelRatio}, uDot: {value: palette.light.dot.clone()}},
  });
  const motes = new Points(dg, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  // ── state
  const range = (document.body.dataset.sceneRange || '0,1').split(',').map(Number);
  let zones: {top: number; bottom: number}[] = [];
  let maxScroll = 1, vh = innerHeight;
  const measure = () => {
    vh = innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    zones = Array.from(document.querySelectorAll<HTMLElement>('[data-tone=dark]')).map(el => {
      const r = el.getBoundingClientRect();
      return {top: r.top + scrollY, bottom: r.top + scrollY + r.height};
    });
  };
  const targetProgress = () => range[0] + (range[1] - range[0]) * clamp01(scrollY / maxScroll);
  const themeNow = () => {
    let t = 0;
    for (const z of zones) {
      const enter = smooth(z.top - vh * .55, z.top + vh * .05, scrollY);
      const leave = 1 - smooth(z.bottom - vh * .6, z.bottom - vh * .1, scrollY);
      t = Math.max(t, enter * leave);
    }
    return t;
  };

  // ── quiet mask: only text blocks near the viewport are measured each frame
  const quietEls = new Map<Element, number>();
  for (const [sel, k] of QUIET_SELECTORS) document.querySelectorAll(sel).forEach(el => quietEls.set(el, k));
  const visible = new Set<Element>();
  let rectsDirty = true, rectScroll = -1;
  const io = new IntersectionObserver(es => {
    es.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    rectsDirty = true;
  }, {rootMargin: '25% 0px'});
  quietEls.forEach((_, el) => io.observe(el));
  // Transform changes on a clearing's ancestors matter; colour-only root updates don't.
  const rectObserver = new MutationObserver(records => {
    for (const {target} of records) {
      if (target === document.documentElement || target === document.body) continue;
      if (target instanceof Element && [...visible].some(el => target === el || target.contains(el))) {
        rectsDirty = true;break;
      }
    }
  });
  rectObserver.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['style', 'class']});
  document.fonts.ready.then(() => {rectsDirty = true;});
  const updateRects = () => {
    if (!rectsDirty && rectScroll === scrollY) return;
    rectsDirty = false;rectScroll = scrollY;
    let n = 0;
    const pr = renderer.getPixelRatio();
    const K = shared.uRectK.value as number[];
    const push = (l: number, t: number, r: number, b: number, k: number) => {
      if (n >= MAX_RECTS || b < -120 || t > vh + 120 || r - l < 2) return;
      rects[n].set(l * pr, t * pr, r * pr, b * pr); K[n] = k; n++;
    };
    for (const el of visible) {
      const r = el.getBoundingClientRect(), k = quietEls.get(el) ?? .85;
      // the drift words are two thin columns at the edges: clear those, not the whole field (layout boxes, so the
      // words' own fly-in transforms never make the clearing pulse)
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
    shared.uRectN.value = n;
    shared.uPad.value = (mobile ? 64 : 96) * pr;
  };

  let stored: {p: number; theme: number} | null = null;
  try {stored = JSON.parse(sessionStorage.getItem(KEY) || 'null');} catch {/* private mode */}
  measure();
  const prog = spring(stored && !opts.reduced ? stored.p : targetProgress());
  let theme = stored ? stored.theme : themeNow();
  const chaosS = spring(1);
  const mx = spring(), my = spring(), roll = spring(), fovKick = spring();
  let mouseX = 0, mouseY = 0, lastY = scrollY, velocity = 0, still = 0, floatW = 0;

  const ptr = (e: PointerEvent) => {mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = (e.clientY / innerHeight) * 2 - 1;};
  const gyro = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    mouseX = MathUtils.clamp(e.gamma / 30, -1, 1); mouseY = MathUtils.clamp((e.beta - 50) / 40, -1, 1);
  };
  window.addEventListener('pointermove', ptr, {passive: true});
  if (mobile && 'DeviceOrientationEvent' in window && !('requestPermission' in DeviceOrientationEvent)) {
    window.addEventListener('deviceorientation', gyro, {passive: true});
  }

  let lastW = innerWidth, lastH = innerHeight;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    rectsDirty = true;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    (shared.uRes.value as Vector3).set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio(), 0);
    measure();
    lastW = w; lastH = h;
  };
  resize();
  const ro = new ResizeObserver(() => {
    rectsDirty = true;
    if (innerWidth !== lastW || innerHeight !== lastH) resize(); else measure();
  });
  ro.observe(document.documentElement);
  quietEls.forEach((_, el) => ro.observe(el));

  const tmpA = new Vector3(), tmpB = new Vector3(), right = new Vector3(), up = new Vector3(0, 1, 0), fwd = new Vector3();
  const cA = new Color();
  const skyU = skyMat.uniforms;
  let lastTheme = -1;
  function mixTheme(t: number) {
    if (Math.abs(t - lastTheme) < .0005) return;
    lastTheme = t;
    const L = palette.light, D = palette.dark;
    (shared.uBg.value as Color).copy(cA.copy(L.bg).lerp(D.bg, t));
    (shared.uWarm.value as Color).copy(cA.copy(L.warm).lerp(D.warm, t));
    (shared.uRim.value as Color).copy(cA.copy(L.rim).lerp(D.rim, t));
    (skyU.uHorizon.value as Color).copy(cA.copy(L.horizon).lerp(D.horizon, t));
    (skyU.uSun.value as Color).copy(cA.copy(L.sun).lerp(D.sun, t));
    skyU.uSunAmt.value = MathUtils.lerp(1, .55, t);
    (moteMat.uniforms.uDot.value as Color).copy(cA.copy(L.dot).lerp(D.dot, t));
    shared.uTheme.value = t;
    shared.uQuiet.value = MathUtils.lerp(1, .8, t);
    renderer.setClearColor(shared.uBg.value as Color, 1);
    document.documentElement.style.setProperty('--scene-bg', '#' + (shared.uBg.value as Color).getHexString());
    document.documentElement.dataset.theme = t > .5 ? 'dark' : 'light';
  }

  let running = true, raf = 0, last = performance.now(), time = 0, slow = 0, frames = 0, skip = false;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    // Low-power cap: on mobile, render every other vsync when the device is struggling.
    const dtMs = now - last;
    if (mobile && skip && dtMs < 30) return;
    const dt = Math.min(.05, dtMs / 1000); last = now; time += dt;

    // adaptive resolution: sustained slow frames lower the pixel ratio a notch
    if (dtMs > 26) slow++; else slow = Math.max(0, slow - 1);
    if (++frames % 90 === 0 && slow > 40 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - .25); renderer.setPixelRatio(pixelRatio); resize(); slow = 0;
      moteMat.uniforms.uPx.value = pixelRatio;
    }
    if (frames % 120 === 0 && slow > 60 && mobile) skip = true;

    const y = scrollY;
    velocity += ((y - lastY) / Math.max(dt, .001) / vh - velocity) * Math.min(1, dt * 6); lastY = y;
    still = Math.abs(velocity) < .02 ? still + dt : 0;

    // weight: progress is a critically damped spring — eases out of rest, glides in, never overshoots
    const p = clamp01(damp(prog, targetProgress(), mobile ? .42 : .62, dt));
    theme += (themeNow() - theme) * (1 - Math.exp(-dt * 6));
    // the pointer turns the head, slowly (Aevion: yaw 2.5°, pitch 4°, roll 3.5°, heavily smoothed)
    damp(mx, mouseX, .9, dt); damp(my, mouseY, .9, dt);
    damp(roll, MathUtils.clamp(-velocity * .03, -.04, .04), .5, dt);
    damp(fovKick, Math.min(4, Math.abs(velocity) * 1.6), .45, dt);
    // after the scroll settles, the camera floats
    floatW += ((still > .6 ? 1 : 0) - floatW) * (1 - Math.exp(-dt * (still > .6 ? .8 : 6)));

    const portrait = Math.max(0, 1 - Math.min(camera.aspect, 1));
    camera.fov = 40 + portrait * 34 - 4 * smooth(0, .3, p) + fovKick.value;
    camera.updateProjectionMatrix();
    posCurve.getPointAt(p, tmpA); lookCurve.getPointAt(p, tmpB);
    fwd.subVectors(tmpB, tmpA).normalize();
    right.crossVectors(fwd, up).normalize();
    // a little positional parallax so the layers separate, the rest is rotation
    tmpA.addScaledVector(right, mx.value * 1.2).addScaledVector(up, -my.value * .5 + Math.sin(time * .3 * Math.PI * 2) * .22 * floatW);
    tmpB.addScaledVector(up, -portrait * 6);
    tmpA.y = Math.max(tmpA.y, groundAt(tmpA.x, tmpA.z) + 3.5);
    camera.position.copy(tmpA);
    camera.lookAt(tmpB);
    camera.rotateY(-mx.value * 2.5 * DEG);
    camera.rotateX(-my.value * 4 * DEG * .6);
    camera.rotateZ(roll.value - mx.value * 3.5 * DEG * .5);
    sky.position.copy(camera.position);

    // 纷杂 → 有序: the motes settle as the visitor leaves the first screen
    const chaos = damp(chaosS, 1 - smooth(.02, .16, p), .8, dt);
    moteMat.uniforms.uChaos.value = chaos;
    shared.uTime.value = time; (shared.uRes.value as Vector3).z = time;
    updateRects();
    mixTheme(theme);
    renderer.render(scene, camera);
    if (frames === 2) document.documentElement.classList.add('webgl');
  }

  const onVis = () => {running = !document.hidden; last = performance.now();};
  document.addEventListener('visibilitychange', onVis);
  const save = () => {try {sessionStorage.setItem(KEY, JSON.stringify({p: prog.value, theme}));} catch {/* ignore */}};
  addEventListener('pagehide', save);
  addEventListener('load', measure);
  // layout can change as fonts/pins settle
  const remeasure = setInterval(measure, 1500);

  // Existing fallback stays visible while programs compile; no forced opening animation.
  await renderer.compileAsync(scene, camera);
  last = performance.now();
  if (opts.reduced) {
    prog.value = targetProgress(); theme = themeNow(); chaosS.value = 0;
    frame(performance.now()); cancelAnimationFrame(raf);
    const still1 = () => {prog.value = targetProgress(); theme = themeNow(); frame(performance.now()); cancelAnimationFrame(raf);};
    addEventListener('scroll', still1, {passive: true});
    document.documentElement.classList.add('webgl');
  } else raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf); clearInterval(remeasure); ro.disconnect(); io.disconnect(); rectObserver.disconnect(); save();
      removeEventListener('pointermove', ptr); removeEventListener('deviceorientation', gyro);
      document.removeEventListener('visibilitychange', onVis); removeEventListener('pagehide', save);
      ridgeGeos.forEach(g => g.dispose()); ridgeMats.forEach(m => m.dispose());
      skyGeo.dispose(); skyMat.dispose(); dg.dispose(); moteMat.dispose(); renderer.dispose();
    },
  };
}
