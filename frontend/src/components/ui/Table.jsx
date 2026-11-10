import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function SkeletonRow({ cols }) {
  return (
    <tr className="border-t border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  )
}

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  pagination,
  onPageChange,
  className = ''
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`table-header ${col.headerClassName || ''}`}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={row.id ?? rowIdx} className="table-row">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`table-cell ${col.cellClassName || ''}`}
                    >
                      {col.render
                        ? col.render(row[col.key], row, rowIdx)
                        : row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>
            Exibindo{' '}
            <strong className="text-gray-800">
              {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
            </strong>{' '}
            –{' '}
            <strong className="text-gray-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </strong>{' '}
            de <strong className="text-gray-800">{pagination.total}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={[
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    pageNum === pagination.page
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  ].join(' ')}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
