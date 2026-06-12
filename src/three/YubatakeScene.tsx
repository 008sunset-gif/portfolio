import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { heroPointer } from '../lib/heroMetrics'
import type { DeviceTier } from '../hooks/useDeviceTier'

/* ============================================================
   草津 湯畑 — cyber edition
   The hot-spring field as a night/cyber scene: thick steam billows
   up off a milky-turquoise pool, wooden troughs carry flowing water
   down into it, dark mineral rocks frame it, and the site's grid
   runs underneath. Steam is the lead character (that's what reads as
   "onsen"). Water + steam are procedural GLSL; the steam sprite is a
   runtime CanvasTexture — no texture files, nothing fetched.
   ============================================================ */

// camera aims a little right of centre so the left-hand text stays clear
const TARGET = new THREE.Vector3(1.25, 0.3, 0.6)

// shared GLSL: cheap value-noise fbm, used by the water surfaces
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

/* ---- flowing water in the wooden troughs ---- */
function makeWaterMaterial(flow: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 6.0 },
      uFlow: { value: flow },
      uDeep: { value: new THREE.Color('#0b5a4b') },
      uBright: { value: new THREE.Color('#3fe3c6') },
      uHot: { value: new THREE.Color('#d6fff6') },
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
      uniform float uTime; uniform float uFlow;
      uniform vec3 uDeep; uniform vec3 uBright; uniform vec3 uHot;
      ${NOISE_GLSL}
      void main(){
        vec2 uv = vUv;
        float t = uTime;
        // turbulent water flowing down the channel (−v)
        float n1 = fbm(vec2(uv.x*3.0, uv.y*7.0 - t*uFlow));
        float n2 = fbm(vec2(uv.x*6.0 + 8.0, uv.y*12.0 - t*uFlow*1.8));
        float flow = 0.6*n1 + 0.4*n2;
        // moving foam streaks riding the current
        float streak = smoothstep(0.74, 1.0, fbm(vec2(uv.x*7.0, uv.y*3.5 - t*uFlow*1.3)));
        vec3 col = mix(uDeep, uBright, smoothstep(0.12, 0.78, flow));
        col += uHot * streak * 0.75;                    // foam glints
        float edge = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);
        col += uBright * (1.0 - edge) * 0.12;           // soft channel-edge sheen
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

