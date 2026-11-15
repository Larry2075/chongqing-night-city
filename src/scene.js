import {coreHeight} from '../data/site-survey.js';
// Camera and illustration renderer adapted from Simcraft's scramble_night.html (MIT).
// Copyright (c) 2026 Simran Sachdeva. See LICENSE.simcraft.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildChongqing } from './chongqing.js';
import {updateWaterfrontView} from './waterfront.js';
import { createDistrict } from './district.js';
import { placeRiverFlight } from './river-flight.js';

const canvas = document.querySelector('#gl');
const mobileView = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const requestedWidth = Number(new URLSearchParams(location.search).get('width')) || (mobileView ? 720 : 1440);
const PW = Math.round(THREE.MathUtils.clamp(requestedWidth, 480, new URLSearchParams(location.search).has('master') ? 3840 : 1920));
const PH = Math.round(PW * 9 / 16);
const ASPECT = 16 / 9;
const LOOP = 12000;
const R = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
R.setPixelRatio(1);
R.setSize(PW, PH, false);
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const NOINK = [], GLOW = [], TICK = [];
const ramp = new THREE.DataTexture(new Uint8Array([112, 112, 128, 255, 255, 255, 255, 255]), 2, 1, THREE.RGBAFormat);   // shadow tone a touch blue, like the reference
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const cache = {};
const mat = (color, o = {}) => { const { roughness, metalness, envMapIntensity, emissive, emissiveIntensity, ...rest } = o;
  const k = color + JSON.stringify(Object.keys(rest).map((k) => [k, rest[k]?.uuid || rest[k]])) + (emissive || "") + (emissiveIntensity ?? "");
  return cache[k] ||= new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...(emissive ? { emissive, emissiveIntensity } : {}), ...rest }); };
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function tex(w, h, paint, rep = [1, 1]) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }
const G = scene;
const put = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; G.add(m); return m; };
const box = (w, h, d, m, x, y, z, ry = 0) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, 0, ry);

export const district = createDistrict();
buildChongqing({scene,box,mat,tex,put,rnd,TICK,NOINK,GLOW,LOOP,district});
const amb = new THREE.AmbientLight('#7184ac', .36);
const sun = new THREE.DirectionalLight('#8d9fca', .42);
sun.position.set(-65,95,65);
sun.target.position.set(0,10,-16);
scene.add(amb,sun,sun.target);

const SHOTS = {
  flat:    {x:-8,y:34,zf:0,W:171,fov:1.6,H:0,shift:-.04,yaw:-46,el:0},
  approach:{x:-17,y:25,zf:0,W:149,fov:34,H:-.16,shift:.16,yaw:-52,el:0},
  eaves:   {x:-17,y:19.6,zf:0,W:149,fov:83,H:-.28,shift:.31,yaw:-52,el:0},
  clear:   {x:-13,y:21,zf:0,W:144,fov:94,H:-.2,shift:.22,yaw:-46,el:2},
  climb:   {x: -2,y:24,zf:4,W:152,fov:81,H:-.1,shift:.12,yaw:-39,el:10},
  panorama:{x:  9,y:31,zf:6,W:197,fov:69,H:0,shift:0,yaw:-27,el:22},
  glide:   {x: 12,y:30,zf:8,W:204,fov:64,H:0,shift:0,yaw:-23,el:19},
};
for(const shot of Object.values(SHOTS))shot.y=coreHeight(shot.y);
const KEYS = [[0,'flat'],[1250,'flat'],[2550,'approach'],[3550,'eaves'],
  [4520,'clear'],[5500,'climb'],[7350,'panorama'],[8550,'glide'],[11250,'flat'],[LOOP,'flat']];
