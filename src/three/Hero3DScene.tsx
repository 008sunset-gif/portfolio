import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import WalkerField from './WalkerField'
import { heroPointer } from '../lib/heroMetrics'
import type { DeviceTier } from '../hooks/useDeviceTier'

// camera looks here (≈ screen centre); robots live well to the +X (right) of it,
// so the pack reads on the right third and never sits under the left-hand text.
const TARGET = new THREE.Vector3(1.8, 0.9, 0)

// Slow 3/4 orbit around the action + subtle mouse parallax. Under reduced motion
// the Canvas uses frameloop="demand", so this runs once and simply frames the
// static scene.
function Rig({ reduce }: { reduce: boolean }) {
  const { camera } = useThree()
  const t = useRef(0)
  const tmp = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    if (!reduce) t.current += dt * 0.04
    const a = t.current
    const radius = 6.8
    tmp.current.set(
      TARGET.x + Math.sin(a) * radius + heroPointer.x * 0.6,
      3.3 + heroPointer.y * 0.4,
      TARGET.z + Math.cos(a) * radius
    )
    camera.position.lerp(tmp.current, reduce ? 1 : 0.05)
    camera.lookAt(TARGET)
  })
  return null
}

function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={0.6}
        luminanceThreshold={0.5}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.7}
      />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.04} />
      <Vignette eskil={false} offset={0.28} darkness={0.82} />
    </EffectComposer>
  )
}

export default function Hero3DScene({ tier }: { tier: DeviceTier }) {
  return (
    <Canvas
      className="hero3d__canvas"
      frameloop={tier.reduce ? 'demand' : 'always'}
      dpr={tier.dpr}
      shadows={!tier.mobile}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [TARGET.x, 3.3, TARGET.z + 6.8], fov: 42, near: 0.1, far: 60 }}
    >
      <color attach="background" args={['#0a0c11']} />
      <fog attach="fog" args={['#0a0c11', 10, 22]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.35}
        castShadow={!tier.mobile}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 4, -3]} intensity={0.35} color="#9fb4ff" />

      <Suspense fallback={null}>
        <WalkerField population={tier.population} reduce={tier.reduce} spawnX={3.4} laneSpan={3.0} />

        {/* faint measurement grid */}
        <Grid
          position={[1.5, 0, 0]}
          args={[40, 40]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1c2230"
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor="#2b5f57"
          fadeDistance={26}
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid
        />

        <Rig reduce={tier.reduce} />
        {tier.fx && <Effects />}
      </Suspense>
    </Canvas>
  )
}
