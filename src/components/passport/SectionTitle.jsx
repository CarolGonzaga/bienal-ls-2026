import React from 'react'

export default function SectionTitle({ icon: Icon, children, rule = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Icon && <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-pink-700 shrink-0" strokeWidth={2} />}
      <h3 className="text-[11px] sm:text-[13px] font-bold tracking-[0.06em] sm:tracking-[0.12em] uppercase text-pink-800 font-heading truncate">
        {children}
      </h3>
      {rule && <div className="flex-1 border-t border-dashed border-pink-300/60 ml-1" />}
    </div>
  )
}
