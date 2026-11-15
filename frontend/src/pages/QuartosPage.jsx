import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { quartos as quartosApi } from '../services/api'
import { getStatusLabel, getStatusColor } from '../utils/formatters'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'

const predioOptions = [
  { value: 'CENTRAL', label: 'Hotel' },
  { value: 'ANEXO', label: 'Anexo' }
]

const statusOptions = [
  { value: 'LIVRE', label: 'Livre' },
  { value: 'OCUPADO', label: 'Ocupado' },
  { value: 'LIMPEZA', label: 'Limpeza' },
  { value: 'MANUTENCAO', label: 'Manutenção' }
]

const statusColorMap = {
  LIVRE: 'green',
  OCUPADO: 'red',
  LIMPEZA: 'yellow',
  MANUTENCAO: 'gray'
}

const emptyForm = {
  numero: '', predio: 'CENTRAL', capacidade: '', andar: '',
  status: 'LIVRE', descricao: ''
}

export default function QuartosPage() {
  const { isAdmin } = useAuth()
  const [list, setList] = useState(() => {
    try {
      const cached = sessionStorage.getItem('hotel_cache_quartos_list')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('hotel_cache_quartos_list'))
  const [filters, setFilters] = useState({ status: '', andar: '', predio: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback(async (page = 1) => {
    if (list.length === 0) setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (filters.status) params.status = filters.status
      if (filters.andar) params.andar = filters.andar
      if (filters.predio) params.predio = filters.predio
      const res = await quartosApi.list(params)
      const d = res.data
      const items = Array.isArray(d) ? d : (d.data || d.quartos || [])
      setList(items)
      if (page === 1 && !filters.status && !filters.andar && !filters.predio) {
        sessionStorage.setItem('hotel_cache_quartos_list', JSON.stringify(items))
      }
      const totalItems = Array.isArray(d) ? d.length : (d.total || items.length)
      setPagination({
        page: d.page || page,
        limit: d.limit || 15,
        total: totalItems,
        totalPages: d.totalPages || Math.ceil(totalItems / 15) || 1
      })
    } catch {
      toast.error('Erro ao carregar quartos.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchList(1) }, [filters])

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (q) => {
    setEditItem(q)
    setForm({
      numero: q.numero || '',
      predio: q.predio || 'CENTRAL',
      capacidade: q.capacidade !== undefined && q.capacidade !== null ? String(q.capacidade) : '',
      andar: q.andar !== undefined && q.andar !== null ? String(q.andar) : '',
      status: q.status || 'LIVRE',
      descricao: q.descricao || ''
    })
    setModalOpen(true)
  }

  const onChange = (field) => (e) => {
    const value = e.target.value
    setForm((f) => ({
      ...f,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!form.numero) return toast.error('Número do quarto é obrigatório.')
    if (!form.capacidade) return toast.error('Informe a capacidade máxima de pessoas.')
    if (!form.andar) return toast.error('Informe o andar do quarto.')
    setSaving(true)
    try {
      const payload = {
        numero: form.numero,
        predio: form.predio || 'CENTRAL',
        capacidade: parseInt(form.capacidade) || 1,
        andar: parseInt(form.andar) || 1,
        status: form.status || 'LIVRE',
        descricao: form.descricao || ''
      }
      if (editItem) {
        await quartosApi.update(editItem.id, payload)
        toast.success('Quarto atualizado!')
      } else {
        await quartosApi.create(payload)
        toast.success('Quarto criado!')
      }
      setModalOpen(false)
      fetchList(pagination.page)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar quarto.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    try {
      await quartosApi.remove(deleteModal.id)
      toast.success('Quarto excluído.')
      setDeleteModal(null)
      fetchList(pagination.page)
    } catch {
      toast.error('Erro ao excluir quarto.')
    }
  }

  const floors = [...new Set(list.map((r) => r.andar))].sort()

  const columns = [
    { key: 'numero', label: 'Número', render: (v) => <span className="font-bold text-gray-800">{v}</span> },
    {
      key: 'predio',
      label: 'Prédio',
      render: (v) => (
        <Badge color={v === 'ANEXO' ? 'purple' : 'blue'}>
          {v === 'ANEXO' ? 'Anexo' : 'Hotel'}
        </Badge>
      )
    },
    { key: 'andar', label: 'Andar', render: (v) => `${v}º` },
    { key: 'capacidade', label: 'Capacidade Máx.', render: (v) => `${v} pess.` },
    { key: 'status', label: 'Status', render: (v) => (
      <Badge color={statusColorMap[v] || 'gray'}>{getStatusLabel(v)}</Badge>
    )},
    { key: 'descricao', label: 'Descrição', render: (v) => <span className="text-xs text-gray-500 truncate max-w-xs">{v || '-'}</span> },
    { key: 'id', label: 'Ações', width: '100px', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <Pencil size={15} />
        </button>
        {isAdmin && (
          <button onClick={() => setDeleteModal(row)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    )}
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Quartos</h1>
        {isAdmin && <Button icon={Plus} onClick={openCreate}>Novo Quarto</Button>}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <Select
          options={[
            { value: '', label: 'Todos os prédios' },
            ...predioOptions
          ]}
          value={filters.predio}
          onChange={(e) => setFilters((f) => ({ ...f, predio: e.target.value }))}
          containerClassName="w-44"
        />
        <Select
          options={[{ value: '', label: 'Todos os status' }, ...statusOptions]}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          containerClassName="w-44"
        />
        <Select
          options={[{ value: '', label: 'Todos os andares' }, ...floors.map((f) => ({ value: String(f), label: `${f}º Andar` }))]}
          value={filters.andar}
          onChange={(e) => setFilters((f) => ({ ...f, andar: e.target.value }))}
          containerClassName="w-40"
        />
        <Button variant="ghost" size="sm" onClick={() => setFilters({ status: '', andar: '', predio: '' })}>
          Limpar
        </Button>
      </div>

      <Table
        columns={columns}
        data={list}
        loading={loading}
        emptyMessage="Nenhum quarto encontrado."
        pagination={pagination}
        onPageChange={(p) => fetchList(p)}
      />

      {/* Create/Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Editar Quarto' : 'Novo Quarto'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave}>{editItem ? 'Salvar' : 'Criar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Número do Quarto" required value={form.numero} onChange={onChange('numero')} placeholder="Ex: 101" />
          <Select label="Prédio" options={predioOptions} value={form.predio} onChange={onChange('predio')} />
          <Input label="Capacidade (pessoas)" type="number" min="1" value={form.capacidade} onChange={onChange('capacidade')} placeholder="Ex: 2" />
          <Input label="Andar" type="number" min="1" value={form.andar} onChange={onChange('andar')} placeholder="Ex: 1" />
          <div className="col-span-2">
            <Select label="Status" options={statusOptions} value={form.status} onChange={onChange('status')} />
          </div>
          <div className="col-span-2">
            <Input label="Descrição" value={form.descricao} onChange={onChange('descricao')} placeholder="Ex: Quarto com vista para a rua..." />
          </div>
        </div>

        {/* Info about tariffs */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          O tipo de acomodação (Simples com/sem Ar ou Completo) e os valores das diárias são definidos no momento de cadastrar a hospedagem.
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Excluir Quarto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Tem certeza que deseja excluir o <strong>Quarto {deleteModal?.numero}</strong>? Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  )
}
