import React from 'react'

export default function PaperPage({ children, className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-[#F8F0E3] ${className}`}>
      <div
        className="absolute inset-0 opacity-50 mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 15%, rgba(251,207,232,0.28), transparent 45%), radial-gradient(circle at 85% 80%, rgba(244,143,177,0.20), transparent 45%)',
        }}
      />
      <div className="absolute inset-2 xs:inset-3 sm:inset-4 rounded-lg sm:rounded-xl border border-dashed border-pink-300/50 pointer-events-none" />
      <div className="relative h-full flex flex-col">{children}</div>
    </div>
  )
}
