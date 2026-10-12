/**
 * LUOXU "Luojia ridge" scene — an original three.js object.
 *
 * One procedural mountain, drawn as a contour map (the quiet, ordered form of a hill) with a cloud of
 * "message" particles. Scroll progress moves BOTH the camera along a spline and the chaos→order mix, so the
 * page literally goes from scribbled noise to clean contour lines. Mouse adds a soft, delayed parallax.
 * Everything is a pure function of (smoothed progress, mouse, time), so reversing the scroll reverses the
 * motion with no jump. Respect: reduced-motion renders a single still frame; no WebGL leaves the CSS ridges.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Mesh, Points, BufferGeometry,
  BufferAttribute, Color, ColorManagement, Vector3, InstancedMesh, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, InstancedBufferAttribute, InstancedBufferGeometry, DynamicDrawUsage, CatmullRomCurve3, MathUtils, AdditiveBlending, NormalBlending, Vector2,
} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TERRAIN_GLSL = /* glsl */ `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
float ridged(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){float n=1.-abs(noise(p)*2.-1.);s+=a*n*n;p=p*2.1+vec2(3.7,8.3);a*=.5;}return s;}
float peak(vec2 p,vec2 c,vec2 r,float h){vec2 d=(p-c)/r;return h*exp(-dot(d,d));}
float terrain(vec2 p,float chaos){
  vec2 q=p+chaos*vec2(fbm(p*.09+3.),fbm(p*.09+11.)-.5)*18.;
  float h=peak(q,vec2(0.,-28.),vec2(19.,17.),14.)
         +peak(q,vec2(-27.,-16.),vec2(13.,12.),8.5)
         +peak(q,vec2(29.,-10.),vec2(14.,11.),7.5)
         +peak(q,vec2(9.,-62.),vec2(30.,20.),13.)
         +peak(q,vec2(-38.,-48.),vec2(18.,16.),9.);
  h+=ridged(q*.052)*6.5*smoothstep(46.,-6.,q.y)+fbm(q*.2)*1.2;
  h*=2.2*mix(.12,1.,smoothstep(16.,-16.,p.y));
  h+=chaos*(noise(p*.55)-.5)*6.*(.12+.88*smoothstep(30.,-10.,p.y));
  return h;
}`;

const TERRAIN_VERT = /* glsl */ `
uniform float uChaos; uniform float uFogDensity;
varying vec3 vW; varying float vH; varying float vFog; varying vec3 vN;
${TERRAIN_GLSL}
void main(){
  vec3 p=position; float h=terrain(p.xz,uChaos); p.y=h;
  float e=.7; float hx=terrain(p.xz+vec2(e,0.),uChaos), hz=terrain(p.xz+vec2(0.,e),uChaos);
  vN=normalize(vec3(h-hx,e,h-hz));
  vec4 mv=modelViewMatrix*vec4(p,1.); vW=p; vH=h;
  float d=length(mv.xyz); vFog=1.-exp(-pow(d*uFogDensity,1.7));
  gl_Position=projectionMatrix*mv;
}`;

