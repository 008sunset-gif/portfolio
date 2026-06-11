import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { WalkerPose } from '../lib/walkerSim'

export type RobotHandle = {
  setPose: (pose: WalkerPose) => void
}

// Box/capsule "bone" robot, ~1.6 units tall. The scene drives every joint each
// frame via setPose(); nothing here re-renders through React.
const BODY_COLOR = new THREE.Color('#c3c9d4')
const TEAL = new THREE.Color('#5eead4')

type Props = { quality?: boolean }

const Robot = forwardRef<RobotHandle, Props>(function Robot({ quality = true }, ref) {
  const root = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const thighL = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const thighR = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)

  // one material per robot, reused across parts; emissive flips for the leader
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BODY_COLOR,
        metalness: 0.55,
        roughness: 0.45,
        emissive: new THREE.Color('#000000'),
        emissiveIntensity: 1,
      }),
    []
  )

  useImperativeHandle(ref, () => ({
    setPose(p: WalkerPose) {
      const g = root.current
      if (!g) return
      g.position.set(p.x, 0.92 + p.bob, p.z)
      g.visible = true

      if (torso.current) torso.current.rotation.z = -p.lean

      // legs: hip swings around Z (walking plane), knee bends
      if (thighL.current) thighL.current.rotation.z = p.legs[0].hip
      if (shinL.current) shinL.current.rotation.z = p.legs[0].knee
      if (thighR.current) thighR.current.rotation.z = p.legs[1].hip
      if (shinR.current) shinR.current.rotation.z = p.legs[1].knee
      if (armL.current) armL.current.rotation.z = p.arms[0]
      if (armR.current) armR.current.rotation.z = p.arms[1]

      // leader gets a teal rim glow; fallen bodies dim out
      const target = p.isBest ? TEAL : BODY_COLOR
      mat.emissive.copy(p.isBest ? TEAL : BODY_COLOR)
      mat.emissiveIntensity = p.isBest ? 0.85 : 0.04
      mat.color.copy(target).multiplyScalar(p.fallen ? 0.4 : 1)
      mat.opacity = p.fallen ? 0.7 : 1
      mat.transparent = p.fallen
    },
  }))

  const M = quality ? mat : mat

  return (
    <group ref={root} visible={false}>
      {/* pelvis */}
      <mesh material={M} castShadow>
        <boxGeometry args={[0.34, 0.18, 0.26]} />
      </mesh>

      {/* torso pivot at hip */}
      <group ref={torso}>
        <mesh material={M} position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.36, 0.6, 0.24]} />
        </mesh>
        {/* head */}
        <mesh material={M} position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
        </mesh>
        {/* shoulders / arms */}
        <group ref={armL} position={[0, 0.66, 0.2]}>
          <mesh material={M} position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
          </mesh>
        </group>
        <group ref={armR} position={[0, 0.66, -0.2]}>
          <mesh material={M} position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
          </mesh>
        </group>
      </group>

      {/* left leg */}
      <group ref={thighL} position={[0, -0.05, 0.1]}>
        <mesh material={M} position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.13, 0.44, 0.13]} />
        </mesh>
        <group ref={shinL} position={[0, -0.44, 0]}>
          <mesh material={M} position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.12, 0.44, 0.12]} />
          </mesh>
          <mesh material={M} position={[0.06, -0.46, 0]} castShadow>
            <boxGeometry args={[0.22, 0.08, 0.14]} />
          </mesh>
        </group>
      </group>

      {/* right leg */}
      <group ref={thighR} position={[0, -0.05, -0.1]}>
        <mesh material={M} position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.13, 0.44, 0.13]} />
        </mesh>
        <group ref={shinR} position={[0, -0.44, 0]}>
          <mesh material={M} position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.12, 0.44, 0.12]} />
          </mesh>
          <mesh material={M} position={[0.06, -0.46, 0]} castShadow>
            <boxGeometry args={[0.22, 0.08, 0.14]} />
          </mesh>
        </group>
      </group>
    </group>
  )
})

export default Robot
