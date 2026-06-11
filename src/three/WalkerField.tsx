import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Robot, { type RobotHandle } from './Robot'
import { WalkerSim } from '../lib/walkerSim'
import { heroMetrics } from '../lib/heroMetrics'

type Props = {
  population?: number
  reduce?: boolean
  reportMetrics?: boolean
  laneSpan?: number
  genDuration?: number
  spawnX?: number
}

/**
 * Owns one WalkerSim instance, renders its robots, and drives every joint each
 * frame from the sim's poses. A teal rim-light tracks the current leader. When
 * reduced motion is requested it pre-evolves a learned gait and renders a single
 * static frame (the Canvas uses frameloop="demand").
 */
export default function WalkerField({
  population = 8,
  reduce = false,
  reportMetrics = true,
  laneSpan = 4,
  genDuration = 6,
  spawnX = 0,
}: Props) {
  const { invalidate } = useThree()

  const sim = useMemo(
    () => new WalkerSim({ population, genDurationSec: genDuration, laneSpan, spawnX }),
    [population, genDuration, laneSpan, spawnX]
  )
  const robots = useRef<(RobotHandle | null)[]>([])
  const rim = useRef<THREE.PointLight>(null)
  const bestPos = useRef(new THREE.Vector3(0, 1, 0))

  const apply = () => {
    const poses = sim.getPoses()
    for (let i = 0; i < poses.length; i++) {
      robots.current[i]?.setPose(poses[i])
      if (poses[i].isBest) bestPos.current.set(poses[i].x, 1.4, poses[i].z)
    }
    if (rim.current) {
      rim.current.position.lerp(bestPos.current, 0.2)
    }
    if (reportMetrics) {
      heroMetrics.generation = sim.generation
      heroMetrics.alive = sim.aliveCount
      heroMetrics.distance = sim.bestDistance
    }
  }

  // reduced motion: evolve a few generations, render one static frame, stop.
  useEffect(() => {
    if (!reduce) return
    sim.warm(60 * 20)
    apply()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, sim])

  useFrame((_, dt) => {
    if (reduce) return
    sim.update(dt)
    apply()
  })

  return (
    <group>
      <pointLight ref={rim} color="#5eead4" intensity={6} distance={6} decay={1.6} />
      {Array.from({ length: population }, (_, i) => (
        <Robot
          key={i}
          ref={(h) => {
            robots.current[i] = h
          }}
        />
      ))}
    </group>
  )
}
