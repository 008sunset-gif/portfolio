/**
 * Static, GPU-free hero backdrop for devices without WebGL. Evokes the same
 * cyber-yubatake palette (dark space, emerald glow rising from the lower right)
 * with pure CSS so nothing breaks when Three.js can't run.
 */
export default function YubatakeFallback() {
  return (
    <div className="yfallback" aria-hidden="true">
      <span className="yfallback__steam yfallback__steam--1" />
      <span className="yfallback__steam yfallback__steam--2" />
    </div>
  )
}
