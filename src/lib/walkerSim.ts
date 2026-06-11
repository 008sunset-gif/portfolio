/**
 * walkerSim — the shared "EvoWalker" engine.
 *
 * A small population of bipedal robots tries to walk forward (+X). Each robot is
 * described by 12 genes (0..1). A sine-wave gait drives the joint angles; forward
 * speed and the chance of toppling both depend on how close the genes are to a
 * stable gait, so the genetic algorithm (elite selection + mutation) visibly
 * converges — early generations stumble and fall, later ones stride smoothly.
 *
 * The engine is render-agnostic: it produces abstract `WalkerPose` data (root
 * position, torso lean, per-joint angles) that the 3D scene, the 2D fallback and
 * the Works mini-view all consume. Same engine, three windows onto it.
 */

const GENES = 12
// genes: 0 freq, 1 hipAmp, 2 kneeAmp, 3 kneePhase, 4 stride, 5 lean,
//        6 balance, 7 armAmp, 8 stepHeight, 9 hipBias, 10 symmetry, 11 damping
const IDEAL = [0.6, 0.62, 0.58, 0.5, 0.7, 0.5, 0.6, 0.5, 0.55, 0.5, 0.82, 0.6]

export type LegPose = { hip: number; knee: number }
export type WalkerPose = {
  id: number
  x: number
  z: number
  bob: number
  lean: number
  fallen: boolean
  fallProg: number
  legs: [LegPose, LegPose]
  arms: [number, number]
  isBest: boolean
}

type Individual = {
  genes: number[]
  geneDist: number
  x: number
  z: number
  startX: number
  phase: number
  fallen: boolean
  fallProg: number
  wobble: number
  fitness: number
}