const NAMES = KEYS.map((k) => k[1]), TIMES = KEYS.map((k) => k[0]);
const PARAMS = (sh) => [sh.x, sh.y, sh.zf, Math.log(sh.W), Math.log(sh.fov), sh.H, sh.yaw, sh.el, sh.shift];
const VALS = NAMES.map((n) => PARAMS(SHOTS[n]));
// Fritsch-Carlson slopes per parameter: velocity is continuous through every key, and holds (equal keys) stay flat
const SLOPES = VALS[0].map((_, j) => { const n = TIMES.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((VALS[i + 1][j] - VALS[i][j]) / (TIMES[i + 1] - TIMES[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a_ = m[i] / d[i], b_ = m[i + 1] / d[i], h = a_ * a_ + b_ * b_; if (h > 9) { const t_ = 3 / Math.sqrt(h); m[i] = t_ * a_ * d[i]; m[i + 1] = t_ * b_ * d[i]; } }
  m[0] = m[n - 1] = 0; return m; });   // ends flat so the loop joins seamlessly
const cam = new THREE.PerspectiveCamera(30, ASPECT, .1, 4000);
const flightCamera = new THREE.PerspectiveCamera(48,ASPECT,.28,2000);
function shotAt(ms) {
  let k = 0; while (k < TIMES.length - 2 && ms >= TIMES[k + 1]) k++;
  const h = TIMES[k + 1] - TIMES[k], u = Math.min(1, Math.max(0, (ms - TIMES[k]) / h));
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  const v = VALS[k].map((a_, j) => h00 * a_ + h10 * h * SLOPES[j][k] + h01 * VALS[k + 1][j] + h11 * h * SLOPES[j][k + 1]);
  return { x: v[0], y: v[1], zf: v[2], W: Math.exp(v[3]), fov: Math.exp(v[4]), H: v[5], yaw: v[6], el: v[7], shift: v[8] };
}

function place(s) {
  const hf = THREE.MathUtils.degToRad(s.fov), D = (s.W / 2) / Math.tan(hf / 2);             // dolly zoom: W stays framed at zf
  // yaw: the camera swings round the focus point (x, zf) to look at the crossing from a corner; still level, so verticals stay vertical
  const yw = THREE.MathUtils.degToRad(s.yaw), camX = s.x + Math.sin(yw) * D, camZ = s.zf + Math.cos(yw) * D;
  cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / ASPECT));
  cam.position.set(camX, s.y, camZ); cam.lookAt(camX - Math.sin(yw), s.y, camZ - Math.cos(yw));                          // always level, always down the street
  // el: look down on the focus point from this many degrees up, by raising the camera and shifting the lens (no tilt),
  // so the target stays centred through a dolly zoom. el 0 = the hand-solved y and H as given.
  const vt = Math.tan(hf / 2) / ASPECT, te = Math.tan(THREE.MathUtils.degToRad(s.el)), camY = s.y + D * te, Hs = s.H + te / vt;
  cam.position.y = camY; cam.lookAt(camX - Math.sin(yw), camY, camZ - Math.cos(yw));
  cam.near = Math.max(.5, Math.min(D - 260, D * .49)); cam.far = D + 480; cam.updateProjectionMatrix();
  cam.projectionMatrix.elements[8] -= s.shift;
  cam.projectionMatrix.elements[9] -= Hs;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}

