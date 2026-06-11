/**
 * EvoWalker — an homage to the "EvoWalker AI" project, reimplemented as a
 * super-light Canvas 2D mini-simulation for the hero background.
 *
 * A small population of stick-figure robots tries to walk left -> right. Each
 * individual is described by 12 genes (0..1). Forward speed and the chance of
 * falling both depend on how close those genes are to a stable gait, so the
 * genetic algorithm (elite selection + mutation) visibly converges: early
 * generations stumble and fall, later ones walk smoothly. No physics engine,
 * no dependencies — just trig and a few floats per frame, so CPU cost is tiny.
 */

const GENES = 12
// A "stable gait" target. Fitness rewards getting close to it.
const IDEAL = [0.6, 0.65, 0.6, 0.5, 0.7, 0.55, 0.6, 0.5, 0.5, 0.55, 0.8, 0.6]

type Individual = {
  genes: number[]
  geneDist: number
  x: number
  startX: number
  phase: number
  fallen: boolean
  fallProg: number // 0..1 tip-over animation
  wobble: number
  fitness: number
  elite: boolean
}

const rand = () => Math.random()
const randn = () => {
  // Box-Muller
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
  return s / GENES // ~0 (perfect) .. ~0.3 (random)
}

export type WalkerOptions = {
  population?: number
  genDurationSec?: number
}

export class EvoWalkerSim {
  pop: Individual[] = []
  generation = 1
  bestDistance = 0
  private genTime = 0
  private genDuration: number
  private mutStrength = 0.13
  private populationSize: number
  // layout (set on resize)
  private w = 800
  private h = 480
  private groundY = 380
  private spacing = 90
  private baseX = 60
  private scale = 1

  constructor(opts: WalkerOptions = {}) {
    this.populationSize = opts.population ?? 8
    this.genDuration = opts.genDurationSec ?? 6
    this.seed()
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.groundY = Math.round(h * 0.88)
    this.scale = Math.max(0.75, Math.min(1.1, h / 520))
    this.spacing = Math.max(70, Math.min(120, w / (this.populationSize + 1)))
    this.baseX = this.spacing * 0.6
  }

  private makeIndividual(genes: number[], idx: number, elite = false): Individual {
    const startX = this.baseX + idx * (this.spacing * 0.18)
    return {
      genes,
      geneDist: geneDistance(genes),
      x: startX,
      startX,
      phase: rand() * Math.PI * 2,
      fallen: false,
      fallProg: 0,
      wobble: 0,
      fitness: 0,
      elite,
    }
  }

  private seed() {
    this.pop = []
    for (let i = 0; i < this.populationSize; i++) {
      // start fairly random so generation 1 is clearly clumsy
      const genes = Array.from({ length: GENES }, () => clamp01(0.5 + randn() * 0.28))
      this.pop.push(this.makeIndividual(genes, i))
    }
  }

  /** Advance the world by dt seconds. */
  update(dt: number) {
    // clamp dt so tab-switches don't explode the sim
    const d = Math.min(dt, 0.05)
    this.genTime += d

    for (const ind of this.pop) {
      if (ind.fallen) {
        ind.fallProg = Math.min(1, ind.fallProg + d * 2.2)
        continue
      }

      const g = ind.genes
      const freq = 1.1 + g[0] * 2.2
      ind.phase += freq * d

      // forward speed: closer to ideal gait => faster & steadier
      const quality = 1 - ind.geneDist * 2.4 // 1 (ideal) .. ~0.3 (random)
      const stride = 18 + g[4] * 42
      const speed = Math.max(4, stride * (0.4 + 0.6 * quality)) * this.scale
      ind.x += speed * d

      ind.fitness = ind.x - ind.startX
      ind.wobble = Math.sin(ind.phase * 2) * (0.04 + ind.geneDist * 0.9)

      // stochastic fall — far-from-ideal individuals are far more likely to trip
      const fallRate = 0.04 + ind.geneDist * 5.5 // per second
      if (rand() < fallRate * d) {
        ind.fallen = true
      }
    }

    this.bestDistance = Math.max(...this.pop.map((p) => (p.fallen ? p.fitness : p.x - p.startX)))

    if (this.genTime >= this.genDuration) {
      this.nextGeneration()
    }
  }

  private nextGeneration() {
    // evaluate
    for (const ind of this.pop) ind.fitness = ind.x - ind.startX
    const sorted = [...this.pop].sort((a, b) => b.fitness - a.fitness)
    const eliteCount = Math.max(2, Math.floor(this.populationSize * 0.25))
    const elites = sorted.slice(0, eliteCount)

    const next: Individual[] = []
    // keep elites (re-spawned at the start line)
    elites.forEach((e, i) => next.push(this.makeIndividual([...e.genes], i, true)))
    // fill the rest with mutated children of random elites
    let idx = elites.length
    while (next.length < this.populationSize) {
      const parent = elites[Math.floor(rand() * elites.length)]
      const child = parent.genes.map((v) => clamp01(v + randn() * this.mutStrength))
      next.push(this.makeIndividual(child, idx++))
    }

    this.pop = next
    this.generation += 1
    this.genTime = 0
    // anneal mutation so the gait settles over time
    this.mutStrength = Math.max(0.04, this.mutStrength * 0.94)
  }

