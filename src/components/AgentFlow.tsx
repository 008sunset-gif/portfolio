/**
 * Small SVG showing Planner -> Researcher -> Writer lighting up in sequence,
 * echoing DeepDive's multi-agent pipeline. Pure CSS keyframes (staggered), so
 * it's cheap; under prefers-reduced-motion the nodes simply rest lit.
 */
const NODES = ['Planner', 'Researcher', 'Writer']

export default function AgentFlow() {
  return (
    <div className="agentflow" aria-label="Planner から Researcher、Writer へ順に処理が進むエージェントパイプライン">
      <svg viewBox="0 0 300 60" className="agentflow__svg" role="img">
        {/* connecting track */}
        <line x1="34" y1="30" x2="266" y2="30" className="agentflow__track" />
        {/* animated progress segments */}
        <line x1="34" y1="30" x2="150" y2="30" className="agentflow__pulse agentflow__pulse--1" />
        <line x1="150" y1="30" x2="266" y2="30" className="agentflow__pulse agentflow__pulse--2" />

        {[34, 150, 266].map((cx, i) => (
          <g key={NODES[i]} className={`agentflow__node agentflow__node--${i + 1}`}>
            <circle cx={cx} cy="30" r="9" className="agentflow__dot" />
            <text x={cx} y="52" className="agentflow__text">
              {NODES[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