// ---------- illustration pass ----------
// Colour, surface direction + depth, and a shadow mask are rendered separately; a final pass draws the ink lines
// wherever depth or surface direction changes (so lines also appear where things meet, e.g. a cone on the road),
// with noise-varied weight and a slight wobble, and hatches the cast shadows with light strokes, like the reference.
const colorRT = new THREE.WebGLRenderTarget(PW, PH, { samples: 0, type: THREE.HalfFloatType });
const bloomRT = new THREE.WebGLRenderTarget(Math.round(PW/4),Math.round(PH/4),{type:THREE.HalfFloatType,depthBuffer:false});
const bloomTmp = bloomRT.clone();
const nrmRT = new THREE.WebGLRenderTarget(PW, PH, { type: THREE.HalfFloatType }); nrmRT.depthTexture = new THREE.DepthTexture(PW, PH, THREE.FloatType);
const shdRT = new THREE.WebGLRenderTarget(PW, PH);
const albRT = new THREE.WebGLRenderTarget(PW, PH);   // flat colours only (no sun): where one colour meets another, ink a line, like the reference
const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const shadowMat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
const post = new THREE.ShaderMaterial({ uniforms: { tC: { value: colorRT.texture }, tBloom:{value:bloomRT.texture},
    riverLights:{value:[[0,30,-3],[-38,25,5],[20,35,35],[266,98,134],[299,103,122],[333,97,107],[321,13,198],[84,20,302],[50,64,918],[181,16,638],[528,24,160],[105,42,366]].map(v=>new THREE.Vector3(...v))},
    riverColors:{value:['#ff9c35','#ffbd59','#ed3c4d','#87d5ec','#6ce6de','#ffc476','#f2ab64','#4cbeb8','#ef384a','#efb477','#e8b56e','#57bada'].map(v=>new THREE.Color(v))}, tN: { value: nrmRT.texture }, tD: { value: nrmRT.depthTexture }, tS: { value: shdRT.texture }, tA: { value: albRT.texture }, invVP: { value: new THREE.Matrix4() }, sunDir: { value: new THREE.Vector3() }, camPos: { value: new THREE.Vector3() }, VP: { value: new THREE.Matrix4() }, tl: { value: 0 }, camRot: { value: new THREE.Matrix3() },
    res: { value: new THREE.Vector2(PW, PH) }, ink: { value: new THREE.Color("#0b0b14") }, dbg: { value: 0 }, near: { value: .1 }, far: { value: 100 }, illustration: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: `
    uniform vec3 riverLights[12],riverColors[12]; uniform sampler2D tBloom; uniform sampler2D tC, tN, tD, tS, tA; uniform mat4 invVP; uniform mat3 camRot; uniform vec3 sunDir; uniform vec3 camPos; uniform mat4 VP; uniform float tl; uniform vec2 res; uniform float near, far, illustration; uniform vec3 ink; uniform float dbg; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    float lin(float d){ return near * far / (far - d * (far - near)); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1./2.4)) - .055, step(.0031308, c)); }
    // Lines where depth or surface direction changes. Depth uses the second difference (z+ + z- - 2z): a flat surface,
    // even one seen almost edge-on like the road from knee height, has none, so it isn't inked by mistake.
    float ecol;   // colour-boundary part of the last edgeAt, kept apart so ground markings can be drawn lighter
    float edgeAt(vec2 uv, float r, float cdens){
      vec2 px = r / res; vec3 ac = texture2D(tA, uv).rgb; float dc = texture2D(tD, uv).r; bool skyC = dc >= 1.; float zc = lin(dc); vec3 nc = texture2D(tN, uv).xyz * 2. - 1.;
      float e = 0.; ecol = 0.;
      for (int k = 0; k < 4; k++) { float a = float(k) * .785398; vec2 o = vec2(cos(a), sin(a)) * px;
        float d1 = texture2D(tD, uv + o).r, d2 = texture2D(tD, uv - o).r;
        bool s1 = d1 >= 1., s2 = d2 >= 1.;
        if (skyC != s1 || skyC != s2) { e = 1.; continue; }
        if (skyC) continue;
        float z1 = lin(d1), z2 = lin(d2);
        float kz = 1. + zc / 12.;                                       // far away, depth precision drops: demand a bigger jump
        e = max(e, smoothstep(.006 * kz, .02 * kz, abs(z1 + z2 - 2. * zc) / zc));
        vec3 n1 = texture2D(tN, uv + o).xyz * 2. - 1., n2 = texture2D(tN, uv - o).xyz * 2. - 1.;
        e = max(e, smoothstep(.25, .5, 1. - min(dot(nc, n1), dot(nc, n2))));
        vec3 a1 = texture2D(tA, uv + o).rgb, a2 = texture2D(tA, uv - o).rgb;   // colour boundaries (window bars, frames, trim, stripes)
        float dcol = max(length(a1 - ac), length(a2 - ac));
        ecol = max(ecol, smoothstep(.07, .11, dcol) * cdens); }
      return e; }
    // A fixed late-night sky in linear colour. No dawn gradient or time-of-day cycle.
    float fbm(vec2 p){ float a = .5, v = 0.; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
    vec3 skyAt(vec3 dir){ float e = dir.y;   // deep midnight blue; only a faint city glow below the clouds
      vec3 hor = vec3(.0045,.007,.014), low = vec3(.0028,.0045,.010), mid = vec3(.0018,.003,.007), zen = vec3(.0011,.0018,.004);
      vec3 c = mix(hor, low, smoothstep(-.01, .06, e)); c = mix(c, mid, smoothstep(.06, .22, e)); c = mix(c, zen, smoothstep(.22, .7, e));
      vec2 q = dir.xz / (max(e, 0.) + .1);
      float n = fbm(q * 1.1 + vec2(3.1, 7.7)), band = smoothstep(.02, .1, e) * (1. - smoothstep(.5, .8, e));
      float cl = smoothstep(.47, .55, n) * band;
      vec3 ccol = mix(vec3(.007,.006,.010), vec3(.0035,.005,.009), smoothstep(.5, .68, n) * smoothstep(.0, .3, e));   // undersides glow with the city's light
      c = mix(c, ccol, cl * .85);
      return c; }
    void main(){
      vec2 p = vUv * res;
      // wobble: displace the lookup a little along slow noise, so lines are not ruler-straight
      vec2 wob = vec2(0.);   // no screen-space wobble: noise fixed to the screen made lines crawl when the camera moved
      float zl = lin(texture2D(tD, vUv).r);
      float w = max(.68, mix(1.9, 1.35, smoothstep(6., 40., zl)) * (res.x / 2880.)) + illustration * .45;
      vec4 wp0 = invVP * vec4(vUv * 2. - 1., texture2D(tD, vUv).r * 2. - 1., 1.); wp0 /= wp0.w;
      float foot = length(fwidth(wp0.xyz));                          // metres per pixel here
      float cdens = 1. - smoothstep(.022, .05, foot);                 // colour lines (tiles, seams) fade before they crowd together and shimmer
      float e = edgeAt(vUv + wob, w, cdens);
      vec3 c = texture2D(tC, vUv).rgb;
      float d = texture2D(tD, vUv).r; bool isSky = d >= 1.;
      if (isSky) {
        vec4 fp = invVP * vec4(vUv * 2. - 1., 1., 1.); fp /= fp.w;
        c = skyAt(normalize(fp.xyz - camPos));
        vec3 paintedSky = mix(vec3(.008,.009,.018), vec3(.003,.0045,.011), smoothstep(.28,1.,vUv.y));
        float clouds = fbm(vUv * vec2(5.,13.) + vec2(2.4,7.));
        float paintedClouds = smoothstep(.51,.54,clouds) * smoothstep(.45,.74,vUv.y) * (1.-smoothstep(.81,1.04,vUv.y));
        paintedSky += paintedClouds * vec3(.003,.002,.004);
        c = mix(c, paintedSky, illustration);
      }
      float lit = texture2D(tS, vUv).r;
      if (!isSky) {
        vec3 nC = texture2D(tN, vUv).xyz * 2. - 1.;
        float graze = smoothstep(.18, .4, abs(nC.z));                    // no hatching on surfaces seen nearly edge-on (ground from knee height)
        vec3 nw = normalize(camRot * nC), an = abs(nw);
        float thr = an.y > .7 ? .35 : .62;                             // upright and rounded things (cones, poles) turn to shade sooner, like the drawn reference
        float sh = (1. - smoothstep(thr - .05, thr + .05, lit)) * graze;           // 1 only where no direct sun reaches (cast shadow / turned away)
        c *= mix(vec3(1.), vec3(.6, .63, .82), sh * mix(1.,.38,illustration));
        // hatching anchored to the world (not the screen), so it moves with surfaces and can't crawl or blink.
        vec4 wp = invVP * vec4(vUv * 2. - 1., d * 2. - 1., 1.); wp /= wp.w;
        vec2 q = an.y > .7 ? wp.xz : (an.x > an.z ? wp.zy : wp.xy);    // the plane the surface lies in
        float hv = (q.x + q.y) * 11.;                                  // diagonal strokes ~6.5 cm apart
        float fw = fwidth(hv);                                         // stripes per pixel: fade out before they get too fine to draw cleanly
        float st = 1. - smoothstep(.0, fw * 1.5 + .08, abs(fract(hv) - .5) - .32);
        float castOnly = smoothstep(.12, .22, dot(nw, sunDir));          // faces the sun but is in shade = a cast shadow; turned-away sides stay plain two-tone
        float hatchOn = sh * castOnly * (1. - smoothstep(.12, .22, fw));
        c = mix(c, c * vec3(.62, .64, .80), st * hatchOn * .7 * (1. - illustration));
        // hatching: fine diagonal strokes, broken up by noise, only inside shadow
        float hx = (p.x - p.y) * .18 + noise(p * .03) * 3.;
        float stroke = smoothstep(.86, .97, abs(sin(hx * 3.14159))) * step(.45, noise(p * vec2(.012, .05) + 3.));
        // (screen-space hatching removed: it slid over moving surfaces and read as blinking)
      }
      vec3 nUp = normalize(camRot * (texture2D(tN, vUv).xyz * 2. - 1.));
      // wet ground: screen-space reflection along the mirrored view ray, so every screen and sign shows in the road.
      // Puddles are world-anchored noise (they stay put as the camera moves); fresnel makes grazing views more mirror-like.
      if (!isSky && nUp.y > .9 && wp0.y < 30. && illustration < .98) {
        vec3 P = wp0.xyz, V = normalize(P - camPos), Rd = reflect(V, vec3(0., 1., 0.));
        float pud = smoothstep(.42, .6, fbm(P.xz * .3 + 7.));
        float wet = (P.y < .08 ? .5 : .3) + pud * .45, fres = .2 + .8 * pow(1. - max(dot(-V, vec3(0., 1., 0.)), 0.), 3.);
        vec3 refl = skyAt(Rd) * .6; float stp = .25 + length(P - camPos) * .015; vec3 Q = P + Rd * .05;
        for (int i = 0; i < 24; i++) { Q += Rd * stp; stp *= 1.07; vec4 sp = VP * vec4(Q, 1.); sp /= sp.w; vec2 su = sp.xy * .5 + .5;
          if (su.x < 0. || su.x > 1. || su.y < 0. || su.y > 1. || sp.z > 1.) break;
          float sz = lin(texture2D(tD, su).r), qz = lin(sp.z * .5 + .5);
          if (qz > sz && qz - sz < stp * 3.) { vec2 rip = vec2(noise(P.xz * 9.) - .5, 0.) * .004 * pud, px1 = 1.5 / res;
            vec3 hitc = (texture2D(tC, su + rip + vec2(px1.x, 0.)).rgb + texture2D(tC, su + rip - vec2(px1.x, 0.)).rgb + texture2D(tC, su + rip + vec2(0., px1.y)).rgb + texture2D(tC, su + rip - vec2(0., px1.y)).rgb) * .25;
            float edge = smoothstep(0., .08, su.x) * smoothstep(1., .92, su.x) * smoothstep(1., .9, su.y) * (1. - float(i) / 30.);
            refl = mix(refl, hitc, edge); break; } }
        c = mix(c * (1. - .3 * wet), refl, clamp(wet * fres, 0., .6) * (1. - illustration));
        vec2 cl2 = floor(P.xz * 1.6), fc = fract(P.xz * 1.6) - .5; float hh = hash(cl2), rph = fract(tl * 6. + hh);
        vec2 oc = (vec2(hash(cl2 + 3.1), hash(cl2 + 7.7)) - .5) * .4; float rr = length(fc - oc);
        float ring = (1. - smoothstep(0., .04, abs(rr - rph * .45))) * (1. - rph) * step(.3, hh) * (1. - smoothstep(.006, .02, foot));
        c += ring * wet * .35 * vec3(.75, .8, 1.) * (1. - illustration);
      }
      if (!isSky && nUp.y > .9 && wp0.y < .04 && wp0.z > 15.) {
        float wiggle = sin(wp0.z * .41 + tl * 6.283) + sin(wp0.z * 1.92 - tl * 12.566) * .52;
        float glint = smoothstep(.48, .81, noise(vec2((wp0.x + wiggle) * .56, wp0.z * 5. + tl * 2.)));
        float warm = exp(-pow((wp0.x + 3.) / (21. + wp0.z * .32), 2.)) * exp(-wp0.z / 85.);
        float crimson = exp(-pow((wp0.x - (52.73471188 - wp0.z * .40226658)) / 10., 2.)) * exp(-wp0.z / 130.);
        c += glint * (vec3(.57,.24,.059) * warm + vec3(.37,.035,.095) * crimson) * (.68 - illustration * .55);
        if (illustration > .01) {
          float row = floor(vUv.y * 95.);
          float brush = smoothstep(.52,.77,noise(vec2(vUv.x * 24.,row * 1.7)));
          brush *= smoothstep(.24,.43,fract(vUv.y * 95.)) * (1. - smoothstep(.61,.82,fract(vUv.y * 95.)));
          float reflection = exp(-pow((vUv.x-.48) * 5.5,2.)) * smoothstep(.015,.2,vUv.y);
          c += brush * (vec3(.025,.025,.045) + reflection * vec3(.18,.073,.033)) * illustration;
        }
      }
      if (!isSky) {
        c = mix(c, vec3(.004,.008,.018), smoothstep(330.,1500.,distance(wp0.xyz,camPos)) * .55 * (1.-illustration));
        if (nUp.y>.9 && wp0.y<.04) {
          float stretch = smoothstep(80.,210.,length(wp0.xz)) * (1.-illustration);
          float confluence = smoothstep(-25.,32.,wp0.x-326.-(wp0.z-214.)*.19);
          c = mix(c,c*mix(vec3(.75,1.14,1.16),vec3(1.17,1.015,.82),confluence),stretch*.67);
          float shine = (1.-smoothstep(7.,77.,length(wp0.xz-vec2(312.,204.))));
          float wake = smoothstep(.52,.8,noise(wp0.xz*vec2(2.8,4.3)+tl*.11));
          c += shine*wake*vec3(.095,.061,.038)*(1.-illustration);
          vec3 ray = normalize(wp0.xyz-camPos);
          c = mix(c,skyAt(ray)*.45,smoothstep(650.,1800.,distance(wp0.xyz,camPos)));
          float broken=smoothstep(.39,.76,noise(vec2(wp0.x*.91+sin(wp0.z*.37+tl*6.283),wp0.z*4.5-tl*4.)));
          for(int j=0;j<12;j++) {
            vec3 lamp=riverLights[j];
            float ratio=camPos.y/(camPos.y+lamp.y);
            vec2 center=mix(camPos.xz,lamp.xz,ratio);
            vec2 axis=normalize(lamp.xz-camPos.xz+vec2(.001));
            vec2 delta=wp0.xz-center;
            float across=dot(delta,vec2(-axis.y,axis.x));
            float along=dot(delta,axis);
            float width=4.+lamp.y*.065;
            float length=10.+min(90.,distance(camPos.xz,lamp.xz)*lamp.y/(camPos.y+lamp.y)*.40);
            float reflection=exp(-pow(across/width,2.)-pow(along/length,2.));
            c+=riverColors[j]*reflection*broken*.43*(1.-illustration);
          }
        }
      }
      float colW = isSky ? 0. : (nUp.y > .7 ? .38 : 1.);            // tile joints and paint edges on the ground: thin grey, like the reference; on objects: full ink
      e = max(smoothstep(.35, .65, e), smoothstep(.35, .65, ecol) * colW);                                   // crisp: a line is either there or not
      c = mix(c, ink, e * (isSky ? .35 : mix(.36,.9,illustration)));
      // glow: bright pixels (screens, neon, lamps, lit windows) bloom softly into their surroundings
      vec3 gsum = vec3(0.); for (int k = 0; k < 16; k++) { float a = float(k) * 2.39996, r = (5. + float(k) * 2.2) * (res.x / 2880.); vec3 sc = texture2D(tC, vUv + vec2(cos(a), sin(a)) * r / res).rgb; gsum += max(sc - .8, 0.) * (1. - float(k) / 20.); }
      c += gsum * mix(.09,.035,illustration);
      c += texture2D(tBloom,vUv).rgb * mix(.68,.12,illustration);
      if (dbg > .5) c = texture2D(tC, vUv).rgb; if (dbg > 1.5) c = vec3(texture2D(tS, vUv).r); if (dbg > 2.5) c = texture2D(tA, vUv).rgb; if (dbg > 3.5) c = vec3(1. - e);
      c *= mix(1., .74, smoothstep(.55, 1.08, length((vUv - .5) * vec2(1.6, 1.))));   // vignette
      // night grade: a little more saturation and a gentle S-curve so neon and screens pop
      float lum = dot(c, vec3(.2126, .7152, .0722)); c = clamp(mix(vec3(lum), c, 1.18), 0., 1.); c = c * c * (3. - 2. * c) * .35 + c * .65;
      vec3 graded = toSRGB(clamp(c, 0., 1.));
      float paper = (hash(floor(p))- .5) * .022 * illustration;
      gl_FragColor = vec4(clamp(graded + paper, 0., 1.), 1.);
    }` });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); quad.frustumCulled = false;