  /** Run the sim forward without drawing — used to pre-evolve a still frame. */
  warm(steps: number, dt = 1 / 60) {
    for (let i = 0; i < steps; i++) this.update(dt)
  }

  // ---- drawing -------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.w, this.h)

    // faint ground line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, this.groundY + 0.5)
    ctx.lineTo(this.w, this.groundY + 0.5)
    ctx.stroke()

    // ground tick marks for a sense of forward progress
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'
    for (let gx = 0; gx < this.w; gx += 64) {
      ctx.beginPath()
      ctx.moveTo(gx + 0.5, this.groundY + 4)
      ctx.lineTo(gx + 0.5, this.groundY + 9)
      ctx.stroke()
    }

    // draw fittest first-pass to know who's best (for colour accent)
    let bestIdx = 0
    let bestFit = -Infinity
    this.pop.forEach((p, i) => {
      const f = p.x - p.startX
      if (f > bestFit) {
        bestFit = f
        bestIdx = i
      }
    })

    this.pop.forEach((ind, i) => this.drawWalker(ctx, ind, i === bestIdx))
  }

  private drawWalker(ctx: CanvasRenderingContext2D, ind: Individual, isBest: boolean) {
    if (ind.x > this.w + 60) return // walked off-screen to the right

    const s = this.scale
    const hipLen = 30 * s
    const thighLen = 20 * s
    const shinLen = 19 * s

    const bob = ind.fallen ? 0 : Math.abs(Math.sin(ind.phase)) * 3 * s
    const hipX = ind.x
    let hipY = this.groundY - (thighLen + shinLen) * 0.82 - bob

    // tip-over transform when fallen
    const tip = ind.fallen ? ind.fallProg * (Math.PI / 2) * 0.92 : 0
    if (ind.fallen) hipY = this.groundY - (thighLen + shinLen) * 0.82 * (1 - ind.fallProg * 0.7) - 2

    const lean = ind.wobble + tip

    // colour: best individual gets the teal accent, others faint
    const alpha = ind.fallen ? 0.12 : isBest ? 0.4 : 0.2
    const col = isBest ? `rgba(94,234,212,${alpha})` : `rgba(200,210,230,${alpha})`
    ctx.strokeStyle = col
    ctx.fillStyle = col
    ctx.lineWidth = 1.5 * s
    ctx.lineCap = 'round'

    // torso direction (lean forward / tip over)
    const torsoDx = Math.sin(lean)
    const torsoDy = -Math.cos(lean)
    const shoulderX = hipX + torsoDx * hipLen
    const shoulderY = hipY + torsoDy * hipLen

    // legs (anti-phase). When fallen, legs splay out limply.
    for (let side = 0; side < 2; side++) {
      const legPhase = ind.phase + side * Math.PI
      let thighAng: number
      let kneeAng: number
      if (ind.fallen) {
        thighAng = (side === 0 ? 0.5 : -0.7) * ind.fallProg + 0.2
        kneeAng = 0.5 * ind.fallProg
      } else {
        const amp = 0.35 + ind.genes[1] * 0.5
        const kAmp = 0.5 + ind.genes[2] * 0.7
        thighAng = Math.sin(legPhase) * amp
        kneeAng = Math.max(0, Math.sin(legPhase + Math.PI / 2)) * kAmp
      }
      // angles measured from straight-down
      const kx = hipX + Math.sin(thighAng) * thighLen
      const ky = hipY + Math.cos(thighAng) * thighLen
      const fx = kx + Math.sin(thighAng + kneeAng) * shinLen
      const fy = ky + Math.cos(thighAng + kneeAng) * shinLen
      ctx.beginPath()
      ctx.moveTo(hipX, hipY)
      ctx.lineTo(kx, ky)
      ctx.lineTo(fx, fy)
      ctx.stroke()
    }

    // arms (subtle swing, opposite to legs)
    for (let side = 0; side < 2; side++) {
      const armPhase = ind.phase + side * Math.PI + Math.PI
      const swing = ind.fallen ? 0.6 * ind.fallProg : Math.sin(armPhase) * 0.4
      const armLen = 17 * s
      const baseX = shoulderX
      const baseY = shoulderY + 2 * s
      const ax = baseX + Math.sin(swing + lean) * armLen
      const ay = baseY + Math.cos(swing + lean) * armLen
      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.lineTo(ax, ay)
      ctx.stroke()
    }

    // torso
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(shoulderX, shoulderY)
    ctx.stroke()

    // head
    const headR = 5 * s
    const headX = shoulderX + torsoDx * headR * 1.4
    const headY = shoulderY + torsoDy * headR * 1.4
    ctx.beginPath()
    ctx.arc(headX, headY, headR, 0, Math.PI * 2)
    ctx.stroke()
  }
}
