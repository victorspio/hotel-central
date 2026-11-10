import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { maskCPF, maskPhone } from '../../utils/formatters'

const Input = forwardRef(function Input(
  {
    label,
    error,
    helper,
    id,
    type = 'text',
    className = '',
    containerClassName = '',
    required,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordType = type === 'password'
  const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors',
            isPasswordType ? 'pr-10' : '',
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
            className
          ].join(' ')}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
            className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  )
})

export default Input

// Masked input for CPF
export function CPFInput({ value, onChange, ...props }) {
  const handleChange = (e) => {
    const masked = maskCPF(e.target.value)
    if (onChange) onChange({ target: { value: masked, name: e.target.name } })
  }
  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder="000.000.000-00"
      maxLength={14}
      {...props}
    />
  )
}

// Masked input for phone
export function PhoneInput({ value, onChange, ...props }) {
  const handleChange = (e) => {
    const masked = maskPhone(e.target.value)
    if (onChange) onChange({ target: { value: masked, name: e.target.name } })
  }
  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder="(00) 00000-0000"
      maxLength={15}
      {...props}
    />
  )
}

// Textarea variant
export function Textarea({ label, error, helper, id, containerClassName = '', className = '', required, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-y',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          className
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  )
}