/* ---- the milky turquoise pool surface ---- */
function makePoolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 6.0 },
      uDeep: { value: new THREE.Color('#073f37') },
      uMid: { value: new THREE.Color('#1fb59a') },
      uSheen: { value: new THREE.Color('#bdf3e8') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      void main(){
        vUv = uv;
        vec3 p = position;
        // gentle surface swell (plane is rotated flat, so local z is the normal)
        p.z += sin(p.x*1.5 + uTime*0.9)*0.04 + sin(p.y*2.0 - uTime*1.2)*0.035
             + sin((p.x+p.y)*3.0 + uTime*1.6)*0.02;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uSheen;
      ${NOISE_GLSL}
      void main(){
        float t = uTime;
        vec2 uv = vUv;
        // slow milky swirls
        float n = fbm(vec2(uv.x*3.5 + t*0.08, uv.y*3.5 - t*0.06));
        float n2 = fbm(vec2(uv.x*6.5 - t*0.05, uv.y*6.5 + t*0.07));
        float v = 0.6*n + 0.4*n2;
        vec3 col = mix(uDeep, uMid, smoothstep(0.2, 0.82, v));
        // water sheen — brighter, whiter at grazing angles (reads as a wet surface)
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.2);
        col += uSheen * fres * 0.45;
        // glinting highlights drifting across the surface
        float spark = smoothstep(0.9, 1.0, fbm(vec2(uv.x*10.0 + t*0.25, uv.y*10.0 - t*0.2)));
        col += uSheen * spark * 0.5;
        // fade the basin edges into the dark
        float edge = smoothstep(0.0,0.14,uv.x)*smoothstep(1.0,0.86,uv.x)
                   * smoothstep(0.0,0.14,uv.y)*smoothstep(1.0,0.86,uv.y);
        col *= mix(0.35, 1.0, edge);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

/* ---- soft mist curtains: big billboarded fog clouds for volume ---- */
function makeMistMaterial(offset: number, opacity: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 6.0 },
      uColor: { value: new THREE.Color('#cfeee6') },
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
        vec2 p = vec2(vUv.x*2.2 + uOffset, vUv.y*3.2 - uTime*0.07 + uOffset);
        float cloud = smoothstep(0.34, 0.86, 0.6*fbm(p*1.8) + 0.4*fbm(p*3.6 + 5.0));
        // fade in from the water, thin out toward the top, soften the sides
        float vfade = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
        float hfade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        gl_FragColor = vec4(uColor, cloud * vfade * hfade * uOpacity);
      }
    `,
  })
}

/* ---- wooden troughs (channels) carrying flowing water down ---- */
function Troughs({ waterMat }: { waterMat: THREE.ShaderMaterial }) {
  const N = 4
  const spacing = 0.66
  const channelW = 0.5
  const railW = 0.1
  const length = 5.0

  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#534a40', // pale, mineral-crusted wood
        roughness: 0.7,
        metalness: 0.08,
        emissive: new THREE.Color('#0c3b31'),
        emissiveIntensity: 0.5,
      }),
    []
  )
  const xs = useMemo(() => Array.from({ length: N }, (_, i) => (i - (N - 1) / 2) * spacing), [])

  return (
    <group position={[1.35, 0.08, -0.35]} rotation={[-0.66, 0.3, 0]}>
      {/* dark base board the channels sit on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[N * spacing + 0.6, length + 0.5]} />
        <meshStandardMaterial color="#0a0e13" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* wooden head wall at the top of the slope */}
      <mesh position={[0, 0.16, -length / 2 - 0.14]} material={woodMat} castShadow>
        <boxGeometry args={[N * spacing + 0.6, 0.42, 0.2]} />
      </mesh>

      {xs.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* flowing water strip */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={waterMat}>
            <planeGeometry args={[channelW, length, 1, 1]} />
          </mesh>
          {/* thick wooden walls either side */}
          <mesh position={[-(channelW / 2 + railW / 2), 0.05, 0]} material={woodMat} castShadow>
            <boxGeometry args={[railW, 0.17, length]} />
          </mesh>
          <mesh position={[channelW / 2 + railW / 2, 0.05, 0]} material={woodMat} castShadow>
            <boxGeometry args={[railW, 0.17, length]} />
          </mesh>
          {/* water spilling off the front lip into the pool */}
          <mesh position={[0, -0.34, length / 2 + 0.18]} rotation={[1.3, 0, 0]} material={waterMat}>
            <planeGeometry args={[channelW * 0.86, 0.6, 1, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Pool({ poolMat }: { poolMat: THREE.ShaderMaterial }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.3, 0.0, 1.85]} material={poolMat}>
      <planeGeometry args={[3.4, 2.1, 40, 28]} />
    </mesh>
  )
}

/* ---- steam: GPU-animated billowing puffs — the lead element ---- */
function makeSteamTexture() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  // soft fluffy disc: a smooth radial falloff with a little noise grain
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.32)')
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
      uColor: { value: new THREE.Color('#cdeae2') }, // soft white with a faint emerald cast
      uHeight: { value: 4.4 },
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
        p.y += (life - 0.35*life*life) * uHeight;
        // billowing turbulence that grows as the puff climbs
        float sway = 0.18 + life*0.7;
        p.x += sin(uTime*0.4 + aSeed*6.2831) * sway + sin(uTime*0.95 + aSeed*19.0) * 0.12 * life;
        p.z += cos(uTime*0.33 + aSeed*6.2831) * sway * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // puffs expand as they rise
        gl_PointSize = aSize * uPix * (88.0 / -mv.z) * (0.6 + life*2.6);
        gl_Position = projectionMatrix * mv;
        // fade in fast, linger, fade out near the top
        vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.5, 1.0, life));
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
      const r = Math.random()
      let x: number, z: number
      if (r < 0.55) {
        // densest plume over the pool
        x = 1.3 + (Math.random() - 0.5) * 2.4
        z = 1.85 + (Math.random() - 0.5) * 1.5
      } else if (r < 0.75) {
        // along the troughs
        x = 1.35 + (Math.random() - 0.5) * 2.4
        z = -1.8 + Math.random() * 3.2
      } else {
        // a column at the waterfall where the channels meet the pool
        x = 1.3 + (Math.random() - 0.5) * 1.9
        z = 0.7 + (Math.random() - 0.5) * 1.3
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = 0.02 + Math.random() * 0.2
      pos[i * 3 + 2] = z
      seed[i] = Math.random()
      speed[i] = 0.035 + Math.random() * 0.05 // slow, lingering
      size[i] = 1.8 + Math.random() * 2.4 // big soft puffs
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    return g
  }, [count])

  return <points geometry={geo} material={mat} />
}

/* big soft fog planes that always face the camera */
const MIST_DATA = [
  { p: [1.25, 0.95, 1.7], s: [3.8, 3.0] },
  { p: [0.7, 0.8, 1.0], s: [2.9, 2.5] },
  { p: [2.0, 1.0, 2.3], s: [3.2, 2.7] },
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

/* ---- dark mineral rocks framing the scene ---- */
function makeRockGeometry(seed: number, radius: number) {
  const g = new THREE.IcosahedronGeometry(radius, 1)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 - seed) * Math.sin(v.z * 3.3 + seed * 2.0)
    v.multiplyScalar(1 + n * 0.28)
    v.y *= 0.68
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

const ROCK_DATA = [
  { p: [-0.5, -0.05, 1.1], r: 0.9, s: 1.15 },
  { p: [-0.15, -0.12, 2.5], r: 0.72, s: 1.35 },
  { p: [3.1, -0.08, 1.6], r: 0.95, s: 1.25 },
  { p: [3.1, -0.05, 2.9], r: 0.66, s: 1.05 },
  { p: [1.3, -0.16, 3.3], r: 0.82, s: 1.45 },
  { p: [2.3, -0.05, -1.5], r: 0.62, s: 1.0 },
] as const

function Rocks() {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#161b22',
        roughness: 0.95,
        metalness: 0.04,
        emissive: new THREE.Color('#0a2620'),
        emissiveIntensity: 0.25, // faint mineral glow from the water
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
  const tmp = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    if (!reduce) t.current += dt
    const a = -0.44 + Math.sin(t.current * 0.08) * 0.13 // gentle sway, keeps the good framing
    const radius = 4.8
    tmp.current.set(
      TARGET.x + Math.sin(a) * radius + heroPointer.x * 0.5,
      1.75 + heroPointer.y * 0.3,
      TARGET.z + Math.cos(a) * radius
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
      <Bloom intensity={0.75} luminanceThreshold={0.34} luminanceSmoothing={0.9} mipmapBlur radius={0.82} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.035} />
      <Vignette eskil={false} offset={0.25} darkness={0.86} />
    </EffectComposer>
  )
}

function Scene({ tier }: { tier: DeviceTier }) {
  const { gl } = useThree()
  const waterMat = useMemo(() => makeWaterMaterial(0.5), [])
  const poolMat = useMemo(() => makePoolMaterial(), [])
  const steamTex = useMemo(() => makeSteamTexture(), [])
  // a touch more opaque on mobile (fewer particles to build up density)
  const steamMat = useMemo(
    () => makeSteamMaterial(steamTex, gl.getPixelRatio(), tier.mobile ? 0.52 : 0.42),
    [steamTex, gl, tier.mobile]
  )
  const mistMats = useMemo(
    () => [makeMistMaterial(0.0, 0.5), makeMistMaterial(2.3, 0.46), makeMistMaterial(4.7, 0.5)],
    []
  )
  const steamCount = tier.mobile ? 240 : 560

  return (
    <>
      <color attach="background" args={['#06080c']} />
      <fog attach="fog" args={['#06080c', 7, 22]} />

      <ambientLight intensity={0.32} color="#43566f" />
      <directionalLight
        position={[-4, 6, 3]}
        intensity={0.65}
        color="#cfe0ff"
        castShadow={!tier.mobile}
        shadow-mapSize={[1024, 1024]}
      />
      {/* emerald glow rising off the water onto the wood + rocks */}
      <pointLight position={[1.3, 0.6, 1.85]} intensity={6.5} distance={7} decay={2} color="#2fe6c4" />
      <pointLight position={[1.3, 0.8, -0.3]} intensity={3.5} distance={6} decay={2} color="#37f0cf" />

      <Troughs waterMat={waterMat} />
      <Pool poolMat={poolMat} />
      <Mist mats={mistMats} />
      <Steam count={steamCount} mat={steamMat} />
      <Rocks />

      <Grid
        position={[1.3, -0.17, 0.5]}
        args={[44, 44]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#13202b"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#1f4e48"
        fadeDistance={24}
        fadeStrength={1.7}
        followCamera={false}
        infiniteGrid
      />

      <Rig reduce={tier.reduce} />
      <Animator mats={[waterMat, poolMat, steamMat, ...mistMats]} reduce={tier.reduce} />
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
      camera={{ position: [TARGET.x - 2.3, 1.75, TARGET.z + 4.3], fov: 48, near: 0.1, far: 60 }}
    >
      <Suspense fallback={null}>
        <Scene tier={tier} />
      </Suspense>
    </Canvas>
  )
}
