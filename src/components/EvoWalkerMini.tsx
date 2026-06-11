import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import WalkerField from '../three/WalkerField'
import EvoWalkerCanvas from './EvoWalkerCanvas'
import useDeviceTier from '../hooks/useDeviceTier'

const TARGET = new THREE.Vector3(0.8, 0.7, 0)

/**
 * Small viewport onto the *same* WalkerSim engine as the hero — the Works entry
 * for EvoWalker AI doubles as a live demo. Static camera (no orbit) to stay calm
 * in a card; falls back to the Canvas 2D sim when WebGL is unavailable.
 */
export default function EvoWalkerMini() {
  const tier = useDeviceTier()

  if (tier.mode === '2d') {
    return (
      <div className="mini mini--2d">
        <EvoWalkerCanvas />
      </div>
    )
  }

  return (
    <div className="mini">
      <Canvas
        frameloop={tier.reduce ? 'demand' : 'always'}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        camera={{ position: [TARGET.x + 3.4, 2.6, TARGET.z + 4.4], fov: 40, near: 0.1, far: 40 }}
        onCreated={({ camera }) => camera.lookAt(TARGET)}
      >
        <color attach="background" args={['#0b0e14']} />
        <fog attach="fog" args={['#0b0e14', 7, 16]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 6, 3]} intensity={1} />
        <Suspense fallback={null}>
          <WalkerField population={4} reduce={tier.reduce} reportMetrics={false} laneSpan={2.4} />
          <Grid
            position={[0.5, 0, 0]}
            args={[24, 24]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1c2230"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#2b5f57"
            fadeDistance={15}
            fadeStrength={1.6}
            infiniteGrid
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