// Natural palette (kept inside the brand family: deep green, grey-green, warm paper) lit by a low sun.
const SHADE_GLSL = /* glsl */ `
vec3 nightTint(vec3 c,float t){return mix(c,c*vec3(.30,.44,.40)+vec3(.012,.04,.03),t);}
`;
const TERRAIN_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uBg,uLine,uHi; uniform float uTime,uChaos,uTheme;
varying vec3 vW; varying float vH; varying float vFog; varying vec3 vN;
${TERRAIN_GLSL}
${SHADE_GLSL}
void main(){
  vec3 n=vN;
  vec2 dn=vec2(noise(vW.xz*1.9)-.5,noise(vW.xz*1.9+9.)-.5)+.5*vec2(noise(vW.xz*5.3)-.5,noise(vW.xz*5.3+4.)-.5);
  n=normalize(n+vec3(dn.x,0.,dn.y)*(.22+.5*(1.-n.y)));
  float alt=clamp(vH/30.,0.,1.2);
  float slope=1.-n.y;
  float tex=noise(vW.xz*.55)*.6+noise(vW.xz*2.3)*.4;
  vec3 meadow=vec3(.66,.74,.55), forestMid=vec3(.30,.54,.34), forestDeep=vec3(.14,.37,.25);
  vec3 rockLow=vec3(.56,.57,.53), rockHigh=vec3(.80,.80,.75);
  vec3 grass=mix(meadow,forestMid,smoothstep(.01,.2,alt+(tex-.5)*.12));
  grass=mix(grass,forestDeep,smoothstep(.12,.4,alt)*(.55+.45*tex));
  float rock=clamp(smoothstep(.5,.78,slope+(tex-.5)*.2)+smoothstep(.86,1.1,alt+(tex-.5)*.1),0.,1.);
  vec3 col=mix(grass,mix(rockLow,rockHigh,smoothstep(.55,1.,alt)),rock);
  float strata=sin(vH*5.5+noise(vW.xz*.4)*6.)*.5+.5;
  col*=mix(1.,.95+.07*strata,rock);
  col*=.82+.3*tex;
  vec3 L=normalize(vec3(-.5,.6,-.55));
  float diff=max(dot(n,L),0.);
  col*=.42+.85*diff;
  // contour lines: the quiet "order" layer drawn over the living terrain
  float h=vH/1.15; float fw=max(fwidth(h),1e-4);
  float l=abs(fract(h-.5)-.5)/fw;
  float line=(1.-smoothstep(.55,1.5,l))*(1.-smoothstep(.45,1.1,fw));
  float hi=h/5.; float fwi=fw/5.;
  float idx=(1.-smoothstep(.8,2.2,abs(fract(hi-.5)-.5)/fwi))*(1.-smoothstep(.45,1.1,fwi));
  float pulse=smoothstep(.93,1.,sin(vH*.2-uTime*.9))*(1.-uChaos);
  col=nightTint(col,uTheme);
  float a=(line*.16+idx*.28+pulse*line*.6)*(1.-rock*.3);
  col=mix(col,uLine,clamp(a,0.,1.)*mix(1.,1.6,uTheme));
  col+=uHi*pow(diff,6.)*.12*(1.-vFog);
  col=mix(col,uBg,vFog);
  gl_FragColor=vec4(col,1.);
}`;

const PROP_VERT = /* glsl */ `
uniform float uFogDensity,uGrow;
attribute vec3 aVc; attribute float aGy;
varying vec3 vW; varying float vFog; varying vec3 vC; varying vec3 vNo;
void main(){
  mat4 im=instanceMatrix; im[3].y=aGy;
  vec3 local=position*uGrow;
  vec4 wp=im*vec4(local,1.);
  vec4 mv=modelViewMatrix*wp; vW=wp.xyz;
  vC=instanceColor*aVc; vNo=normalize(mat3(im)*normal);
  float d=length(mv.xyz); vFog=1.-exp(-pow(d*uFogDensity,1.7));
  gl_Position=projectionMatrix*mv;
}`;
const PROP_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uBg; uniform float uTheme;
varying vec3 vW; varying float vFog; varying vec3 vC; varying vec3 vNo;
${SHADE_GLSL}
void main(){
  vec3 n=normalize(vNo);
  float diff=max(dot(n,normalize(vec3(-.5,.6,-.55))),0.);
  vec3 col=vC*(.4+.9*diff);
  col=nightTint(col,uTheme);
  col=mix(col,uBg,vFog);
  gl_FragColor=vec4(col,1.);
}`;

