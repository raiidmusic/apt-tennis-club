"use client";

// Adapted from Fuzzy Critter Footer by Kedhareswer Naidu (MIT).
// See THIRD_PARTY_NOTICES.md for the license.
import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

// #region physics
// Screen-space 2D bodies in stage pixels: x right, y up from the stage bottom.
// Everything here is plain math so the test can lift it and run it as shipped.

/** r: round collision radius between bodies; wall: visual half-width, so wide shapes stop at the stage edge instead of poking past it */
type Body = { x: number; y: number; vx: number; vy: number; a: number; va: number; r: number; wall: number; live: boolean; held: boolean; onFloor: boolean }
type World = { w: number; h: number; floor: number; gravity: number; bounce: number }
type Hand = { x: number; y: number }

/** Scale the original scene to fit six balls across a narrow footer. */
function unitFor(w: number) {
  return Math.max(30, Math.min(150, w < 640 ? w / 8.8 : w / 9.4))
}

/** Floor line, px above the stage bottom */
function floorFor(unit: number) {
  return 10 + unit * 0.16
}

function makeBody(r: number, wall = r): Body {
  return { x: 0, y: -9999, vx: 0, vy: 0, a: 0, va: 0, r, wall, live: false, held: false, onFloor: false }
}

/** Where the i-th of n creatures enters: above the stage top, spread across, falling and tumbling */
function dropStart(b: Body, i: number, n: number, world: World, rnd: () => number) {
  const lane = (i + 0.5 + (rnd() - 0.5) * 0.6) / n
  b.live = true
  b.held = false
  b.onFloor = false
  b.x = Math.min(world.w - b.wall, Math.max(b.wall, lane * world.w))
  b.y = world.h + b.r + 40 + rnd() * 160
  b.vx = (rnd() - 0.5) * 140
  b.vy = -60 - rnd() * 120
  b.a = (rnd() - 0.5) * 1.2
  b.va = (rnd() - 0.5) * 3
}

/** One substep. Returns landing strengths (0..1) by body index, for squash, fur shake and the thud. */
function stepBodies(bodies: Body[], world: World, dt: number, hand: Hand | null): number[] {
  const impacts: number[] = []
  const e = Math.max(0, Math.min(0.9, world.bounce))
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    impacts[i] = 0
    if (!b.live) continue
    if (b.held && hand) {
      // a stiff spring to the hand, kept inside the stage
      const tx = Math.min(world.w - b.wall, Math.max(b.wall, hand.x))
      const ty = Math.min(world.h - b.r * 0.6, Math.max(world.floor + b.r, hand.y))
      b.vx = (tx - b.x) * 18
      b.vy = (ty - b.y) * 18
      b.va += (-b.vx * 0.00025 - b.va) * 4 * dt
    } else b.vy -= world.gravity * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.a += b.va * dt
    b.onFloor = false
    if (b.y - b.r < world.floor) {
      b.y = world.floor + b.r
      if (b.vy < -80) impacts[i] = Math.min(1, -b.vy / 1400)
      b.vy = -b.vy * e
      if (Math.abs(b.vy) < 60) b.vy = 0
      b.onFloor = true
      b.vx *= 1 - 3 * dt
      // rolling: spin follows the ground speed
      b.va += (-b.vx / b.r - b.va) * Math.min(1, 3 * dt)
    }
    if (b.x - b.wall < 0) { b.x = b.wall; b.vx = Math.abs(b.vx) * e }
    if (b.x + b.wall > world.w) { b.x = world.w - b.wall; b.vx = -Math.abs(b.vx) * e }
    b.va *= 1 - 0.6 * dt
    if (b.onFloor) {
      // sit back up: a spring toward upright on the shortest way round
      const tilt = Math.atan2(Math.sin(b.a), Math.cos(b.a))
      b.va += -tilt * 38 * dt
      b.va *= 1 - 4 * dt
    }
  }
  // soft discs: overlap pushed apart half each, closing speed reflected
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const p = bodies[i], q = bodies[j]
      if (!p.live || !q.live) continue
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), min = (p.r + q.r) * 0.92
      if (d <= 0 || d >= min) continue
      const nx = dx / d, ny = dy / d, half = (min - d) / 2
      p.x -= nx * half; p.y -= ny * half; q.x += nx * half; q.y += ny * half
      const closing = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny
      if (closing < 0) {
        const jn = (-(1 + e) * closing) / 2
        p.vx -= jn * nx; p.vy -= jn * ny; q.vx += jn * nx; q.vy += jn * ny
        const slide = (q.vx - p.vx) * -ny + (q.vy - p.vy) * nx
        p.va += slide * 0.002; q.va -= slide * 0.002
      }
    }
  }
  // a crowded row can shove a body back past a wall or into the floor: those have the last word
  for (const b of bodies) {
    if (!b.live) continue
    if (b.x - b.wall < 0) b.x = b.wall
    if (b.x + b.wall > world.w) b.x = world.w - b.wall
    if (b.y - b.r < world.floor) {
      b.y = world.floor + b.r
      if (b.vy < 0) b.vy = 0
    }
    // a held body can't be shoved up out of the stage by the crowd it's dragged into
    if (b.held && hand && b.y > world.h - b.r * 0.6) b.y = world.h - b.r * 0.6
  }
  return impacts
}

