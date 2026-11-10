import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { financeiro as financeiroApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'
import { format, subMonths } from 'date-fns'

const TABS = ['Lançamentos', 'Resumo', 'Fluxo de Caixa']

const pgtoOptions = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' }
]

const categoriaOptions = [
  { value: 'HOSPEDAGEM', label: 'Hospedagem' },
  { value: 'CONSUMO', label: 'Consumo' },
  { value: 'LIMPEZA', label: 'Limpeza' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'SALARIO', label: 'Salário' },
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'OUTRO', label: 'Outro' }
]

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const emptyLancamento = {
  tipo: 'RECEITA', categoria: 'HOSPEDAGEM', descricao: '', valor: '',
  data: format(new Date(), 'yyyy-MM-dd'), formaPagamento: 'PIX',
  status: 'PAGO', observacoes: ''
}

function StatCard({ title, value, colorClass }) {
  return (
    <div className="stat-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  )
}

export default function FinanceiroPage() {
  const [tab, setTab] = useState(0)

  // ── Lancamentos tab ──────────────────────────────────────────────────────
  const [lancamentos, setLancamentos] = useState([])
  const [loadingLanc, setLoadingLanc] = useState(true)
  const [filtersLanc, setFiltersLanc] = useState({ tipo: '', categoria: '', status: '', dataInicio: '', dataFim: '', formaPagamento: '' })
  const [paginationLanc, setPaginationLanc] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [lancModal, setLancModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [editLanc, setEditLanc] = useState(null)
  const [lancForm, setLancForm] = useState(emptyLancamento)
  const [savingLanc, setSavingLanc] = useState(false)

  const fetchLancamentos = useCallback(async (page = 1) => {
    setLoadingLanc(true)
    try {
      const params = { page, limit: 15, orderBy: 'data', order: 'desc' }
      Object.entries(filtersLanc).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await financeiroApi.listLancamentos(params)
      const d = res.data
      setLancamentos(d.data || d.lancamentos || [])
      setPaginationLanc({ page: d.page || page, limit: d.limit || 15, total: d.total || 0, totalPages: d.totalPages || 1 })
    } catch {
      toast.error('Erro ao carregar lançamentos.')
    } finally {
      setLoadingLanc(false)
    }
  }, [filtersLanc])

  useEffect(() => { if (tab === 0) fetchLancamentos(1) }, [filtersLanc, tab])

  const openCreate = () => { setEditLanc(null); setLancForm(emptyLancamento); setLancModal(true) }
  const openEdit = (l) => {
    setEditLanc(l)
    setLancForm({
      tipo: l.tipo, categoria: l.categoria, descricao: l.descricao || '',
      valor: String(l.valor || ''), data: l.data?.slice(0, 10) || '',
      formaPagamento: l.formaPagamento || 'PIX', status: l.status || 'PAGO',
      observacoes: l.observacoes || ''
    })
    setLancModal(true)
  }

  const handleSaveLanc = async () => {
    if (!lancForm.descricao) return toast.error('Descrição é obrigatória.')
    if (!lancForm.valor) return toast.error('Valor é obrigatório.')
    setSavingLanc(true)
    try {
      const payload = { ...lancForm, valor: parseFloat(lancForm.valor) }
      if (editLanc) {
        await financeiroApi.updateLancamento(editLanc.id, payload)
        toast.success('Lançamento atualizado!')
      } else {
        await financeiroApi.createLancamento(payload)
        toast.success('Lançamento criado!')
      }
      setLancModal(false)
      fetchLancamentos(paginationLanc.page)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar.')
    } finally {
      setSavingLanc(false)
    }
  }

  const handleDeleteLanc = async () => {
    if (!deleteModal) return
    try {
      await financeiroApi.deleteLancamento(deleteModal.id)
      toast.success('Lançamento excluído.')
      setDeleteModal(null)
      fetchLancamentos(paginationLanc.page)
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  const lancColumns = [
    { key: 'data', label: 'Data', render: (v) => formatDate(v) },
    { key: 'tipo', label: 'Tipo', render: (v) => <Badge color={v === 'RECEITA' ? 'green' : 'red'}>{v === 'RECEITA' ? 'Receita' : 'Despesa'}</Badge> },
    { key: 'categoria', label: 'Categoria' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'valor', label: 'Valor', render: (v, row) => (
      <span className={`font-semibold ${row.tipo === 'RECEITA' ? 'text-green-700' : 'text-red-600'}`}>
        {row.tipo === 'DESPESA' ? '- ' : '+ '}{formatCurrency(v)}
      </span>
    )},
    { key: 'formaPagamento', label: 'Forma Pgto', render: (v) => pgtoOptions.find(p => p.value === v)?.label || v || '-' },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v === 'PAGO' ? 'green' : 'yellow'}>{v === 'PAGO' ? 'Pago' : 'Pendente'}</Badge> },
    { key: 'id', label: 'Ações', width: '80px', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteModal(row)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )}
  ]

  // ── Resumo tab ───────────────────────────────────────────────────────────
  const [resumo, setResumo] = useState(null)
  const [resumoFilters, setResumoFilters] = useState({
    dataInicio: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd')
  })
  const [loadingResumo, setLoadingResumo] = useState(false)

  const fetchResumo = useCallback(async () => {
    setLoadingResumo(true)
    try {
      const res = await financeiroApi.getResumo(resumoFilters)
      setResumo(res.data)
    } catch {
      toast.error('Erro ao carregar resumo.')
    } finally {
      setLoadingResumo(false)
    }
  }, [resumoFilters])

  useEffect(() => { if (tab === 1) fetchResumo() }, [tab, resumoFilters])

  // ── Fluxo de Caixa tab ───────────────────────────────────────────────────
  const [fluxo, setFluxo] = useState([])
  const [loadingFluxo, setLoadingFluxo] = useState(false)

  const fetchFluxo = useCallback(async () => {
    setLoadingFluxo(true)
    try {
      const res = await financeiroApi.getFluxoCaixa({ meses: 12 })
      setFluxo(res.data?.data || res.data || [])
    } catch {
      toast.error('Erro ao carregar fluxo de caixa.')
    } finally {
      setLoadingFluxo(false)
    }
  }, [])

  useEffect(() => { if (tab === 2) fetchFluxo() }, [tab])

  // Running balance
  const fluxoComSaldo = fluxo.reduce((acc, item) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].saldo : 0
    acc.push({ ...item, saldo: prev + (item.receita || 0) - (item.despesa || 0) })
    return acc
  }, [])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-sm text-gray-500">Gestão financeira do hotel</p>
        </div>
        {tab === 0 && <Button icon={Plus} onClick={openCreate}>Novo Lançamento</Button>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={[
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Lançamentos ── */}
      {tab === 0 && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
            <Select
              label="Tipo"
              options={[{ value: '', label: 'Todos' }, { value: 'RECEITA', label: 'Receita' }, { value: 'DESPESA', label: 'Despesa' }]}
              value={filtersLanc.tipo}
              onChange={(e) => setFiltersLanc((f) => ({ ...f, tipo: e.target.value }))}
              containerClassName="w-36"
            />
            <Select
              label="Categoria"
              options={[{ value: '', label: 'Todas' }, ...categoriaOptions]}
              value={filtersLanc.categoria}
              onChange={(e) => setFiltersLanc((f) => ({ ...f, categoria: e.target.value }))}
              containerClassName="w-40"
            />
            <Select
              label="Status"
              options={[{ value: '', label: 'Todos' }, { value: 'PAGO', label: 'Pago' }, { value: 'PENDENTE', label: 'Pendente' }]}
              value={filtersLanc.status}
              onChange={(e) => setFiltersLanc((f) => ({ ...f, status: e.target.value }))}
              containerClassName="w-36"
            />
            <DatePicker
              label="Data inicial"
              value={filtersLanc.dataInicio}
              onChange={(val) => setFiltersLanc((f) => ({ ...f, dataInicio: val }))}
              containerClassName="w-40"
              className="py-2"
            />
            <DatePicker
              label="Data final"
              value={filtersLanc.dataFim}
              min={filtersLanc.dataInicio}
              onChange={(val) => setFiltersLanc((f) => ({ ...f, dataFim: val }))}
              containerClassName="w-40"
              className="py-2"
            />
            <Button variant="ghost" size="sm" onClick={() => setFiltersLanc({ tipo: '', categoria: '', status: '', dataInicio: '', dataFim: '', formaPagamento: '' })}>
              Limpar
            </Button>
          </div>

          <Table
            columns={lancColumns}
            data={lancamentos}
            loading={loadingLanc}
            emptyMessage="Nenhum lançamento encontrado."
            pagination={paginationLanc}
            onPageChange={(p) => fetchLancamentos(p)}
          />
        </div>
      )}

      {/* ── Tab 1: Resumo ── */}
      {tab === 1 && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
            <DatePicker
              label="Data inicial"
              value={resumoFilters.dataInicio}
              onChange={(val) => setResumoFilters((f) => ({ ...f, dataInicio: val }))}
              containerClassName="w-40"
              className="py-2"
            />
            <DatePicker
              label="Data final"
              value={resumoFilters.dataFim}
              min={resumoFilters.dataInicio}
              onChange={(val) => setResumoFilters((f) => ({ ...f, dataFim: val }))}
              containerClassName="w-40"
              className="py-2"
            />
            <Button size="sm" onClick={fetchResumo} loading={loadingResumo}>Aplicar</Button>
          </div>

          {loadingResumo ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : resumo ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Receitas" value={formatCurrency(resumo.totalReceitas)} colorClass="text-green-700" />
                <StatCard title="Total Despesas" value={formatCurrency(resumo.totalDespesas)} colorClass="text-red-600" />
                <StatCard title="Saldo" value={formatCurrency(resumo.saldo)} colorClass={resumo.saldo >= 0 ? 'text-primary-700' : 'text-red-600'} />
                <StatCard title="Ticket Médio" value={formatCurrency(resumo.ticketMedio)} colorClass="text-gray-800" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Receitas por Categoria">
                  {resumo.receitasPorCategoria?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={resumo.receitasPorCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={80} label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}>
                          {resumo.receitasPorCategoria.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-gray-400 py-8 text-center">Sem dados.</p>}
                </Card>
                <Card title="Despesas por Categoria">
                  {resumo.despesasPorCategoria?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={resumo.despesasPorCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={80} label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}>
                          {resumo.despesasPorCategoria.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-gray-400 py-8 text-center">Sem dados.</p>}
                </Card>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Tab 2: Fluxo de Caixa ── */}
      {tab === 2 && (
        <div className="space-y-5">
          <Card title="Receita vs Despesa — Últimos 12 Meses">
            {loadingFluxo ? (
              <div className="skeleton h-60 rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fluxoComSaldo} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend formatter={(v) => v === 'receita' ? 'Receita' : 'Despesa'} />
                  <Bar dataKey="receita" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Totais Mensais">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header">Mês</th>
                    <th className="table-header">Receita</th>
                    <th className="table-header">Despesa</th>
                    <th className="table-header">Resultado</th>
                    <th className="table-header">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingFluxo ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : fluxoComSaldo.map((row) => {
                    const resultado = (row.receita || 0) - (row.despesa || 0)
                    return (
                      <tr key={row.mes} className="table-row">
                        <td className="table-cell font-medium">{row.mes}</td>
                        <td className="table-cell text-green-700 font-medium">{formatCurrency(row.receita || 0)}</td>
                        <td className="table-cell text-red-600 font-medium">{formatCurrency(row.despesa || 0)}</td>
                        <td className={`table-cell font-semibold ${resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
                        </td>
                        <td className={`table-cell font-bold ${row.saldo >= 0 ? 'text-primary-700' : 'text-red-600'}`}>
                          {formatCurrency(row.saldo)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={lancModal}
        onClose={() => setLancModal(false)}
        title={editLanc ? 'Editar Lançamento' : 'Novo Lançamento'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLancModal(false)}>Cancelar</Button>
            <Button loading={savingLanc} onClick={handleSaveLanc}>{editLanc ? 'Salvar' : 'Criar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tipo" options={[{ value: 'RECEITA', label: 'Receita' }, { value: 'DESPESA', label: 'Despesa' }]} value={lancForm.tipo} onChange={(e) => setLancForm((f) => ({ ...f, tipo: e.target.value }))} />
          <Select label="Categoria" options={categoriaOptions} value={lancForm.categoria} onChange={(e) => setLancForm((f) => ({ ...f, categoria: e.target.value }))} />
          <Input label="Descrição" required value={lancForm.descricao} onChange={(e) => setLancForm((f) => ({ ...f, descricao: e.target.value }))} containerClassName="col-span-2" />
          <Input label="Valor (R$)" type="number" min="0" step="0.01" required value={lancForm.valor} onChange={(e) => setLancForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
          <DatePicker
            label="Data"
            required
            value={lancForm.data}
            onChange={(val) => setLancForm((f) => ({ ...f, data: val }))}
          />
          <Select label="Forma Pagamento" options={pgtoOptions} value={lancForm.formaPagamento} onChange={(e) => setLancForm((f) => ({ ...f, formaPagamento: e.target.value }))} />
          <Select label="Status" options={[{ value: 'PAGO', label: 'Pago' }, { value: 'PENDENTE', label: 'Pendente' }]} value={lancForm.status} onChange={(e) => setLancForm((f) => ({ ...f, status: e.target.value }))} />
          <Textarea label="Observações" value={lancForm.observacoes} onChange={(e) => setLancForm((f) => ({ ...f, observacoes: e.target.value }))} containerClassName="col-span-2" rows={2} />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Excluir Lançamento"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteLanc}>Excluir</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Tem certeza que deseja excluir o lançamento <strong>{deleteModal?.descricao}</strong>?
          </p>
        </div>
      </Modal>
    </div>
  )
}