const DOT_VERT = /* glsl */ `
attribute vec3 aChaos; attribute vec2 aOrder; attribute float aSeed;
uniform float uChaos,uTime,uPx,uFogDensity;
varying float vA; varying float vFog;
${TERRAIN_GLSL}
void main(){
  float k=smoothstep(aSeed*.55,aSeed*.55+.45,1.-uChaos);
  vec3 c=aChaos+vec3(sin(uTime*.4+aSeed*40.),cos(uTime*.33+aSeed*17.)*.8,sin(uTime*.27+aSeed*9.))*2.2;
  vec3 o=vec3(aOrder.x,terrain(aOrder,0.)+.6+sin(uTime*.8+aOrder.x*.3)*.15,aOrder.y);
  vec3 p=mix(c,o,k*k*(3.-2.*k));
  vec4 mv=modelViewMatrix*vec4(p,1.);
  float d=length(mv.xyz);
  gl_PointSize=clamp(uPx*(1.2+aSeed*2.2)*(70./d),1.6,9.);
  vFog=1.-exp(-pow(d*uFogDensity,1.7)); vA=mix(.5,1.,k)*(1.-vFog);
  gl_Position=projectionMatrix*mv;
}`;
const DOT_FRAG = /* glsl */ `
precision highp float; uniform vec3 uDot; varying float vA; varying float vFog;
void main(){vec2 c=gl_PointCoord-.5;float r=length(c);if(r>.5)discard;
  gl_FragColor=vec4(uDot,vA*smoothstep(.5,.15,r));}`;

const SUN_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const SUN_FRAG = `precision highp float;varying vec2 vUv;uniform vec3 uCol;uniform float uAmt;
void main(){float r=length(vUv-.5)*2.;float core=smoothstep(.2,.17,r);float glow=pow(max(1.-r,0.),2.4);
  gl_FragColor=vec4(uCol,(core*.85+glow*.45)*uAmt);}`;

// Shaders write final sRGB values directly, so keep colours un-converted.
ColorManagement.enabled = false;
const palette = {
  light: {bg: new Color('#F7F6F2'), fill: new Color('#DCE6DB'), line: new Color('#245D50'), hi: new Color('#FFFFFF'), dot: new Color('#245D50'), sun: new Color('#FFFEFB')},
  dark: {bg: new Color('#16231D'), fill: new Color('#3A7566'), line: new Color('#BFE0D1'), hi: new Color('#9FD0BC'), dot: new Color('#BFE0D1'), sun: new Color('#BFE0D1')},
};

// Camera route (position / look-at). Home scroll 0→1 flies the whole thing; other pages use a slice.
const POS = [[0,26,86],[-24,22,56],[-18,28,46],[26,34,34],[42,30,12],[6,22,42],[-8,30,-10],[0,46,40]]
  .map(v => new Vector3(...(v as [number, number, number])));
const LOOK = [[0,12,-30],[0,12,-28],[2,13,-30],[-2,14,-30],[-2,15,-32],[0,19,-44],[0,14,-62],[0,4,-44]]
  .map(v => new Vector3(...(v as [number, number, number])));
const posCurve = new CatmullRomCurve3(POS, false, 'catmullrom', .5);
const lookCurve = new CatmullRomCurve3(LOOK, false, 'catmullrom', .5);


