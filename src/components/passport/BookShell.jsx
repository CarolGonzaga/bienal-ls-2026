import React from 'react'

export default function BookShell({ children, className = '' }) {
  return (
    <div className={`relative rounded-[22px] sm:rounded-[26px] p-2.5 sm:p-3 bg-gradient-to-br from-rose-400/70 via-pink-500/60 to-rose-800/70 shadow-[0_40px_80px_-30px_rgba(74,18,40,0.7)] ${className}`}>
      <div className="rounded-[16px] sm:rounded-[18px] overflow-hidden bg-[#F8F0E3]">
        {children}
      </div>
    </div>
  )
}
