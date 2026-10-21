import type React from 'react'
import appIcon from '../../assets/icon.png'

interface AppLogoProps {
  size?: number
  className?: string
}

/** Shared MyNotes identity; the same master supplies browser and native icons. */
export const AppLogo: React.FC<AppLogoProps> = ({ size = 24, className }) => (
  <img
    src={appIcon}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable={false}
    className={className}
    style={{ flexShrink: 0, objectFit: 'contain' }}
  />
)
