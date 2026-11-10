import { format, parseISO, differenceInDays, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Format a number as Brazilian currency (R$ 1.234,56)
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Format a date string or Date object as dd/mm/yyyy
 */
export function formatDate(date) {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '-'
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '-'
  }
}

/**
 * Format a date string or Date object as dd/mm/yyyy HH:mm
 */
export function formatDateTime(date) {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '-'
    return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR })
  } catch {
    return '-'
  }
}

/**
 * Format CPF string as 000.000.000-00
 */
export function formatCPF(cpf) {
  if (!cpf) return '-'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Format phone string as (00) 00000-0000 or (00) 0000-0000
 */
export function formatPhone(phone) {
  if (!phone) return '-'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

/**
 * Parse a dd/mm/yyyy string to a Date object
 */
export function parseBRDate(str) {
  if (!str) return null
  try {
    const d = parse(str, 'dd/MM/yyyy', new Date())
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

/**
 * Calculate the number of days between two dates
 */
export function calcDias(dataEntrada, dataSaida) {
  if (!dataEntrada || !dataSaida) return 0
  try {
    const entrada = typeof dataEntrada === 'string' ? parseISO(dataEntrada) : dataEntrada
    const saida = typeof dataSaida === 'string' ? parseISO(dataSaida) : dataSaida
    const diff = differenceInDays(saida, entrada)
    return diff > 0 ? diff : 1
  } catch {
    return 1
  }
}

/**
 * Returns Tailwind background + text classes for quarto status
 */
export function getStatusColor(status) {
  switch (status) {
    case 'LIVRE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'OCUPADO':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'LIMPEZA':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'MANUTENCAO':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

/**
 * Returns Portuguese label for a quarto status
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'LIVRE':
      return 'Livre'
    case 'OCUPADO':
      return 'Ocupado'
    case 'LIMPEZA':
      return 'Limpeza'
    case 'MANUTENCAO':
      return 'Manutenção'
    case 'ATIVA':
      return 'Ativa'
    case 'FINALIZADA':
      return 'Finalizada'
    case 'CANCELADA':
      return 'Cancelada'
    case 'RECEITA':
      return 'Receita'
    case 'DESPESA':
      return 'Despesa'
    case 'PAGO':
      return 'Pago'
    case 'PENDENTE':
      return 'Pendente'
    default:
      return status || '-'
  }
}

/**
 * Returns card background color class for quarto status (for the room map)
 */
export function getStatusCardColor(status) {
  switch (status) {
    case 'LIVRE':
      return 'bg-green-50 border-green-300 hover:bg-green-100'
    case 'OCUPADO':
      return 'bg-red-50 border-red-300 hover:bg-red-100'
    case 'LIMPEZA':
      return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
    case 'MANUTENCAO':
      return 'bg-gray-100 border-gray-300 hover:bg-gray-200'
    default:
      return 'bg-white border-gray-200'
  }
}

/**
 * Mask a string as CPF while typing: 000.000.000-00
 */
export function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/**
 * Mask a string as phone while typing
 */
export function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

/**
 * Convert a date to ISO string for API (yyyy-MM-dd)
 */
export function toISODate(date) {
  if (!date) return null
  try {
    if (typeof date === 'string' && date.includes('/')) {
      const d = parseBRDate(date)
      return d ? format(d, 'yyyy-MM-dd') : null
    }
    const d = typeof date === 'string' ? parseISO(date) : date
    return isValid(d) ? format(d, 'yyyy-MM-dd') : null
  } catch {
    return null
  }
}