const rand = () => Math.random()
const randn = () => {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

function geneDistance(genes: number[]): number {
  let s = 0
  for (let i = 0; i < GENES; i++) {
    const d = genes[i] - IDEAL[i]
    s += d * d
  }
  return s / GENES
}

export type WalkerOptions = {
  population?: number
  genDurationSec?: number
  laneSpan?: number // total z spread
  spawnX?: number // where the pack starts on the track
}

export class WalkerSim {
  pop: Individual[] = []
  generation = 1
  bestDistance = 0
  aliveCount = 0
  bestIndex = 0

  private genTime = 0
  private genDuration: number
  private mutStrength = 0.13
  private populationSize: number
  private laneSpan: number
  private spawnX: number

  constructor(opts: WalkerOptions = {}) {
    this.populationSize = opts.population ?? 8
    this.genDuration = opts.genDurationSec ?? 6
    this.laneSpan = opts.laneSpan ?? 4
    this.spawnX = opts.spawnX ?? 0
    this.seed()
  }

  private laneZ(idx: number): number {
    if (this.populationSize <= 1) return 0
    const t = idx / (this.populationSize - 1) // 0..1
    return (t - 0.5) * this.laneSpan
  }

  private makeIndividual(genes: number[], idx: number): Individual {
    return {
      genes,
      geneDist: geneDistance(genes),
      x: this.spawnX - 0.3 + (idx % 3) * 0.15,
      z: this.laneZ(idx),
      startX: this.spawnX,
      phase: rand() * Math.PI * 2,
      fallen: false,
      fallProg: 0,
      wobble: 0,
      fitness: 0,
    }
  }

  private seed() {
    this.pop = []
    for (let i = 0; i < this.populationSize; i++) {
      const genes = Array.from({ length: GENES }, () => clamp01(0.5 + randn() * 0.28))
      this.pop.push(this.makeIndividual(genes, i))
    }
  }

  update(dt: number) {
    const d = Math.min(dt, 0.05)
    this.genTime += d

    let alive = 0
    let best = -Infinity
    let bestIdx = 0

    for (let i = 0; i < this.pop.length; i++) {
      const ind = this.pop[i]
      if (ind.fallen) {
        ind.fallProg = Math.min(1, ind.fallProg + d * 2.0)
      } else {
        const g = ind.genes
        const freq = 1.0 + g[0] * 2.0
        ind.phase += freq * d

        const quality = 1 - ind.geneDist * 2.4
        const stride = 0.5 + g[4] * 1.1
        const speed = Math.max(0.12, stride * (0.4 + 0.6 * quality))
        ind.x += speed * d
        ind.fitness = ind.x - ind.startX
        ind.wobble = Math.sin(ind.phase * 2) * (0.03 + ind.geneDist * 0.7)

        const fallRate = 0.05 + ind.geneDist * 5.5
        if (rand() < fallRate * d) ind.fallen = true
        alive++
      }

      const fit = ind.x - ind.startX
      if (fit > best) {
        best = fit
        bestIdx = i
      }
    }

    this.aliveCount = alive
    this.bestDistance = Math.max(0, best)
    this.bestIndex = bestIdx

    if (this.genTime >= this.genDuration) this.nextGeneration()
  }

  private nextGeneration() {
    for (const ind of this.pop) ind.fitness = ind.x - ind.startX
    const sorted = [...this.pop].sort((a, b) => b.fitness - a.fitness)
    const eliteCount = Math.max(2, Math.floor(this.populationSize * 0.25))
    const elites = sorted.slice(0, eliteCount)

    const next: Individual[] = []
    elites.forEach((e, i) => next.push(this.makeIndividual([...e.genes], i)))
    let idx = elites.length
    while (next.length < this.populationSize) {
      const parent = elites[Math.floor(rand() * elites.length)]
      const child = parent.genes.map((v) => clamp01(v + randn() * this.mutStrength))
      next.push(this.makeIndividual(child, idx++))
    }

    this.pop = next
    this.generation += 1
    this.genTime = 0
    this.mutStrength = Math.max(0.04, this.mutStrength * 0.93)
  }

  /** Run forward without rendering — used to pre-evolve a static still frame. */
  warm(steps: number, dt = 1 / 60) {
    for (let i = 0; i < steps; i++) this.update(dt)
  }

  getPoses(): WalkerPose[] {
    const out: WalkerPose[] = []
    for (let i = 0; i < this.pop.length; i++) {
      const ind = this.pop[i]
      const g = ind.genes
      const tip = ind.fallen ? ind.fallProg * 1.35 : 0
      const bob = ind.fallen ? -ind.fallProg * 0.45 : Math.abs(Math.sin(ind.phase)) * 0.06

      const legs: [LegPose, LegPose] = [
        this.legPose(ind, 0),
        this.legPose(ind, 1),
      ]
      const armAmp = 0.25 + g[7] * 0.4
      const arms: [number, number] = ind.fallen
        ? [0.6 * ind.fallProg, -0.5 * ind.fallProg]
        : [Math.sin(ind.phase + Math.PI) * armAmp, Math.sin(ind.phase) * armAmp]

      out.push({
        id: i,
        x: ind.x,
        z: ind.z,
        bob,
        lean: (g[5] - 0.5) * 0.4 + ind.wobble + tip,
        fallen: ind.fallen,
        fallProg: ind.fallProg,
        legs,
        arms,
        isBest: i === this.bestIndex,
      })
    }
    return out
  }

  private legPose(ind: Individual, side: number): LegPose {
    if (ind.fallen) {
      const p = ind.fallProg
      return { hip: (side === 0 ? 0.5 : -0.7) * p + 0.2, knee: 0.5 * p }
    }
    const g = ind.genes
    const legPhase = ind.phase + side * Math.PI
    const amp = 0.3 + g[1] * 0.5
    const kAmp = 0.4 + g[2] * 0.7
    const hip = Math.sin(legPhase) * amp
    const knee = Math.max(0, Math.sin(legPhase + Math.PI / 2 + (g[3] - 0.5))) * kAmp
    return { hip, knee }
  }
}
