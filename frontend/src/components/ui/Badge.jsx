import React from 'react'

const colorClasses = {
  green: 'bg-green-100 text-green-800 border border-green-200',
  red: 'bg-red-100 text-red-800 border border-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  gray: 'bg-gray-100 text-gray-700 border border-gray-200',
  blue: 'bg-blue-100 text-blue-800 border border-blue-200',
  orange: 'bg-orange-100 text-orange-800 border border-orange-200',
  purple: 'bg-purple-100 text-purple-800 border border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-200'
}

export default function Badge({ children, color, variant, className = '' }) {
  const c = color || variant || 'gray'
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colorClasses[c] || colorClasses.gray,
        className
      ].join(' ')}
    >
      {children}
    </span>
  )
}
