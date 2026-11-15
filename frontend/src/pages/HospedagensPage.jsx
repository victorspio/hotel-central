import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, LogOut as CheckOutIcon, Printer } from 'lucide-react'
import { hospedagens as hospedagensApi } from '../services/api'
import { formatDate, formatCurrency } from '../utils/formatters'
import { gerarComprovanteHospedagem } from '../utils/comprovantePdf'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'

const statusColorMap = { ATIVA: 'green', FINALIZADA: 'blue', CANCELADA: 'red' }
const statusLabelMap = { ATIVA: 'Ativa', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' }

export default function HospedagensPage() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', dataInicio: '', dataFim: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })

  const fetchList = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 15, orderBy: 'dataEntrada', order: 'desc' }
      if (filters.status) params.status = filters.status
      if (filters.dataInicio) params.dataInicio = filters.dataInicio
      if (filters.dataFim) params.dataFim = filters.dataFim
      const res = await hospedagensApi.list(params)
      const d = res.data
      setList(d.data || d.hospedagens || [])
      setPagination({
        page: d.page || page,
        limit: d.limit || 15,
        total: d.total || 0,
        totalPages: d.totalPages || 1
      })
    } catch {
      toast.error('Erro ao carregar hospedagens.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchList(1) }, [filters])

  const handlePrintComprovante = async (e, row) => {
    e.stopPropagation()
    // Abre a aba imediatamente no clique do usuário para contornar o bloqueador de popup do Chrome
    const targetWindow = window.open('about:blank', '_blank')
    if (targetWindow) {
      try {
        targetWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Carregando comprovante...</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #475569;">
              <div style="text-align: center;">
                <div style="width: 32px; height: 32px; border: 3px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
                <div style="font-size: 15px; font-weight: 500;">Gerando comprovante de hospedagem...</div>
              </div>
              <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </body>
          </html>
        `)
      } catch {
        // ignore
      }
    }
    try {
      const res = await hospedagensApi.getOne(row.id)
      const fullHosp = res.data?.hospedagem || res.data
      await gerarComprovanteHospedagem(fullHosp, { targetWindow })
    } catch {
      if (targetWindow && !targetWindow.closed) {
        targetWindow.close()
      }
      toast.error('Erro ao gerar comprovante.')
    }
  }

  const columns = [
    { key: 'cliente', label: 'Cliente', render: (v) => <span className="font-medium">{v?.nome || '-'}</span> },
    { key: 'quarto', label: 'Quarto', render: (v, row) => (
      <div>
        <span className="font-medium">
          Quarto {v?.numero || '-'}{' '}
          <span className="text-[11px] text-gray-500 font-normal">
            ({v?.predio === 'ANEXO' ? 'Anexo' : 'Hotel'})
          </span>
        </span>
        <div className="text-[11px] text-primary-700 font-medium">
          {row.tipo === 'SUITE_PREMIUM' ? 'Suíte Premium' : (row.tipo === 'COMPLETO' ? 'Completo' : (row.temArCondicionado ? 'Simples c/ Ar' : 'Simples s/ Ar'))}
        </div>
      </div>
    ) },
    { key: 'dataEntrada', label: 'Entrada', render: (v) => formatDate(v) },
    { key: 'previsaoSaida', label: 'Prev. Saída', render: (v) => formatDate(v) },
    { key: 'numHospedes', label: 'Hóspedes' },
    { key: 'valorTotal', label: 'Total', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => (
      <Badge color={statusColorMap[v] || 'gray'}>{statusLabelMap[v] || v}</Badge>
    )},
    { key: 'id', label: 'Ações', width: '130px', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(`/hospedagens/${row.id}`)}
          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          title="Ver detalhes"
        >
          <Eye size={15} />
        </button>
        <button
          onClick={(e) => handlePrintComprovante(e, row)}
          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Comprovante (PDF)"
        >
          <Printer size={15} />
        </button>
        {row.status === 'ATIVA' && (
          <button
            onClick={() => navigate(`/hospedagens/${row.id}`)}
            className="p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            title="Check-out"
          >
            <CheckOutIcon size={15} />
          </button>
        )}
      </div>
    )}
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Hospedagens</h1>
          <p className="text-sm text-gray-500">{pagination.total} registro(s)</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/hospedagens/nova')}>
          Nova Hospedagem
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <Select
          label="Status"
          options={[
            { value: '', label: 'Todos' },
            { value: 'ATIVA', label: 'Ativa' },
            { value: 'FINALIZADA', label: 'Finalizada' },
            { value: 'CANCELADA', label: 'Cancelada' }
          ]}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          containerClassName="w-40"
        />
        <DatePicker
          label="Data inicial"
          value={filters.dataInicio}
          onChange={(val) => setFilters((f) => ({ ...f, dataInicio: val }))}
          containerClassName="w-44"
        />
        <DatePicker
          label="Data final"
          value={filters.dataFim}
          min={filters.dataInicio}
          onChange={(val) => setFilters((f) => ({ ...f, dataFim: val }))}
          containerClassName="w-44"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ status: '', dataInicio: '', dataFim: '' })}
        >
          Limpar
        </Button>
      </div>

      <Table
        columns={columns}
        data={list}
        loading={loading}
        emptyMessage="Nenhuma hospedagem encontrada."
        pagination={pagination}
        onPageChange={(p) => fetchList(p)}
      />
    </div>
  )
}
