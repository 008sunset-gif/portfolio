import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { heroPointer } from '../lib/heroMetrics'
import type { DeviceTier } from '../hooks/useDeviceTier'

/* ============================================================
   草津 湯畑 — cyber edition
   A steaming hot-spring pool seen at a low angle: a broad
   emerald / milky-turquoise water surface ripples and reflects,
   with thick white steam billowing off it — that's what reads as
   "onsen". Dark mineral rocks ring the near edge and a faint
   emerald grid sits on the water for the cyber note. Everything is
   procedural GLSL; the steam sprite is a runtime CanvasTexture, so
   no texture files are fetched.
   ============================================================ */

// look low and across the water; a little right of centre so the text stays clear
const TARGET = new THREE.Vector3(1.5, 0.4, 1.6)

// shared GLSL: cheap value-noise + fbm for the water
const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i=0;i<4;i++){ v += a*vnoise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
`

/* ---- the steaming pool surface ---- */
function makePoolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 6.0 },
      uDeep: { value: new THREE.Color('#075a4c') }, // deep emerald
      uMid: { value: new THREE.Color('#34d0b0') }, // milky turquoise
      uSheen: { value: new THREE.Color('#d6f3ea') }, // steam-lit reflection
      uBg: { value: new THREE.Color('#06080c') }, // fades into the dark at distance
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      void main(){
        vUv = uv;
        vec3 p = position;
        // broad rolling swell (plane is rotated flat, so local z is the surface normal)
        p.z += sin(p.x*0.7 + uTime*0.55)*0.06
             + sin(p.y*0.9 - uTime*0.7)*0.05
             + sin((p.x+p.y)*1.7 + uTime*1.1)*0.025;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uSheen; uniform vec3 uBg;
      ${NOISE_GLSL}
      void main(){
        float t = uTime;
        // ripple normal from a cheap noise height field (world space)
        vec2 q = vWorld.xz*0.9 + vec2(t*0.05, -t*0.04);
        float e = 0.14;
        float h0 = vnoise(q), hx = vnoise(q + vec2(e,0.0)), hz = vnoise(q + vec2(0.0,e));
        vec3 N = normalize(vec3((h0-hx)/e*0.7, 1.0, (h0-hz)/e*0.7));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

        // base water colour from slow milky swirls
        float body = fbm(vWorld.xz*0.35 + vec2(t*0.04, -t*0.03));
        vec3 col = mix(uDeep, uMid, smoothstep(0.08, 0.72, body));
        col += uMid * 0.07; // keep the water reading as glowing turquoise everywhere

        // faint emerald grid resting on the water (the cyber note)
        vec2 gc = abs(fract(vWorld.xz*0.7) - 0.5);
        float gline = smoothstep(0.45, 0.5, max(gc.x, gc.y));
        col += uMid * gline * 0.12;

        // reflective steam sheen at grazing angles — the wet, receding-water look
        col = mix(col, uSheen, fres*0.7);

        // sharp drifting glints on the ripples
        float glint = pow(fres, 1.5) * smoothstep(0.62, 1.0, vnoise(vWorld.xz*3.2 + vec2(-t*0.2, t*0.16)));
        col += uSheen * glint * 0.5;

        // dissolve the far water into the dark / steam (stands in for fog on a raw shader)
        float dist = length(cameraPosition - vWorld);
        col = mix(col, uBg, smoothstep(7.0, 19.0, dist));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

function Pool({ poolMat }: { poolMat: THREE.ShaderMaterial }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0, 2.0]} material={poolMat}>
      <planeGeometry args={[18, 15, 90, 72]} />
    </mesh>
  )
}

/* ---- soft mist curtains: big billboarded fog clouds (the far steam wall) ---- */
function makeMistMaterial(offset: number, opacity: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 6.0 },
      uColor: { value: new THREE.Color('#d3efe7') },
      uOffset: { value: offset },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime; uniform vec3 uColor; uniform float uOffset; uniform float uOpacity;
      ${NOISE_GLSL}
      void main(){
        // wispy cloud field drifting slowly upward
        vec2 p = vec2(vUv.x*2.2 + uOffset, vUv.y*3.0 - uTime*0.06 + uOffset);
        float cloud = smoothstep(0.32, 0.85, 0.6*fbm(p*1.7) + 0.4*fbm(p*3.4 + 5.0));
        // fade in from the water, thin out toward the top, soften the sides
        float vfade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
        float hfade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        gl_FragColor = vec4(uColor, cloud * vfade * hfade * uOpacity);
      }
    `,
  })
}

