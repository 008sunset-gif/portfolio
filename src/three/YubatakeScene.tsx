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
   Angled wooden troughs carry glowing emerald hot-spring water down
   into a rippling pool; steam drifts up; dark rocks frame it; the
   site's cyber grid runs underneath. Water + steam are procedural
   GLSL (no texture files); the steam sprite is a runtime CanvasTexture.
   ============================================================ */

// camera aims a little right of centre so the left-hand text stays clear
const TARGET = new THREE.Vector3(1.3, 0.5, 0.5)

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

const C_DEEP = '#04261f'
const C_BRIGHT = '#2fe6c4'
const C_HOT = '#b8fff2'

function makeWaterMaterial(flow: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 6.0 },
      uFlow: { value: flow },
      uDeep: { value: new THREE.Color(C_DEEP) },
      uBright: { value: new THREE.Color(C_BRIGHT) },
      uHot: { value: new THREE.Color(C_HOT) },
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
        float n1 = fbm(vec2(uv.x*3.0, uv.y*6.0 - t*uFlow));
        float n2 = fbm(vec2(uv.x*5.0 + 8.0, uv.y*10.0 - t*uFlow*1.7));
        float flow = 0.6*n1 + 0.4*n2;
        float streak = smoothstep(0.68, 1.0, fbm(vec2(uv.x*8.0, uv.y*3.0 - t*uFlow*1.25)));
        vec3 col = mix(uDeep, uBright, smoothstep(0.05, 0.7, flow));
        col += uHot * streak * 0.95;
        float edge = smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x);
        col += uBright * (1.0 - edge) * 0.35;   // bright channel rims
        col += uBright * 0.18;                   // glow floor so the channels always read
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

function makePoolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 6.0 },
      uDeep: { value: new THREE.Color(C_DEEP) },
      uBright: { value: new THREE.Color(C_BRIGHT) },
      uHot: { value: new THREE.Color(C_HOT) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      void main(){
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x*1.6 + uTime*1.1)*0.035 + sin(p.y*2.1 - uTime*1.4)*0.03;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uBright; uniform vec3 uHot;
      ${NOISE_GLSL}
      void main(){
        float t = uTime;
        vec2 uv = vUv;
        float n = fbm(vec2(uv.x*4.0 + t*0.15, uv.y*4.0 - t*0.12));
        float n2 = fbm(vec2(uv.x*7.0 - t*0.1, uv.y*7.0 + t*0.13));
        float v = 0.6*n + 0.4*n2;
        vec3 col = mix(uDeep, uBright, smoothstep(0.25, 0.85, v));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.5);
        col += uHot * fres * 0.4;
        float edge = smoothstep(0.0,0.12,uv.x)*smoothstep(1.0,0.88,uv.x)
                   * smoothstep(0.0,0.12,uv.y)*smoothstep(1.0,0.88,uv.y);
        col *= mix(0.4, 0.92, edge);   // basin: darker rim, calmer than the troughs
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

/* ---- the troughs (angled channels) ---- */
function Troughs({ waterMat }: { waterMat: THREE.ShaderMaterial }) {
  const N = 5
  const spacing = 0.62
  const channelW = 0.46
  const railW = 0.07
  const length = 5.2

  const railMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#222b35',
        roughness: 0.55,
        metalness: 0.15,
        emissive: new THREE.Color('#0a3a30'),
        emissiveIntensity: 0.4,
      }),
    []
  )
  const xs = useMemo(() => Array.from({ length: N }, (_, i) => (i - (N - 1) / 2) * spacing), [])

  return (
    <group position={[1.3, 0.05, -0.25]} rotation={[-0.7, 0.32, 0]}>
      {/* base board under the channels */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[N * spacing + 0.5, length + 0.5]} />
        <meshStandardMaterial color="#0a0e13" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* wooden head wall at the top of the slope */}
      <mesh position={[0, 0.12, -length / 2 - 0.12]} material={railMat} castShadow>
        <boxGeometry args={[N * spacing + 0.5, 0.34, 0.16]} />
      </mesh>

      {xs.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* glowing water strip */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={waterMat}>
            <planeGeometry args={[channelW, length, 1, 1]} />
          </mesh>
          {/* wooden rails either side */}
          <mesh position={[-(channelW / 2 + railW / 2), 0.04, 0]} material={railMat} castShadow>
            <boxGeometry args={[railW, 0.12, length]} />
          </mesh>
          <mesh position={[channelW / 2 + railW / 2, 0.04, 0]} material={railMat} castShadow>
            <boxGeometry args={[railW, 0.12, length]} />
          </mesh>
          {/* short waterfall thread pouring off this channel's front lip */}
          <mesh position={[0, -0.32, length / 2 + 0.16]} rotation={[1.28, 0, 0]} material={waterMat}>
            <planeGeometry args={[channelW * 0.82, 0.55, 1, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Pool({ poolMat }: { poolMat: THREE.ShaderMaterial }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.35, 0.0, 1.75]} material={poolMat}>
      <planeGeometry args={[2.9, 1.7, 32, 24]} />
    </mesh>
  )
}

/* ---- steam: GPU-animated soft points rising from the water ---- */
function makeSteamTexture() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

