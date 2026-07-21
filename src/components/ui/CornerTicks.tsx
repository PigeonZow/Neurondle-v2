// Cartographic corner brackets — the recurring furniture motif that marks a
// surface as part of the chart. Parent must be position:relative.
export function CornerTicks() {
  const tick = 'absolute w-2.5 h-2.5 border-starlight/30 pointer-events-none'
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <span className={`${tick} top-0 left-0 border-t border-l`} />
      <span className={`${tick} top-0 right-0 border-t border-r`} />
      <span className={`${tick} bottom-0 left-0 border-b border-l`} />
      <span className={`${tick} bottom-0 right-0 border-b border-r`} />
    </div>
  )
}
