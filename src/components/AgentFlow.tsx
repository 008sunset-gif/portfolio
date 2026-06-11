/**
 * Vertical SVG of the paper-survey pipeline: six stages lighting up in
 * sequence — Planner -> Collector -> Evaluator -> Synthesizer -> Verifier ->
 * Reporter. Pure CSS keyframes (staggered), so it's cheap; under
 * prefers-reduced-motion the nodes simply rest lit.
 */
const NODES = ['Planner', 'Collector', 'Evaluator', 'Synthesizer', 'Verifier', 'Reporter']

const TOP = 16
const GAP = 32
const X = 20

export default function AgentFlow() {
  const lastY = TOP + GAP * (NODES.length - 1)
  return (
    <div
      className="agentflow"
      aria-label="Planner から Collector、Evaluator、Synthesizer、Verifier、Reporter へ順に処理が進むエージェントパイプライン"
    >
      <svg viewBox={`0 0 200 ${lastY + 16}`} className="agentflow__svg" role="img">
        {/* connecting track */}
        <line x1={X} y1={TOP} x2={X} y2={lastY} className="agentflow__track" />
        {/* animated progress segments between consecutive nodes */}
        {NODES.slice(0, -1).map((_, i) => (
          <line
            key={i}
            x1={X}
            y1={TOP + GAP * i}
            x2={X}
            y2={TOP + GAP * (i + 1)}
            className={`agentflow__pulse agentflow__pulse--${i + 1}`}
          />
        ))}
        {NODES.map((label, i) => (
          <g key={label} className={`agentflow__node agentflow__node--${i + 1}`}>
            <circle cx={X} cy={TOP + GAP * i} r="6" className="agentflow__dot" />
            <text x={X + 16} y={TOP + GAP * i + 4} className="agentflow__text">
              {label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