/* CPU twin of the GLSL terrain (chaos = 0) so the camera never dips into the ridge. */
const fract = (v: number) => v - Math.floor(v);
const hash2 = (x: number, y: number) => {
  let px = fract(x * 123.34), py = fract(y * 456.21);
  const d = px * (px + 45.32) + py * (py + 45.32); px += d; py += d;
  return fract(px * py);
};
const vnoise = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
};
const fbmJ = (x: number, y: number) => {let a = .5, s = 0;for (let i = 0; i < 4; i++) {s += a * vnoise(x, y);x = x * 2.03 + 17.1;y = y * 2.03 + 9.2;a *= .5;}return s;};
const ridgedJ = (x: number, y: number) => {let a = .5, s = 0;for (let i = 0; i < 5; i++) {const n = 1 - Math.abs(vnoise(x, y) * 2 - 1);s += a * n * n;x = x * 2.1 + 3.7;y = y * 2.1 + 8.3;a *= .5;}return s;};
const peakJ = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, h: number) => {const dx = (x - cx) / rx, dy = (y - cy) / ry;return h * Math.exp(-(dx * dx + dy * dy));};
const ss = (a: number, b: number, v: number) => {const t = Math.min(1, Math.max(0, (v - a) / (b - a)));return t * t * (3 - 2 * t);};
export function terrainHeight(x: number, z: number, chaos = 0) {
  let qx = x, qz = z;
  if (chaos > 0) {qx += chaos * fbmJ(x * .09 + 3, z * .09 + 3) * 18;qz += chaos * (fbmJ(x * .09 + 11, z * .09 + 11) - .5) * 18;}
  let h = peakJ(qx, qz, 0, -28, 19, 17, 14) + peakJ(qx, qz, -27, -16, 13, 12, 8.5) + peakJ(qx, qz, 29, -10, 14, 11, 7.5)
    + peakJ(qx, qz, 9, -62, 30, 20, 13) + peakJ(qx, qz, -38, -48, 18, 16, 9);
  h += ridgedJ(qx * .052, qz * .052) * 6.5 * ss(46, -6, qz) + fbmJ(qx * .2, qz * .2) * 1.2;
  h *= 2.2 * (.12 + .88 * ss(16, -16, z));
  if (chaos > 0) h += chaos * (vnoise(x * .55, z * .55) - .5) * 6 * (.12 + .88 * ss(30, -10, z));
  return h;
}
const hash3 = (x: number, y: number, z: number) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {const t = clamp01((v - a) / (b - a));return t * t * (3 - 2 * t);};
const KEY = 'luoxu:scene';

export interface SceneHandle {dispose(): void}