function makeSteamMaterial(tex: THREE.Texture, pix: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 6.0 },
      uTex: { value: tex },
      uColor: { value: new THREE.Color('#86ffe9') },
      uHeight: { value: 3.6 },
      uPix: { value: pix },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aSpeed; attribute float aSize;
      uniform float uTime; uniform float uHeight; uniform float uPix;
      varying float vAlpha;
      void main(){
        vec3 p = position;
        float life = fract(uTime * aSpeed + aSeed);
        p.y += life * uHeight;
        p.x += sin(uTime*0.5 + aSeed*6.2831) * (0.12 + life*0.45);
        p.z += cos(uTime*0.42 + aSeed*6.2831) * (0.1 + life*0.3);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uPix * (60.0 / -mv.z) * (0.5 + life*1.6);
        gl_Position = projectionMatrix * mv;
        vAlpha = smoothstep(0.0, 0.16, life) * (1.0 - smoothstep(0.45, 1.0, life));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform vec3 uColor;
      varying float vAlpha;
      void main(){
        float a = texture2D(uTex, gl_PointCoord).a;
        gl_FragColor = vec4(uColor, a * vAlpha * 0.42);
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
      const overPool = Math.random() < 0.4
      let x: number, z: number
      if (overPool) {
        x = 1.35 + (Math.random() - 0.5) * 2.8
        z = 1.75 + (Math.random() - 0.5) * 1.6
      } else {
        const u = Math.random()
        x = 1.3 + (Math.random() - 0.5) * 2.6
        z = -1.8 + u * 3.4
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = 0.05 + Math.random() * 0.25
      pos[i * 3 + 2] = z
      seed[i] = Math.random()
      speed[i] = 0.05 + Math.random() * 0.07
      size[i] = 0.8 + Math.random() * 1.5
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    return g
  }, [count])

  return <points geometry={geo} material={mat} />
}

/* ---- dark rocks framing the scene ---- */
function makeRockGeometry(seed: number, radius: number) {
  const g = new THREE.IcosahedronGeometry(radius, 1)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 - seed) * Math.sin(v.z * 3.3 + seed * 2.0)
    v.multiplyScalar(1 + n * 0.28)
    v.y *= 0.7
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

const ROCK_DATA = [
  { p: [-0.55, -0.05, 1.0], r: 0.85, s: 1.1 },
  { p: [-0.2, -0.1, 2.4], r: 0.7, s: 1.3 },
  { p: [3.0, -0.08, 1.5], r: 0.9, s: 1.2 },
  { p: [3.05, -0.05, 2.7], r: 0.65, s: 1.0 },
  { p: [1.2, -0.15, 3.2], r: 0.8, s: 1.4 },
  { p: [2.2, -0.05, -1.4], r: 0.6, s: 1.0 },
] as const

function Rocks() {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0f15',
        roughness: 0.95,
        metalness: 0.05,
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
    const a = -0.46 + Math.sin(t.current * 0.08) * 0.14 // gentle sway, keeps the good framing
    const radius = 5.0
    tmp.current.set(
      TARGET.x + Math.sin(a) * radius + heroPointer.x * 0.5,
      2.0 + heroPointer.y * 0.32,
      TARGET.z + Math.cos(a) * radius
    )
    camera.position.lerp(tmp.current, reduce ? 1 : 0.04)
    camera.lookAt(TARGET)
  })
  return null
}

function Animator({
  mats,
  reduce,
}: {
  mats: THREE.ShaderMaterial[]
  reduce: boolean
}) {
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
      <Bloom intensity={0.95} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.035} />
      <Vignette eskil={false} offset={0.26} darkness={0.85} />
    </EffectComposer>
  )
}

function Scene({ tier }: { tier: DeviceTier }) {
  const { gl } = useThree()
  const waterMat = useMemo(() => makeWaterMaterial(0.5), [])
  const poolMat = useMemo(() => makePoolMaterial(), [])
  const steamTex = useMemo(() => makeSteamTexture(), [])
  const steamMat = useMemo(() => makeSteamMaterial(steamTex, gl.getPixelRatio()), [steamTex, gl])
  const steamCount = tier.mobile ? 110 : 240

  return (
    <>
      <color attach="background" args={['#06080c']} />
      <fog attach="fog" args={['#06080c', 7, 20]} />

      <ambientLight intensity={0.3} color="#41546f" />
      <directionalLight
        position={[-4, 6, 3]}
        intensity={0.7}
        color="#cfe0ff"
        castShadow={!tier.mobile}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[1.2, 0.7, 1.9]} intensity={6} distance={7} decay={2} color="#2fe6c4" />
      <pointLight position={[1.2, 0.9, -0.4]} intensity={3.5} distance={6} decay={2} color="#37f0cf" />

      <Troughs waterMat={waterMat} />
      <Pool poolMat={poolMat} />
      <Steam count={steamCount} mat={steamMat} />
      <Rocks />

      <Grid
        position={[1.2, -0.16, 0.4]}
        args={[44, 44]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#13202b"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#1f4e48"
        fadeDistance={24}
        fadeStrength={1.6}
        followCamera={false}
        infiniteGrid
      />

      <Rig reduce={tier.reduce} />
      <Animator mats={[waterMat, poolMat, steamMat]} reduce={tier.reduce} />
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
      camera={{ position: [TARGET.x - 2.4, 2.0, TARGET.z + 4.5], fov: 46, near: 0.1, far: 60 }}
    >
      <Suspense fallback={null}>
        <Scene tier={tier} />
      </Suspense>
    </Canvas>
  )
}