/** Topmost live body under a point (later bodies draw on top) */
function bodyAt(bodies: Body[], x: number, y: number) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i]
    if (b.live && Math.hypot(b.x - x, b.y - y) < b.r * 0.95) return i
  }
  return -1
}

/** Wordmark arc for glyph i of n at bend w (0 = straight): em offsets and degrees */
function arcFor(i: number, n: number, w: number) {
  const c = n > 1 ? (i / (n - 1)) * 2 - 1 : 0
  return { x: w * 0.14 * c, y: w * 0.2 * c * c, deg: w * 13 * c }
}

/** How far the footer still has to scroll in: 1 = just entering, 0 = fully on screen */
function bendFor(top: number, height: number, viewport: number) {
  const seen = (viewport - top) / Math.max(1, height)
  return 1 - Math.min(1, Math.max(0, seen))
}
// #endregion
const BALL_SIZES = [1.10, 0.85, 1.19, 1.07, 0.93, 1.04];
const WORD = "APT TENNIS";

type BallPose = { spin: number; spinVelocity: number; squash: number; squashVelocity: number };

const BALL_VERTEX = `
  varying vec3 vSurface;
  varying vec3 vNormal;
  void main() {
    vSurface = normalize(position);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FELT_LIGHT = `
  float seamDistance(vec3 position) {
    return abs(position.y - 0.42 * sin(2.0 * atan(position.x, position.z)));
  }
  float feltLight(vec3 normal) {
    float sun = max(dot(normal, normalize(vec3(-0.12, 0.91, 0.40))), 0.0);
    float bounce = max(dot(normal, normalize(vec3(0.06, -0.95, 0.07))), 0.0);
    return 0.81 + sun * 0.24 + bounce * bounce * 0.23;
  }
  vec3 feltHighlight(vec3 normal) {
    return vec3(0.10, 0.09, 0.13) * smoothstep(0.35, 0.95, normal.y);
  }
