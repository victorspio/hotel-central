import React, { useState, useRef, useEffect } from 'react'
import {
  format, parseISO, isValid, addMonths, subMonths, startOfMonth,
  endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, isBefore, startOfDay, setMonth, setYear, parse
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// Generate list of years from 1920 up to current year + 5 (descending order)
const currentYear = new Date().getFullYear()
const ANOS = Array.from({ length: currentYear - 1920 + 6 }, (_, i) => currentYear + 5 - i)

export default function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = 'DD/MM/AAAA',
  required = false,
  error,
  containerClassName = '',
  className = '',
  disabled = false
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Parse current selected date safely
  const selectedDate = (() => {
    if (!value) return null
    if (value instanceof Date && isValid(value)) return value
    try {
      const cleanVal = typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value
      const parsed = typeof cleanVal === 'string' ? parseISO(cleanVal) : cleanVal
      return isValid(parsed) ? parsed : null
    } catch {
      return null
    }
  })()

  // Local text input for direct typing with mask dd/mm/aaaa
  const [inputText, setInputText] = useState(
    selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''
  )

  // Calendar month/year view state
  const [viewDate, setViewDate] = useState(selectedDate || new Date())

  // Keep state in sync when external value changes
  useEffect(() => {
    if (selectedDate) {
      setInputText(format(selectedDate, 'dd/MM/yyyy'))
      setViewDate(selectedDate)
    } else {
      setInputText('')
    }
  }, [value])

  // Click outside to close calendar popover
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Parse min / max bounds
  const minDate = (() => {
    if (!min) return null
    try {
      const d = typeof min === 'string' ? parseISO(`${min.slice(0, 10)}T00:00:00`) : min
      return isValid(d) ? startOfDay(d) : null
    } catch {
      return null
    }
  })()

  const maxDate = (() => {
    if (!max) return null
    try {
      const d = typeof max === 'string' ? parseISO(`${max instanceof Date ? format(max, 'yyyy-MM-dd') : max.slice(0, 10)}T00:00:00`) : max
      return isValid(d) ? startOfDay(d) : null
    } catch {
      return null
    }
  })()

  // Mask and handle manual typing in input
  const handleInputChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = ''

    if (raw.length <= 2) {
      formatted = raw
    } else if (raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`
    } else {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`
    }

    setInputText(formatted)

    if (raw.length === 8) {
      try {
        const parsed = parse(formatted, 'dd/MM/yyyy', new Date())
        if (isValid(parsed)) {
          const isoString = format(parsed, 'yyyy-MM-dd')
          setViewDate(parsed)
          onChange(isoString)
        }
      } catch {}
    } else if (raw.length === 0) {
      onChange('')
    }
  }

  // Handle day selection in calendar
  const handleSelectDay = (day) => {
    const dayStart = startOfDay(day)
    if (minDate && isBefore(dayStart, minDate)) return
    if (maxDate && isBefore(maxDate, dayStart)) return

    const formattedIso = format(day, 'yyyy-MM-dd')
    onChange(formattedIso)
    setInputText(format(day, 'dd/MM/yyyy'))
    setOpen(false)
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation()
    setViewDate((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = (e) => {
    e.stopPropagation()
    setViewDate((prev) => addMonths(prev, 1))
  }

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10)
    setViewDate((prev) => setMonth(prev, newMonth))
  }

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10)
    setViewDate((prev) => setYear(prev, newYear))
  }

  const handleSetToday = (e) => {
    e.stopPropagation()
    const today = new Date()
    setViewDate(today)
    handleSelectDay(today)
  }

  // Calendar grid calculations
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className={`relative flex flex-col gap-1 ${containerClassName}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-gray-700 tracking-wide uppercase">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input container with direct typing + calendar trigger */}
      <div
        className={[
          'group relative flex items-center w-full rounded-xl border bg-white transition-all shadow-sm',
          open
            ? 'border-primary-500 ring-2 ring-primary-100'
            : error
            ? 'border-red-300 bg-red-50/20'
            : 'border-gray-200 hover:border-gray-300',
          disabled ? 'opacity-60 bg-gray-100 cursor-not-allowed' : '',
          className
        ].join(' ')}
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={() => !disabled && setOpen(!open)}
          className="pl-3.5 pr-2 py-2 text-gray-400 hover:text-primary-600 focus:outline-none transition-colors"
          title="Abrir calendário"
        >
          <CalendarIcon size={16} className={open ? 'text-primary-600' : ''} />
        </button>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onClick={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          className="w-full py-2 pr-8 text-sm text-gray-900 bg-transparent placeholder-gray-400 focus:outline-none font-medium"
        />

        {inputText && !disabled && (
          <button
            type="button"
            onClick={() => {
              setInputText('')
              onChange('')
            }}
            className="absolute right-2.5 p-1 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Limpar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}

      {/* Popover Calendar with Fast Month & Year Dropdowns */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-80 bg-white rounded-2xl border border-gray-100 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-100">
          {/* Header with Quick Select for Month & Year */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Quick Month & Year Selectors */}
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={viewDate.getMonth()}
                onChange={handleMonthChange}
                className="text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
              >
                {MESES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewDate.getFullYear()}
                onChange={handleYearChange}
                className="text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
              >
                {ANOS.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {weekDays.map((wd, i) => (
              <span key={i} className="text-[11px] font-semibold text-gray-400 uppercase">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day) => {
              const dayStart = startOfDay(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isDayToday = isToday(day)
              const isDisabled =
                (minDate && isBefore(dayStart, minDate)) ||
                (maxDate && isBefore(maxDate, dayStart))

              let dayClasses =
                'h-8 w-8 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all'

              if (isDisabled) {
                dayClasses += ' text-gray-300 cursor-not-allowed pointer-events-none'
              } else if (isSelected) {
                dayClasses += ' bg-primary-600 text-white font-bold shadow-md shadow-primary-200'
              } else if (isDayToday) {
                dayClasses +=
                  ' bg-primary-50 text-primary-700 font-bold border border-primary-300 hover:bg-primary-100 cursor-pointer'
              } else if (!isCurrentMonth) {
                dayClasses += ' text-gray-300 hover:bg-gray-100 cursor-pointer'
              } else {
                dayClasses += ' text-gray-700 hover:bg-primary-50 hover:text-primary-700 cursor-pointer'
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={dayClasses}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="flex items-center justify-between border-t border-gray-100 mt-3 pt-2 px-1">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