// big soft fog planes rising off the water, always facing the camera
const MIST_DATA = [
  { p: [0.5, 1.7, 2.6], s: [5.4, 5.8] },
  { p: [1.9, 1.9, 3.4], s: [6.2, 6.4] },
  { p: [3.0, 1.7, 2.3], s: [5.2, 5.4] },
  { p: [1.2, 1.5, 1.5], s: [5.0, 5.0] },
] as const

function Mist({ mats }: { mats: THREE.ShaderMaterial[] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((state) => {
    for (const m of refs.current) if (m) m.quaternion.copy(state.camera.quaternion)
  })
  return (
    <group>
      {MIST_DATA.map((d, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={d.p as unknown as [number, number, number]}
          material={mats[i]}
        >
          <planeGeometry args={[d.s[0], d.s[1]]} />
        </mesh>
      ))}
    </group>
  )
}

/* ---- steam: GPU-animated billowing puffs — the lead element ---- */
function makeSteamTexture() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

function makeSteamMaterial(tex: THREE.Texture, pix: number, opacity: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 6.0 },
      uTex: { value: tex },
      uColor: { value: new THREE.Color('#d8efe8') },
      uHeight: { value: 6.0 },
      uPix: { value: pix },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aSpeed; attribute float aSize;
      uniform float uTime; uniform float uHeight; uniform float uPix;
      varying float vAlpha;
      void main(){
        vec3 p = position;
        float life = fract(uTime * aSpeed + aSeed);
        // rise, decelerating as it cools
        p.y += (life - 0.32*life*life) * uHeight;
        // billowing turbulence that grows as the puff climbs
        float sway = 0.2 + life*0.75;
        p.x += sin(uTime*0.4 + aSeed*6.2831) * sway + sin(uTime*0.95 + aSeed*19.0) * 0.12 * life;
        p.z += cos(uTime*0.33 + aSeed*6.2831) * sway * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // puffs expand as they rise
        gl_PointSize = aSize * uPix * (92.0 / -mv.z) * (0.6 + life*2.6);
        gl_Position = projectionMatrix * mv;
        // stay visible longer so the puffs read as tall rising plumes
        vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.62, 1.0, life));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity;
      varying float vAlpha;
      void main(){
        float a = texture2D(uTex, gl_PointCoord).a;
        gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
      }
    `,
  })
}

function Steam({ count, mat }: { count: number; mat: THREE.ShaderMaterial }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const speed = new Float32Array(count)
    const size = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // spread across the water, densest over the mid/far band where it
      // silhouettes against the dark and reads as a thick rising plume
      const far = Math.random() < 0.7
      const x = 1.5 + (Math.random() - 0.5) * (far ? 4.4 : 3.6)
      const z = far ? 1.0 + Math.random() * 3.0 : -1.0 + Math.random() * 1.8
      pos[i * 3] = x
      pos[i * 3 + 1] = 0.02 + Math.random() * 0.2
      pos[i * 3 + 2] = z
      seed[i] = Math.random()
      speed[i] = 0.035 + Math.random() * 0.05 // slow, lingering
      size[i] = 1.8 + Math.random() * 2.6 // big soft puffs
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    return g
  }, [count])

  return <points geometry={geo} material={mat} />
}

/* ---- dark mineral rocks ringing the near edge of the pool ---- */
function makeRockGeometry(seed: number, radius: number) {
  const g = new THREE.IcosahedronGeometry(radius, 1)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 - seed) * Math.sin(v.z * 3.3 + seed * 2.0)
    v.multiplyScalar(1 + n * 0.28)
    v.y *= 0.62
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

const ROCK_DATA = [
  { p: [-0.9, -0.14, 0.0], r: 0.95, s: 1.1 },
  { p: [-0.4, -0.18, 1.7], r: 0.8, s: 1.2 },
  { p: [4.0, -0.16, 0.8], r: 0.95, s: 1.1 },
  { p: [3.7, -0.18, 2.4], r: 0.78, s: 1.15 },
  { p: [1.6, -0.22, -1.2], r: 0.7, s: 1.3 },
] as const

function Rocks() {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#151a21',
        roughness: 0.95,
        metalness: 0.04,
        emissive: new THREE.Color('#0a2620'),
        emissiveIntensity: 0.3, // faint mineral glow from the water
        flatShading: true,
      }),
    []
  )
  const rocks = useMemo(
    () => ROCK_DATA.map((r, i) => ({ ...r, geo: makeRockGeometry(i * 1.7 + 0.5, r.r) })),
    []
  )
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh
          key={i}
          geometry={r.geo}
          material={mat}
          position={r.p as unknown as [number, number, number]}
          scale={[r.s, r.s, r.s]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}

function Rig({ reduce }: { reduce: boolean }) {
  const { camera } = useThree()
  const t = useRef(0)
  // base camera offset from the target: low, in front, looking across the water
  const base = useMemo(() => new THREE.Vector3(-0.3, 0.85, -3.7), [])
  const tmp = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    if (!reduce) t.current += dt
    const s = Math.sin(t.current * 0.08) * 0.13 // gentle yaw sway
    const cosS = Math.cos(s)
    const sinS = Math.sin(s)
    const ox = base.x * cosS - base.z * sinS
    const oz = base.x * sinS + base.z * cosS
    tmp.current.set(
      TARGET.x + ox + heroPointer.x * 0.45,
      TARGET.y + base.y + heroPointer.y * 0.28,
      TARGET.z + oz
    )
    camera.position.lerp(tmp.current, reduce ? 1 : 0.04)
    camera.lookAt(TARGET)
  })
  return null
}

function Animator({ mats, reduce }: { mats: THREE.ShaderMaterial[]; reduce: boolean }) {
  useFrame((state) => {
    if (reduce) return
    const t = state.clock.elapsedTime + 6.0
    for (const m of mats) m.uniforms.uTime.value = t
  })
  return null
}

function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={0.7} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur radius={0.82} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.035} />
      <Vignette eskil={false} offset={0.24} darkness={0.88} />
    </EffectComposer>
  )
}

function Scene({ tier }: { tier: DeviceTier }) {
  const { gl } = useThree()
  const poolMat = useMemo(() => makePoolMaterial(), [])
  const steamTex = useMemo(() => makeSteamTexture(), [])
  const steamMat = useMemo(
    () => makeSteamMaterial(steamTex, gl.getPixelRatio(), tier.mobile ? 0.52 : 0.46),
    [steamTex, gl, tier.mobile]
  )
  const mistMats = useMemo(
    () => [
      makeMistMaterial(0.0, 0.62),
      makeMistMaterial(2.3, 0.58),
      makeMistMaterial(4.7, 0.62),
      makeMistMaterial(7.1, 0.58),
    ],
    []
  )
  const steamCount = tier.mobile ? 300 : 700

  return (
    <>
      <color attach="background" args={['#06080c']} />
      <fog attach="fog" args={['#06080c', 6, 20]} />

      <ambientLight intensity={0.34} color="#43566f" />
      <directionalLight
        position={[-4, 6, -2]}
        intensity={0.55}
        color="#cfe0ff"
        castShadow={!tier.mobile}
        shadow-mapSize={[1024, 1024]}
      />
      {/* emerald glow rising off the water onto the rocks */}
      <pointLight position={[1.5, 0.5, 1.6]} intensity={7} distance={8} decay={2} color="#2fe6c4" />
      <pointLight position={[1.5, 0.4, 3.2]} intensity={4} distance={7} decay={2} color="#37f0cf" />

      <Pool poolMat={poolMat} />
      <Rocks />
      <Mist mats={mistMats} />
      <Steam count={steamCount} mat={steamMat} />

      <Rig reduce={tier.reduce} />
      <Animator mats={[poolMat, steamMat, ...mistMats]} reduce={tier.reduce} />
      {tier.fx && <Effects />}
    </>
  )
}

export default function YubatakeScene({ tier }: { tier: DeviceTier }) {
  return (
    <Canvas
      className="hero3d__canvas"
      frameloop={tier.reduce ? 'demand' : 'always'}
      dpr={tier.dpr}
      shadows={!tier.mobile}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [TARGET.x - 0.3, TARGET.y + 0.85, TARGET.z - 3.7], fov: 50, near: 0.1, far: 60 }}
    >
      <Suspense fallback={null}>
        <Scene tier={tier} />
      </Suspense>
    </Canvas>
  )
}