`;

const BALL_FRAGMENT = `
  uniform sampler2D uFeltDetail;
  uniform float uFeltReady;
  varying vec3 vSurface;
  varying vec3 vNormal;
  ${FELT_LIGHT}
  float feltDetail(vec3 surface) {
    // Blend planar projections so the felt follows the ball without a UV seam.
    vec3 weights = pow(abs(surface), vec3(6.0));
    weights /= weights.x + weights.y + weights.z;
    vec3 samplePoint = surface * 0.84 + 0.5;
    return (weights.x * texture2D(uFeltDetail, samplePoint.zy).r
      + weights.y * texture2D(uFeltDetail, samplePoint.xz).r
      + weights.z * texture2D(uFeltDetail, samplePoint.xy).r - 0.5) * uFeltReady;
  }
  void main() {
    vec3 surface = normalize(vSurface);
    vec3 normal = normalize(vNormal);
    float detail = feltDetail(surface);
    float distance = seamDistance(surface) + detail * 0.014;
    float seam = 1.0 - smoothstep(0.046, 0.068, distance);
    float groove = (1.0 - smoothstep(0.071, 0.091, distance)) - seam;
    float surfaceTone = 1.0 + detail * 0.58 + clamp(dFdy(detail), -0.2, 0.2) * 0.14;
    vec3 felt = (vec3(0.75, 0.80, 0.035) + feltHighlight(normal)) * surfaceTone * (1.0 - groove * 0.16);
    vec3 color = mix(felt, vec3(0.88, 0.88, 0.85), seam);
    gl_FragColor = vec4(color * feltLight(normal), 1.0);
  }
`;

const STRAND_VERTEX = `
  attribute vec3 aRoot;
  attribute vec4 aStrand;
  varying vec3 vColor;
  varying float vHeight;
  ${FELT_LIGHT}
  void main() {
    vec3 root = aRoot;
    vec3 axis = abs(root.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(root, axis));
    vec3 bitangent = cross(root, tangent);
    vec3 side = tangent * cos(aStrand.x) + bitangent * sin(aStrand.x);
    vec3 lean = cross(root, side);
    float distance = seamDistance(root);
    float felt = smoothstep(0.046, 0.091, distance);
    float height = position.y;
    float fiberLength = aStrand.y * mix(0.20, 1.0, felt);
    vec3 point = root * (0.998 + fiberLength * height)
      + side * position.x
      + lean * (aStrand.z * height * height * fiberLength);

    vec3 normal = normalize(normalMatrix * root);
    vec3 rootColor = mix(vec3(0.82, 0.82, 0.79), vec3(0.73, 0.78, 0.025), felt);
    vec3 tipColor = mix(vec3(0.91, 0.91, 0.88), vec3(0.83, 0.88, 0.11) + feltHighlight(normal), felt);
    vColor = mix(rootColor, tipColor, smoothstep(0.0, 0.92, height))
      * (0.96 + aStrand.w * 0.08) * feltLight(normal);
    vHeight = height;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
  }
`;

const STRAND_FRAGMENT = `
  varying vec3 vColor;
  varying float vHeight;
  void main() {
    gl_FragColor = vec4(vColor * (0.87 + vHeight * 0.13), 1.0);
  }
