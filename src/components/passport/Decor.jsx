import React from 'react'
import { appPath } from '../../lib/paths'

// The supplied passport art has a dark matte background. The SVG filter only
// makes the near-black matte transparent; the pink line work remains from the
// original PNG, preserving the supplied artwork and its proportions.
// StampFilter mantido para compatibilidade; o blend mode real é feito via CSS
export function StampFilter() { return null }

export function PassportStamp({ className = '' }) {
  return (
    <img
      src={appPath('/passaporte/selo1.png')}
      alt="Passaporte Sáfico Bienal 2026"
      className={`select-none -rotate-6 w-20 sm:w-28 object-contain ${className}`}
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}

export function RoundStamp({ src = 'selo2', label = 'Selo', className = '' }) {
  const assetName = src === 'selo3' ? 'selo3.png' : 'selo2.png'
  return (
    <img
      src={appPath(`/passaporte/${assetName}`)}
      alt={label}
      className={`select-none rotate-6 w-16 h-16 sm:w-24 sm:h-24 object-contain ${className}`}
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}

export function Skyline({ className = '' }) {
  return (
    <img
      src={appPath('/passaporte/saopaulo.png')}
      alt=""
      aria-hidden="true"
      className={`select-none w-full max-w-[200px] sm:max-w-[260px] h-20 sm:h-24 object-contain opacity-70 ${className}`}
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}

export function Waves({ className = '' }) {
  return (
    <img
      src={appPath('/passaporte/ondas.png')}
      alt=""
      aria-hidden="true"
      className={`select-none w-20 sm:w-28 object-contain ${className}`}
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}
