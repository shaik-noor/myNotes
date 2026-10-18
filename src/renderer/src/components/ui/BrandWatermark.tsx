import type React from 'react'

interface BrandWatermarkProps {
  text: string
  className?: string
}

export const BrandWatermark: React.FC<BrandWatermarkProps> = ({ text, className }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-0 z-0 flex items-end justify-end overflow-hidden ${
      className ?? ''
    }`}
  >
    <span className="mb-[4vh] mr-[3vw] select-none whitespace-nowrap text-[clamp(2rem,5vw,4.5rem)] font-black uppercase leading-none tracking-tight text-foreground/[0.03]">
      {text}
    </span>
  </div>
)