export function startScene(canvas: HTMLCanvasElement, opts: {reduced: boolean; mobile: boolean}): SceneHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({canvas, antialias: !opts.mobile, alpha: false, powerPreference: 'high-performance'});
  } catch { return null; }
  if (!renderer.capabilities.isWebGL2 && !renderer.getContext()) return null;

  const mobile = opts.mobile;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  const scene = new Scene();
  const camera = new PerspectiveCamera(48, 1, .1, 400);

  // ── terrain
  const seg = mobile ? 170 : 300;
  const geo = new PlaneGeometry(220, 290, seg, Math.round(seg * 1.25));
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -5);
  const fogDensity = mobile ? 0.0092 : 0.0078;
  const terrainMat = new ShaderMaterial({
    vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG,
    uniforms: {
      uChaos: {value: .8}, uTime: {value: 0}, uTheme: {value: 0}, uFogDensity: {value: fogDensity},
      uBg: {value: palette.light.bg.clone()},
      uLine: {value: palette.light.line.clone()}, uHi: {value: palette.light.hi.clone()},
    },
  });
  const terrain = new Mesh(geo, terrainMat);
  terrain.frustumCulled = false;
  scene.add(terrain);

  // ── trees and boulders: scattered by the CPU twin of the terrain, grounded by the shader at any chaos level
  const rnd = (() => {let a = 0x9e3779b9;return () => {a = (a + 0x6D2B79F5) | 0;let t = Math.imul(a ^ (a >>> 15), 1 | a);t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};})();
  const slopeAt = (x: number, z: number) => {const h = terrainHeight(x, z);return Math.hypot(terrainHeight(x + 1, z) - h, terrainHeight(x, z + 1) - h);};
  const propMat = (grow: number) => new ShaderMaterial({
    vertexShader: PROP_VERT, fragmentShader: PROP_FRAG,
    uniforms: {uFogDensity: {value: fogDensity}, uGrow: {value: grow}, uBg: terrainMat.uniforms.uBg, uTheme: terrainMat.uniforms.uTheme},
  });
  const blocked = (_x: number, _z: number) => false;
  const propSets: {gy: InstancedBufferAttribute; xz: Float32Array; n: number; chaos: number}[] = [];
  const m4 = new Matrix4(), qt = new Quaternion(), sc = new Vector3(), ps = new Vector3(), up0 = new Vector3(0, 1, 0), col = new Color();
  const buildProps = (geom: BufferGeometry, count: number, accept: (x: number, z: number, h: number, s: number) => number, scaleFn: () => [number, number, number], palette: string[], lift: number, points?: [number, number][]) => {
    const mesh = new InstancedMesh(geom, propMat(1), count);
    if (!geom.attributes.aVc) geom.setAttribute('aVc', new BufferAttribute(new Float32Array(geom.attributes.position.count * 3).fill(1), 3));
    let n = 0, guard = 0;
    while (n < count && guard++ < count * 60) {
      const pt = points ? points[n % points.length] : undefined;
      if (points && guard > points.length * 3) break;
      const x = pt ? pt[0] : (rnd() - .5) * 190, z = pt ? pt[1] : -130 + rnd() * 150;
      if (!pt && blocked(x, z)) continue;
      const h = terrainHeight(x, z), sl = slopeAt(x, z);
      if (h < 1.9 || (!pt && rnd() > accept(x, z, h, sl))) {if (pt) {points!.splice(n, 1);if (!points!.length) break;}continue;}
      const [sx, sy, sz] = scaleFn();
      qt.setFromAxisAngle(up0, rnd() * Math.PI * 2);
      m4.compose(ps.set(x, 0, z), qt, sc.set(sx, sy, sz));
      mesh.setMatrixAt(n, m4);
      col.set(palette[Math.floor(rnd() * palette.length)]).multiplyScalar(.85 + rnd() * .3);
      mesh.setColorAt(n, col);
      n++;
    }
    mesh.count = n; mesh.frustumCulled = false; void lift;
    const gy = new InstancedBufferAttribute(new Float32Array(count), 1); gy.setUsage(DynamicDrawUsage);
    geom.setAttribute('aGy', gy);
    const xz = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {mesh.getMatrixAt(i, m4);xz[i * 2] = m4.elements[12];xz[i * 2 + 1] = m4.elements[14];gy.setX(i, terrainHeight(xz[i * 2], xz[i * 2 + 1]));}
    gy.needsUpdate = true;
    propSets.push({gy, xz, n, chaos: 0});
    return mesh;
  };
  // conifer: trunk + three tiers; broadleaf: trunk + clustered canopy. Flat-shaded low poly, vertex-tinted.
  const tint = (g: BufferGeometry, hex: string, jitter = 0) => {
    const cc = new Color(hex), a2 = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a2.length; i += 3) {const k = 1 + (rnd() - .5) * jitter;a2[i] = cc.r * k;a2[i + 1] = cc.g * k;a2[i + 2] = cc.b * k;}
    g.setAttribute('aVc', new BufferAttribute(a2, 3)); g.deleteAttribute('uv'); g.computeVertexNormals(); return g;
  };
  const cone = (r: number, h: number, y: number, hex: string) => {const g = new ConeGeometry(r, h, 7, 1, true).toNonIndexed();g.translate(0, y, 0);return tint(g, hex, .12);};
  const trunkG = (r: number, h: number) => {const g = new CylinderGeometry(r * .7, r, h, 5, 1, true).toNonIndexed();g.translate(0, h / 2, 0);return tint(g, '#6B5444');};
  const pine = mergeGeometries([trunkG(.26, 1.4), cone(1.35, 2.5, 2.0, '#FFFFFF'), cone(1.05, 2.2, 3.3, '#F3FFF3'), cone(.72, 2.0, 4.5, '#E8FFEA')])!;
  const bl = (() => {
    const k = (r: number, x: number, y: number, z: number, hex: string) => {const g = new IcosahedronGeometry(r, 1).toNonIndexed();const pa = g.attributes.position;for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) * (1 + (hash3(pa.getX(i), pa.getY(i), pa.getZ(i)) - .5) * .28) + x, pa.getY(i) * .85 + y, pa.getZ(i) + z);return tint(g, hex, .1);};
    return mergeGeometries([trunkG(.3, 1.8), k(1.5, 0, 2.9, 0, '#FFFFFF'), k(1.0, .9, 3.3, .4, '#EEFFE6'), k(.9, -.8, 3.2, -.5, '#F6FFEE')])!;
  })();
  const treeCount = mobile ? 1000 : 2400;
  const treeAccept = (x: number, z: number, h: number, sl: number) => (h < 24 + (rnd() - .5) * 6 && sl < 1.7 ? Math.min(1, .3 + (1 - h / 30) * .8) * (z > 20 ? .35 : 1) : 0);
  const trees = buildProps(pine, treeCount, treeAccept, () => {const k = .75 + rnd() * .9;return [k, k * (1 + rnd() * .5), k];},
    ['#2F5F4B', '#3B6E52', '#26503F', '#4A7A58', '#356B55'], 0);
  const broad = buildProps(bl, mobile ? 380 : 900, (x, z, h, sl) => (h < 9 && sl < .9 ? (z > 20 ? .3 : .9) : 0), () => {const k = .8 + rnd() * .8;return [k, k * (.9 + rnd() * .4), k];},
    ['#5B8F4E', '#6FA05A', '#4D8348', '#7FA85E', '#8DAA5A'], 0);
  scene.add(trees, broad);
  const rockGeo = (() => {const g = new IcosahedronGeometry(1, 1).toNonIndexed();const pa = g.attributes.position;for (let i = 0; i < pa.count; i++) {const k = .78 + hash3(pa.getX(i), pa.getY(i), pa.getZ(i)) * .44;pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k, pa.getZ(i) * k);}g.computeVertexNormals();return g;})();
  const rocks = buildProps(rockGeo, mobile ? 300 : 700,
    (x, z, h, sl) => (z < 20 ? Math.min(1, sl * .35 + (h > 24 ? .3 : 0) + .03) : .03),
    () => {const k = .5 + Math.pow(rnd(), 2.2) * 2.4;return [k * (1 + rnd() * .6), k * (.55 + rnd() * .4), k * (1 + rnd() * .5)];},
    ['#8A8D86', '#9A9C93', '#767A74', '#B1B1A6'], 0);
  scene.add(rocks);
  const propUniformSets = [trees.material as ShaderMaterial, broad.material as ShaderMaterial, rocks.material as ShaderMaterial];

  // ── messages: chaotic cloud → lattice on the slope
  const N = mobile ? 520 : 1300;
  const dg = new BufferGeometry();
  const aChaos = new Float32Array(N * 3), aOrder = new Float32Array(N * 2), aSeed = new Float32Array(N), pos0 = new Float32Array(N * 3);
  const cols = Math.ceil(Math.sqrt(N * 1.9)), rows = Math.ceil(N / cols);
  for (let i = 0; i < N; i++) {
    aChaos[i * 3] = (Math.random() - .5) * 90;
    aChaos[i * 3 + 1] = 2 + Math.random() * 26;
    aChaos[i * 3 + 2] = -70 + Math.random() * 120;
    const cx = i % cols, cz = Math.floor(i / cols);
    aOrder[i * 2] = (cx / (cols - 1) - .5) * 78;
    aOrder[i * 2 + 1] = 12 - (cz / Math.max(rows - 1, 1)) * 84;
    aSeed[i] = Math.random();
  }
  dg.setAttribute('position', new BufferAttribute(pos0, 3));
  dg.setAttribute('aChaos', new BufferAttribute(aChaos, 3));
  dg.setAttribute('aOrder', new BufferAttribute(aOrder, 2));
  dg.setAttribute('aSeed', new BufferAttribute(aSeed, 1));
  const dotMat = new ShaderMaterial({
    vertexShader: DOT_VERT, fragmentShader: DOT_FRAG, transparent: true, depthWrite: false, blending: NormalBlending,
    uniforms: {uChaos: {value: .8}, uTime: {value: 0}, uPx: {value: pixelRatio}, uFogDensity: {value: fogDensity}, uDot: {value: palette.light.dot.clone()}},
  });
  const dots = new Points(dg, dotMat);
  dots.frustumCulled = false;
  scene.add(dots);

  // ── sun / moon glow far behind the main peak
  const sunMat = new ShaderMaterial({
    vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: {uCol: {value: palette.light.sun.clone()}, uAmt: {value: .9}},
  });
  const sun = new Mesh(new PlaneGeometry(70, 70), sunMat);
  sun.position.set(14, 34, -150);
  scene.add(sun);

  // ── state
  const range = (document.body.dataset.sceneRange || '0,1').split(',').map(Number);
  const tonesEls = () => Array.from(document.querySelectorAll<HTMLElement>('[data-tone=dark]'));
  let zones: {top: number; bottom: number}[] = [];
  let maxScroll = 1, vh = innerHeight;
  const measure = () => {
    vh = innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    zones = tonesEls().map(el => {
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

  let stored: {p: number; theme: number} | null = null;
  try {stored = JSON.parse(sessionStorage.getItem(KEY) || 'null');} catch {/* private mode */}
  measure();
  let progress = stored && !opts.reduced ? stored.p : targetProgress();
  let theme = stored ? stored.theme : themeNow();
  let velocity = 0, lastY = scrollY;
  const mouse = new Vector2(), mouseS = new Vector2();
  const idleDrift = new Vector2();

  const ptr = (e: PointerEvent) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  };
  const gyro = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    mouse.set(MathUtils.clamp(e.gamma / 30, -1, 1), MathUtils.clamp((e.beta - 50) / 40, -1, 1));
  };
  window.addEventListener('pointermove', ptr, {passive: true});
  if (mobile && 'DeviceOrientationEvent' in window && !('requestPermission' in DeviceOrientationEvent)) {
    window.addEventListener('deviceorientation', gyro, {passive: true});
  }

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    measure();
  };
  resize();
  const ro = new ResizeObserver(() => {if (innerWidth !== lastW || innerHeight !== lastH) {lastW = innerWidth; lastH = innerHeight; resize();}});
  let lastW = innerWidth, lastH = innerHeight;
  ro.observe(document.documentElement);

  const tmpA = new Vector3(), tmpB = new Vector3(), right = new Vector3(), up = new Vector3(0, 1, 0), fwd = new Vector3();
  const cA = new Color(), cB = new Color();
  function mixTheme(t: number) {
    const L = palette.light, D = palette.dark, u = terrainMat.uniforms;
    (u.uBg.value as Color).copy(cA.copy(L.bg).lerp(D.bg, t));
    (u.uLine.value as Color).copy(cA.copy(L.line).lerp(D.line, t));
    (u.uHi.value as Color).copy(cA.copy(L.hi).lerp(D.hi, t));
    u.uTheme.value = t;
    (dotMat.uniforms.uDot.value as Color).copy(cB.copy(L.dot).lerp(D.dot, t));
    (sunMat.uniforms.uCol.value as Color).copy(cB.copy(L.sun).lerp(D.sun, t));
    sunMat.uniforms.uAmt.value = MathUtils.lerp(.9, .5, t);
    renderer.setClearColor(u.uBg.value as Color, 1);
    document.documentElement.style.setProperty('--scene-bg', '#' + (u.uBg.value as Color).getHexString());
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
      dotMat.uniforms.uPx.value = pixelRatio;
    } else if (frames % 90 === 0 && slow > 40) {trees.count = Math.floor(trees.count * .7); broad.count = Math.floor(broad.count * .7); rocks.count = Math.floor(rocks.count * .7); slow = 0;}
    if (frames % 120 === 0 && slow > 60 && mobile) skip = true;

    const y = scrollY; velocity += ((y - lastY) / Math.max(dt, .001) / vh - velocity) * Math.min(1, dt * 6); lastY = y;
    // inertial progress: heavy, critically damped, symmetric in both directions
    const tp = targetProgress();
    progress += (tp - progress) * (1 - Math.exp(-dt * 2.6));
    theme += (themeNow() - theme) * (1 - Math.exp(-dt * 7));
    mouseS.x += (mouse.x - mouseS.x) * (1 - Math.exp(-dt * 2.4));
    mouseS.y += (mouse.y - mouseS.y) * (1 - Math.exp(-dt * 2.4));
    idleDrift.set(Math.sin(time * .17) * .35, Math.cos(time * .13) * .25);

    const p = clamp01(progress);
    const portrait = Math.max(0, 1 - Math.min(camera.aspect, 1));
    camera.fov = 48 + portrait * 40 - 8 * smooth(.0, .3, p) + Math.min(5, Math.abs(velocity) * 2.2); // slight push on fast scroll
    camera.updateProjectionMatrix();
    posCurve.getPointAt(p, tmpA); lookCurve.getPointAt(p, tmpB);
    fwd.subVectors(tmpB, tmpA).normalize();
    right.crossVectors(fwd, up).normalize();
    tmpA.addScaledVector(right, (mouseS.x + idleDrift.x) * 2.8).addScaledVector(up, (-mouseS.y + idleDrift.y) * 1.5);
    tmpB.addScaledVector(right, (mouseS.x + idleDrift.x) * 5).addScaledVector(up, -mouseS.y * 2.5 - portrait * 9);
    tmpA.y = Math.max(tmpA.y, terrainHeight(tmpA.x, tmpA.z) + 4);
    camera.position.copy(tmpA);
    camera.lookAt(tmpB);
    camera.rotateZ(MathUtils.clamp(-velocity * .018, -.05, .05) + mouseS.x * -.012);

    const chaos = (1 - smooth(.03, .24, p)) * .55;
    terrainMat.uniforms.uChaos.value = chaos; dotMat.uniforms.uChaos.value = chaos;
    terrainMat.uniforms.uTime.value = time; dotMat.uniforms.uTime.value = time;
    for (const m of propUniformSets) m.uniforms.uGrow.value = MathUtils.lerp(.5, 1, 1 - chaos / .55);
    // Props follow the terrain's scribble only while the chaos mix is moving (hero); updated on the CPU, never per vertex.
    if (frames % (mobile ? 3 : 2) === 0) for (const ps2 of propSets) {
      if (Math.abs(chaos - ps2.chaos) < .004) continue;
      ps2.chaos = chaos;
      for (let i = 0; i < ps2.n; i++) ps2.gy.setX(i, terrainHeight(ps2.xz[i * 2], ps2.xz[i * 2 + 1], chaos));
      ps2.gy.needsUpdate = true;
    }
    mixTheme(theme);
    renderer.render(scene, camera);
    if (frames === 2) document.documentElement.classList.add('webgl');
  }

  const onVis = () => {running = !document.hidden; last = performance.now();};
  document.addEventListener('visibilitychange', onVis);
  const save = () => {try {sessionStorage.setItem(KEY, JSON.stringify({p: progress, theme}));} catch {/* ignore */}};
  addEventListener('pagehide', save);
  const onResizeScroll = () => measure();
  addEventListener('load', onResizeScroll);
  // layout can change as fonts/pins settle
  const remeasure = setInterval(measure, 1500);

  if (opts.reduced) {
    progress = targetProgress(); theme = themeNow();
    frame(performance.now()); cancelAnimationFrame(raf);
    mixTheme(theme); renderer.render(scene, camera);
    document.documentElement.classList.add('webgl');
  } else raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf); clearInterval(remeasure); ro.disconnect(); save();
      removeEventListener('pointermove', ptr); removeEventListener('deviceorientation', gyro);
      document.removeEventListener('visibilitychange', onVis); removeEventListener('pagehide', save);
      geo.dispose(); dg.dispose(); pine.dispose(); bl.dispose(); rockGeo.dispose(); for (const m of propUniformSets) m.dispose(); terrainMat.dispose(); dotMat.dispose(); sunMat.dispose(); renderer.dispose();
    },
  };
}