`;

function createFeltGeometry(T: typeof import("three"), count: number) {
  const roots = new Float32Array(count * 3);
  const strands = new Float32Array(count * 4);
  let seed = 38273;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < count; index++) {
    const y = 1 - (2 * (index + random())) / count;
    const angle = index * 2.399963 + (random() - 0.5) * 0.11;
    const radius = Math.sqrt(1 - y * y);
    roots.set([Math.cos(angle) * radius, y, Math.sin(angle) * radius], index * 3);
    strands.set([random() * 2 * Math.PI, 0.009 + 0.025 * random(), (random() - 0.35) * 1.45, random()], index * 4);
  }
  const geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute([
    -0.005, 0, 0, 0.005, 0, 0,
    -0.003, 0.42, 0, 0.003, 0.42, 0,
    -0.0014, 0.76, 0, 0.0014, 0.76, 0,
    0, 1, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
  geometry.setAttribute("aRoot", new T.InstancedBufferAttribute(roots, 3));
  geometry.setAttribute("aStrand", new T.InstancedBufferAttribute(strands, 4));
  geometry.instanceCount = count;
  return geometry;
}

function createRenderer(T: typeof import("three"), stage: HTMLElement) {
  const canvas = document.createElement("canvas");
  const webgl = canvas.getContext("webgl2", { antialias: true, alpha: true });
  if (!webgl) return;
  const gl = new T.WebGLRenderer({ canvas, context: webgl, antialias: true, alpha: true });
  gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  gl.domElement.className = "apt-footer__canvas";
  stage.appendChild(gl.domElement);

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
  camera.position.z = 1000;
  const sphere = new T.SphereGeometry(1, 48, 32);
  const feltReady = { value: 0 };
  const feltDetail = new T.TextureLoader().load("/apt-assets/footer-tennis-felt-detail.webp", () => {
    feltReady.value = 1;
  });
  feltDetail.wrapS = feltDetail.wrapT = T.MirroredRepeatWrapping;
  const material = new T.ShaderMaterial({
    vertexShader: BALL_VERTEX,
    fragmentShader: BALL_FRAGMENT,
    uniforms: { uFeltDetail: { value: feltDetail }, uFeltReady: feltReady },
  });
  const feltGeometry = createFeltGeometry(T, stage.clientWidth < 640 ? 3400 : 6600);
  const feltMaterial = new T.ShaderMaterial({
    vertexShader: STRAND_VERTEX,
    fragmentShader: STRAND_FRAGMENT,
    side: T.DoubleSide,
  });
  const shadowPlane = new T.PlaneGeometry(1, 1);
  const shadowSource = document.createElement("canvas");
  shadowSource.width = shadowSource.height = 64;
  const context = shadowSource.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 32);
    gradient.addColorStop(0, "rgba(23, 27, 24, .40)");
    gradient.addColorStop(.55, "rgba(23, 27, 24, .16)");
    gradient.addColorStop(1, "rgba(23, 27, 24, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const shadowMap = new T.CanvasTexture(shadowSource);
  const meshes = BALL_SIZES.map(() => {
    const ball = new T.Mesh(sphere, material);
    const felt = new T.Mesh(feltGeometry, feltMaterial);
    felt.frustumCulled = false;
    ball.add(felt);
    const shadow = new T.Mesh(shadowPlane, new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }));
    scene.add(ball, shadow);
    return { ball, shadow };
  });

  return {
    size(world: World) {
      gl.setSize(world.w, world.h, false);
      camera.right = world.w;
      camera.top = world.h;
      camera.updateProjectionMatrix();
    },
    draw(world: World, bodies: Body[], poses: BallPose[]) {
      bodies.forEach((body, index) => {
        const { ball, shadow } = meshes[index];
        ball.visible = shadow.visible = body.live;
        if (!body.live) return;
        const pose = poses[index];
        const lift = Math.max(0, body.y - body.r - world.floor);
        ball.position.set(body.x, body.y + pose.squash * body.r * 0.55, index);
        // The central resting pose follows the supplied photo.
        const angle = index - 2.5;
        ball.rotation.set(0.65 + angle * 0.09, 0.94 + pose.spin + angle * 0.23, 2.19 + body.a + angle * 0.25);
        ball.scale.set(body.r * (1 - pose.squash * 0.55), body.r * (1 + pose.squash), body.r);
        shadow.position.set(body.x, world.floor - 1, -900);
        shadow.scale.set(body.r * 2.6 * (1 - Math.min(0.55, lift / 500)), body.r * 0.48, 1);
        shadow.material.opacity = 0.94 - Math.min(0.75, lift / 420);
      });
      gl.render(scene, camera);
    },
    dispose() {
      sphere.dispose();
      material.dispose();
      feltDetail.dispose();
      feltGeometry.dispose();
      feltMaterial.dispose();
      shadowPlane.dispose();
      shadowMap.dispose();
      meshes.forEach(({ shadow }) => shadow.material.dispose());
      gl.dispose();
      gl.domElement.remove();
    },
  };
}

export default function TennisFooterScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const replay = useRef<() => void>(() => {});

  useEffect(() => {
    const stage = stageRef.current;
    const word = wordRef.current;
    if (!stage || !word) return;
    const footer = stage.closest("footer");
    if (!footer) return;
    const glyphs = Array.from(word.querySelectorAll<HTMLElement>(".apt-footer__letter"));
    const images = Array.from(stage.querySelectorAll<HTMLElement>(".apt-footer__still"));
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const world: World = { w: 1, h: 1, floor: 10, gravity: 2600, bounce: 0.32 };
    const bodies = BALL_SIZES.map(() => makeBody(1));
    const poses = BALL_SIZES.map(() => ({ spin: 0, spinVelocity: 0, squash: 0, squashVelocity: 0 }));
    const timers = new Set<number>();
    const leaving = BALL_SIZES.map(() => 0);
    let renderer: ReturnType<typeof createRenderer> | undefined;
    let rendererRequested = false, disposed = false, onScreen = false, dropped = false;
    let animation = 0, last = performance.now(), curve = -1, target = 1, nextHop = 0;
    let hand = { x: -1e4, y: -1e4 };
    let dx = 0, dy = 0, lastMove = 0;
    let held = -1, origin = hand, moved = false;

    const later = (ms: number, callback: () => void) => {
      const timer = window.setTimeout(() => { timers.delete(timer); callback(); }, ms);
      timers.add(timer);
    };
    const coordinates = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: bounds.bottom - event.clientY };
    };
    const track = (event: PointerEvent) => {
      const next = coordinates(event);
      const now = performance.now();
      const seconds = Math.max(8, now - lastMove) / 1000;
      dx = (next.x - hand.x) / seconds;
      dy = (next.y - hand.y) / seconds;
      if (Math.abs(dx) > 4000 || Math.abs(dy) > 4000) dx = dy = 0;
      hand = next;
      lastMove = now;
      if (held < 0) stage.classList.toggle("apt-footer__scene--over", bodyAt(bodies, hand.x, hand.y) >= 0);
    };
    const leave = () => {
      hand = { x: -1e4, y: -1e4 };
      stage.classList.remove("apt-footer__scene--over");
    };
    const drag = (event: PointerEvent) => {
      track(event);
      if (Math.hypot(hand.x - origin.x, hand.y - origin.y) > 6) moved = true;
    };
    const release = (event?: PointerEvent) => {
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      stage.classList.remove("apt-footer__scene--grab");
      if (held < 0) return;
      const ball = bodies[held];
      held = -1;
      ball.held = false;
      if (!moved && event?.type === "pointerup") {
        ball.vy = 950 + Math.random() * 250;
        ball.vx += (Math.random() - 0.5) * 300;
        ball.va += (Math.random() - 0.5) * 9;
        ball.onFloor = false;
      } else {
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > 2600) { ball.vx *= 2600 / speed; ball.vy *= 2600 / speed; }
      }
    };
    const grab = (event: PointerEvent) => {
      if (preference.matches || !event.isPrimary || event.button !== 0) return;
      const point = coordinates(event);
      const index = bodyAt(bodies, point.x, point.y);
      if (index < 0) return;
      event.preventDefault();
      held = index;
      bodies[index].held = true;
      origin = hand = point;
      moved = false;
      stage.classList.add("apt-footer__scene--grab");
      window.addEventListener("pointermove", drag);
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

    const dropIn = (index: number) => {
      leaving[index] = 0;
      dropStart(bodies[index], index, bodies.length, world, Math.random);
      const pose = poses[index];
      pose.spin = (Math.random() - 0.5) * 2;
      pose.spinVelocity = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 4);
      pose.squash = pose.squashVelocity = 0;
    };
    const drop = () => {
      if (preference.matches) return;
      timers.forEach(clearTimeout);
      timers.clear();
      const start = performance.now();
      nextHop = start + 5500;
      bodies.forEach((ball, index) => {
        const delay = index * 260 + Math.random() * 120;
        leaving[index] = 0;
        if (!ball.live) {
          later(delay, () => dropIn(index));
        } else {
          // On replay, follow the original upward exit before each ball falls again.
          later(index * 70, () => {
            if (held === index) release();
            ball.onFloor = false;
            ball.vy = 1.25 * Math.sqrt(2 * world.gravity * Math.max(0, world.h - ball.y + ball.r * 1.5 + 60));
            ball.vx += (Math.random() - 0.5) * 120;
            ball.va += (Math.random() - 0.5) * 6;
            leaving[index] = start + 520 + delay;
          });
        }
      });
    };
    replay.current = () => {
      if (preference.matches) return;
      dropped = true;
      stage.dataset.running = "";
      drop();
    };

    const measure = () => {
      word.style.fontSize = "100px";
      const width = footer.clientWidth;
      const natural = word.offsetWidth;
      if (natural > 0) word.style.fontSize = `${(100 * width * 0.945) / natural}px`;
      const previousWidth = world.w;
      world.w = Math.max(1, stage.clientWidth);
      world.h = Math.max(1, stage.clientHeight);
      const unit = unitFor(world.w);
      world.floor = floorFor(unit);
      bodies.forEach((ball, index) => {
        ball.r = ball.wall = unit * 0.68 * BALL_SIZES[index];
        ball.x = Math.min(world.w - ball.wall, Math.max(ball.wall, ball.x * world.w / previousWidth));
        if (ball.onFloor || (ball.live && ball.y - ball.r < world.floor)) ball.y = world.floor + ball.r;
      });
      renderer?.size(world);
    };

    const updateView = () => {
      const bounds = footer.getBoundingClientRect();
      target = bendFor(bounds.top, bounds.height, window.innerHeight);
      if (onScreen && !preference.matches && !dropped && bounds.bottom <= window.innerHeight + 2) {
        dropped = true;
        stage.dataset.running = "";
        later(260, drop);
      }
    };
    const paint = (now: number) => {
      animation = 0;
      if (!onScreen || preference.matches) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (curve !== target) {
        curve = curve < 0 ? target : curve + (target - curve) * 0.14;
        if (Math.abs(curve - target) < 0.001) curve = target;
        glyphs.forEach((glyph, index) => {
          const arc = arcFor(index, glyphs.length, curve);
          glyph.style.transform = curve ? `translate(${arc.x}em,${arc.y}em) rotate(${arc.deg}deg)` : "";
        });
      }
      for (let substep = 0; substep < 3; substep++) {
        stepBodies(bodies, world, dt / 3, held >= 0 ? hand : null).forEach((impact, index) => {
          poses[index].squashVelocity -= impact * 9;
        });
      }
      bodies.forEach((ball, index) => {
        const at = leaving[index];
        if (at > 0 && ball.live && (ball.y - ball.r * 1.5 > world.h || now > at + 400)) {
          ball.live = false;
          ball.y = -9999;
          ball.vx = ball.vy = 0;
          leaving[index] = -1;
          later(Math.max(0, at - now), () => dropIn(index));
        }
        if (!ball.live) return;
        if (held < 0 && Math.hypot(ball.x - hand.x, ball.y - hand.y) < ball.r * 1.05) {
          ball.vx += dx * 0.06;
          if (dy > 0) ball.vy += dy * 0.05;
          ball.va -= dx * 0.0006;
        }
        const pose = poses[index];
        if (ball.onFloor) pose.spinVelocity += (-pose.spin * 60 - pose.spinVelocity * 9) * dt;
        else pose.spinVelocity *= 1 - 0.3 * dt;
        pose.spin += pose.spinVelocity * dt;
        const stretch = ball.onFloor ? 0 : Math.min(0.14, Math.abs(ball.vy) / 6000);
        pose.squashVelocity += ((stretch - pose.squash) * 220 - pose.squashVelocity * 11) * dt;
        pose.squash += pose.squashVelocity * dt;
      });
      dx *= 0.6;
      dy *= 0.6;
      if (nextHop && now > nextHop) {
        nextHop = now + 3500 + Math.random() * 3000;
        const resting = bodies.filter((ball) => ball.live && ball.onFloor && !ball.held);
        const ball = resting[Math.floor(Math.random() * resting.length)];
        if (ball) { ball.vy = 650 + Math.random() * 300; ball.va += (Math.random() - 0.5) * 5; }
      }
      if (renderer) renderer.draw(world, bodies, poses);
      else if (dropped) {
        bodies.forEach((ball, index) => {
          const image = images[index];
          image.style.visibility = ball.live ? "visible" : "hidden";
          if (!ball.live) return;
          const pose = poses[index];
          image.style.width = `${ball.r * 2}px`;
          image.style.transform = `translate3d(${ball.x - ball.r}px,${world.h - ball.y - ball.r}px,0) rotate(${ball.a + index * 0.76}rad) scale(${1 - pose.squash * 0.55},${1 + pose.squash})`;
        });
      }
      animation = requestAnimationFrame(paint);
    };
    const schedule = () => {
      if (animation || !onScreen || preference.matches) return;
      last = performance.now();
      animation = requestAnimationFrame(paint);
    };
    const prepareRenderer = () => {
      if (!rendererRequested && !preference.matches) {
        rendererRequested = true;
        void import("three").then((three) => {
          if (disposed || preference.matches) { rendererRequested = false; return; }
          renderer = createRenderer(three, stage);
          if (!renderer) return;
          renderer.size(world);
          stage.dataset.renderer = "webgl";
        }).catch(() => { /* The same physics runs on the fallback images. */ });
      }
    };
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (!onScreen) return;
      updateView();
      schedule();
      prepareRenderer();
    });
    const resize = new ResizeObserver(() => { measure(); updateView(); });
    const onPreference = () => {
      if (preference.matches) {
        cancelAnimationFrame(animation);
        animation = 0;
        timers.forEach(clearTimeout);
        timers.clear();
        release();
        leave();
        glyphs.forEach((glyph) => { glyph.style.transform = ""; });
        curve = -1;
        images.forEach((image) => { image.removeAttribute("style"); });
        bodies.forEach((ball) => { ball.live = false; ball.held = false; });
        dropped = false;
        delete stage.dataset.running;
      } else if (onScreen) {
        updateView();
        schedule();
        prepareRenderer();
      }
    };
    preference.addEventListener("change", onPreference);
    stage.addEventListener("pointermove", track);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("pointerdown", grab);
    window.addEventListener("scroll", updateView, { passive: true });
    measure();
    resize.observe(footer);
    visibility.observe(stage);
    void document.fonts?.ready.then(() => { if (!disposed) measure(); });

    return () => {
      disposed = true;
      replay.current = () => {};
      release();
      leave();
      timers.forEach(clearTimeout);
      cancelAnimationFrame(animation);
      preference.removeEventListener("change", onPreference);
      stage.removeEventListener("pointermove", track);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("pointerdown", grab);
      window.removeEventListener("scroll", updateView);
      resize.disconnect();
      visibility.disconnect();
      renderer?.dispose();
    };
  }, []);

  return (
    <>
      <div className="apt-footer__base">
        <span>Desde 2025</span>
        <span className="apt-footer__meta">
          <span>Admissão por indicação e análise.</span>
          <button className="apt-footer__replay" type="button" onClick={() => replay.current()}>
            <span>Soltar as bolas de novo</span>
          </button>
        </span>
      </div>
      <div className="apt-footer__scene" ref={stageRef} aria-hidden="true">
        <div className="apt-footer__wordmark" ref={wordRef}>
          {Array.from(WORD, (letter, index) => <span className="apt-footer__letter" key={index}>{letter === " " ? "\u00a0" : letter}</span>)}
        </div>
        {BALL_SIZES.map((size, index) => (
          <div className="apt-footer__still" key={index} style={{ "--ball-size": size, "--ball-position": `${(index + 0.5) * 100 / BALL_SIZES.length}%`, "--ball-tilt": `${index * 52 - 26}deg` } as CSSProperties}>
            <Image src="/apt-assets/footer-tennis-ball.webp" alt="" width={256} height={256} unoptimized draggable={false} />
          </div>
        ))}
        <div className="apt-footer__haze" />
      </div>
    </>
  );
}