const postScene = new THREE.Scene(); postScene.add(quad); const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bloomPass = new THREE.ShaderMaterial({
  uniforms:{source:{value:colorRT.texture},direction:{value:new THREE.Vector2()},threshold:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D source;uniform vec2 direction;uniform float threshold;varying vec2 vUv;
    void main(){vec3 sum=vec3(0.);float weights=0.;
      for(int i=-5;i<=5;i++){float f=float(i),w=exp(-f*f/10.);vec3 c=texture2D(source,vUv+direction*f).rgb;
        c=mix(c,max(c-vec3(.65),0.),threshold);sum+=c*w;weights+=w;}
      gl_FragColor=vec4(sum/weights,1.);}`
});
const bloomScene=new THREE.Scene();bloomScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),bloomPass));
function draw(view = cam) {
  const bg = scene.background;
  R.setRenderTarget(colorRT); R.render(scene, view);
  bloomPass.uniforms.source.value=colorRT.texture;bloomPass.uniforms.threshold.value=1;
  bloomPass.uniforms.direction.value.set(5/PW,0);R.setRenderTarget(bloomTmp);R.render(bloomScene,postCam);
  bloomPass.uniforms.source.value=bloomTmp.texture;bloomPass.uniforms.threshold.value=0;
  bloomPass.uniforms.direction.value.set(0,5/PH);R.setRenderTarget(bloomRT);R.render(bloomScene,postCam);
  NOINK.forEach((o) => { o.visible = false; }); scene.background = null; scene.overrideMaterial = normalMat; R.setRenderTarget(nrmRT); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, view);
  GLOW.forEach((o) => { o.visible = false; }); scene.overrideMaterial = null; sun.visible = false; R.setRenderTarget(albRT); R.setClearColor(0x000000, 1); R.clear(); R.render(scene, view); sun.visible = true;
  const si = sun.intensity; sun.intensity = 2 * Math.PI;   // mask pass (three divides Lambert by pi): lit = 2 x (sun . normal), so surfaces turned more than ~80 deg from the sun read as shade (crisp two-tone on cones and poles)
  scene.overrideMaterial = shadowMat; amb.visible = false; R.setRenderTarget(shdRT); R.setClearColor(0x000000, 1); R.clear(); R.render(scene, view);
  sun.intensity = si; amb.visible = true; scene.overrideMaterial = null; scene.background = bg; GLOW.forEach((o) => { o.visible = true; }); NOINK.forEach((o) => { o.visible = true; });
  post.uniforms.near.value = view.near; post.uniforms.far.value = view.far;
  post.uniforms.camPos.value.copy(view.position); post.uniforms.VP.value.copy(view.projectionMatrix).multiply(view.matrixWorldInverse); post.uniforms.sunDir.value.copy(sun.position).sub(sun.target.position).normalize(); post.uniforms.invVP.value.copy(view.matrixWorld).multiply(view.projectionMatrixInverse); post.uniforms.camRot.value.setFromMatrix4(view.matrixWorld);
  R.setRenderTarget(null); R.render(postScene, postCam);
}
{ scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3();
  scene.traverse(o=>{if(!o.isMesh)return;bounds.setFromObject(o);
    if(bounds.min.z>165&&bounds.max.x<211)o.userData.hideInIllustration=true;
  });
  const keep = new Set([...GLOW, ...NOINK]); const groups = new Map(), drop = [];
  const pinned = (o) => { for (let q = o; q; q = q.parent) if (keep.has(q) || q.userData.noMerge) return true; return false; };
  scene.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || pinned(o) || !o.geometry.attributes.uv || !o.geometry.attributes.normal) return;
    const k = o.material.uuid + (o.userData.hideInIllustration ? "i" : "") + (o.castShadow ? "s" : "") + (o.receiveShadow ? "r" : ""); if (!groups.has(k)) groups.set(k, { m: o.material, cs: o.castShadow, rs: o.receiveShadow, illustrationHidden:o.userData.hideInIllustration, gs: [] });
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const a of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(a)) g.deleteAttribute(a); g.morphAttributes = {};
    g.applyMatrix4(o.matrixWorld); g.clearGroups(); groups.get(k).gs.push(g); drop.push(o); });
  drop.forEach((o) => o.parent.remove(o));
  for (const { m, cs, rs, gs, illustrationHidden } of groups.values()) { const mg = mergeGeometries(gs, false); gs.forEach(g => g.dispose()); if (!mg) continue; const mm = new THREE.Mesh(mg, m); mm.castShadow = cs; mm.receiveShadow = rs; mm.frustumCulled = false; mm.userData.hideInIllustration=illustrationHidden; scene.add(mm); } }

const illustrationForeground=[];
scene.traverse(o=>{if(o.userData.hideInIllustration)illustrationForeground.push(o);});
const rainCount = 200;
const rainPositions = new Float32Array(rainCount * 6);
const rainGeometry = new THREE.BufferGeometry();
const rainAttribute = new THREE.BufferAttribute(rainPositions, 3).setUsage(THREE.DynamicDrawUsage);
rainGeometry.setAttribute('position', rainAttribute);
const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({
  color:'#acb7df', transparent:true, opacity:.25, depthTest:false, depthWrite:false
}));
rain.frustumCulled = false;
rain.visible = true;
postScene.add(rain);
rain.renderOrder = 1;
const seeds = Array.from({length:rainCount},()=>[rnd(),rnd(),rnd(),rnd()]);

export function renderScene(ms) {
  const shot = shotAt(ms);
  const illustration = 1 - THREE.MathUtils.smoothstep(shot.fov, 2, 33);
  const sceneTime = ms <= 1250 || ms >= 11250 ? 0 : (ms - 1250) / 10000 * LOOP;
  place(shot);
  renderView(cam,sceneTime,illustration);
}

export function renderExplore(camera, elapsed) {
  renderView(camera,elapsed % LOOP,0,elapsed);
}

export function renderFlight(ms) {
  placeRiverFlight(flightCamera,ms);
  renderView(flightCamera,ms % LOOP,0,ms,true);
}

function renderView(view, sceneTime, illustration,trafficTime=sceneTime,cinematic=false) {
  // The flat illustration omits the real foreground north-bank cutaway;
  // it re-enters once the perspective camera has moved over the water.
  illustrationForeground.forEach(o=>o.visible=!(view===cam&&illustration>.001));
  updateWaterfrontView(view,view===cam?illustration:0);
  TICK.forEach(tick => tick(sceneTime,trafficTime,cinematic));
  post.uniforms.tl.value = sceneTime / LOOP;
  post.uniforms.illustration.value = illustration;
  rain.visible = illustration < .995;
  rain.material.opacity = .25 * (1 - illustration);
  seeds.forEach(([a,b,c,d],i) => {
    const turns = 11 + Math.floor(d*8);
    const p = (b + sceneTime / LOOP * turns) % 1;
    const x = ((a + (1-p)*.074) % 1) * 2 - 1;
    const y = 1 - p * 2;
    const length = .021 + c * .067;
    const index = i * 6;
    rainPositions[index] = x;
    rainPositions[index+1] = y;
    rainPositions[index+2] = -.05;
    rainPositions[index+3] = x+.17*length;
    rainPositions[index+4] = y-length;
    rainPositions[index+5] = -.05;
  });
  rainAttribute.needsUpdate = true;
  draw(view);
}

export const duration = LOOP;
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  document.querySelector('#status').textContent = '图形连接已中断，刷新页面可重新加载。';
  document.querySelector('#status').hidden = false;
});
