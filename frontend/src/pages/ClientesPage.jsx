import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Eye, Pencil, Trash2, AlertTriangle,
  User, Phone, Mail, MapPin, Calendar, BedDouble, FileText, X
} from 'lucide-react'
import { clientes as clientesApi } from '../services/api'
import { formatCPF, formatPhone, formatDate, formatCurrency } from '../utils/formatters'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input, { CPFInput, PhoneInput, Textarea } from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

const emptyForm = {
  nome: '', cpf: '', rg: '', dataNascimento: '', telefone: '', email: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '',
  observacoes: ''
}

function ClienteForm({ form, onChange, onSubmit }) {
  return (
    <form id="form-cadastro-cliente" onSubmit={onSubmit} className="space-y-5" autoComplete="on">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="cad-nome"
          name="nome"
          autoComplete="name"
          label="Nome completo"
          required
          value={form.nome}
          onChange={onChange('nome')}
          placeholder="Nome do hóspede"
          containerClassName="sm:col-span-2"
        />
        <CPFInput
          id="cad-cpf"
          name="cpf"
          autoComplete="off"
          label="CPF"
          value={form.cpf}
          onChange={onChange('cpf')}
          required
        />
        <Input
          id="cad-rg"
          name="rg"
          autoComplete="off"
          label="RG"
          value={form.rg}
          onChange={onChange('rg')}
          placeholder="00.000.000-0"
        />
        <DatePicker
          label="Data de Nascimento"
          value={form.dataNascimento}
          onChange={(val) => onChange('dataNascimento')({ target: { value: val } })}
          max={new Date()}
        />
        <PhoneInput
          id="cad-telefone"
          name="telefone"
          autoComplete="tel"
          label="Telefone"
          value={form.telefone}
          onChange={onChange('telefone')}
        />
        <Input
          id="cad-email"
          name="email"
          autoComplete="email"
          label="E-mail"
          type="email"
          value={form.email}
          onChange={onChange('email')}
          placeholder="email@exemplo.com"
          containerClassName="sm:col-span-2"
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Endereço</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="cad-logradouro"
            name="logradouro"
            autoComplete="street-address"
            label="Logradouro"
            value={form.logradouro}
            onChange={onChange('logradouro')}
            placeholder="Rua, Av..."
            containerClassName="sm:col-span-2"
          />
          <Input id="cad-numero" name="numero" autoComplete="address-line2" label="Número" value={form.numero} onChange={onChange('numero')} />
          <Input id="cad-complemento" name="complemento" autoComplete="off" label="Complemento" value={form.complemento} onChange={onChange('complemento')} />
          <Input id="cad-bairro" name="bairro" autoComplete="address-level3" label="Bairro" value={form.bairro} onChange={onChange('bairro')} />
          <Input id="cad-cidade" name="cidade" autoComplete="address-level2" label="Cidade" value={form.cidade} onChange={onChange('cidade')} />
          <Select
            id="cad-estado"
            name="estado"
            label="Estado"
            value={form.estado}
            onChange={onChange('estado')}
            placeholder="Selecione"
            options={ESTADOS_BR.map((e) => ({ value: e, label: e }))}
          />
          <Input id="cad-cep" name="cep" autoComplete="postal-code" label="CEP" value={form.cep} onChange={onChange('cep')} placeholder="00000-000" />
        </div>
      </div>

      <Textarea id="cad-observacoes" name="observacoes" label="Observações" value={form.observacoes} onChange={onChange('observacoes')} rows={2} />
    </form>
  )
}

export default function ClientesPage() {
  const { isAdmin } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  
  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Modal de Detalhes
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewCliente, setViewCliente] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const debounceRef = useRef(null)

  const fetchList = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (q) params.search = q
      const res = await clientesApi.list(params)
      const d = res.data
      setList(d.data || d.clientes || [])
      setPagination({
        page: d.page || page,
        limit: d.limit || 15,
        total: d.total || 0,
        totalPages: d.totalPages || 1
      })
    } catch {
      toast.error('Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchList(1)
  }, [])

  const handleSearch = (val) => {
    // Prevent browser autofill from contaminating the background search when a modal is open
    if (modalOpen || viewModalOpen || deleteModal) return
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchList(1, val), 350)
  }

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (cliente) => {
    setEditItem(cliente)
    setForm({
      nome: cliente.nome || '',
      cpf: formatCPF(cliente.cpf) || '',
      rg: cliente.rg || '',
      dataNascimento: cliente.dataNascimento?.slice(0, 10) || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      logradouro: cliente.logradouro || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
      observacoes: cliente.observacoes || ''
    })
    setModalOpen(true)
  }

  const openView = async (cliente) => {
    setViewModalOpen(true)
    setViewCliente(cliente)
    setLoadingDetails(true)
    try {
      const res = await clientesApi.getOne(cliente.id)
      setViewCliente(res.data)
    } catch {
      toast.error('Erro ao carregar detalhes do cliente.')
    } finally {
      setLoadingDetails(false)
    }
  }

  const onChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório.')
    if (!form.cpf.trim()) return toast.error('CPF é obrigatório.')
    setSaving(true)
    try {
      const payload = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : null
      }
      if (editItem) {
        await clientesApi.update(editItem.id, payload)
        toast.success('Cliente atualizado com sucesso!')
      } else {
        await clientesApi.create(payload)
        toast.success('Cliente cadastrado com sucesso!')
      }
      setModalOpen(false)
      fetchList(pagination.page)
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao salvar cliente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      await clientesApi.remove(deleteModal.id)
      toast.success('Cliente excluído permanentemente!')
      setDeleteModal(null)
      fetchList(pagination.page)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao excluir cliente.')
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (v, row) => (
        <button
          onClick={() => openView(row)}
          className="text-primary-600 hover:text-primary-800 hover:underline font-semibold text-left transition-colors"
        >
          {v}
        </button>
      )
    },
    { key: 'cpf', label: 'CPF', render: (v) => formatCPF(v) },
    { key: 'telefone', label: 'Telefone', render: (v) => formatPhone(v) },
    { key: 'email', label: 'E-mail', render: (v) => v || '-' },
    { key: 'cidade', label: 'Cidade / UF', render: (_, r) => (r.cidade ? `${r.cidade}${r.estado ? ` - ${r.estado}` : ''}` : '-') },
    {
      key: 'id',
      label: 'Ações',
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openView(row)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Visualizar Informações"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setDeleteModal(row)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Excluir Permanentemente"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerenciamento completo de hóspedes</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Novo Cliente</Button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            name="search_cliente_filter"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="other"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => handleSearch('')}>
            Limpar Busca
          </Button>
        )}
      </div>

      {/* Tabela de Clientes */}
      <Table
        columns={columns}
        data={list}
        loading={loading}
        emptyMessage="Nenhum cliente cadastrado."
        pagination={pagination}
        onPageChange={(p) => fetchList(p)}
      />

      {/* Modal de Detalhes do Cliente */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Ficha do Cliente"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              onClick={() => {
                const c = viewCliente
                setViewModalOpen(false)
                openEdit(c)
              }}
            >
              <Pencil size={15} className="mr-1.5" />
              Editar Dados
            </Button>
            <Button variant="primary" onClick={() => setViewModalOpen(false)}>
              Fechar
            </Button>
          </div>
        }
      >
        {viewCliente && (
          <div className="space-y-6">
            {/* Cabeçalho do Cliente */}
            <div className="flex items-center gap-4 p-4 bg-primary-50/70 border border-primary-100 rounded-xl">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {viewCliente.nome?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">{viewCliente.nome}</h3>
                <p className="text-xs text-gray-500">
                  Cadastrado em {formatDate(viewCliente.createdAt)}
                </p>
              </div>
            </div>

            {/* Informações Pessoais e Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-gray-50 rounded-lg space-y-2">
                <span className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1.5">
                  <User size={14} className="text-primary-600" />
                  Documentos & Pessoal
                </span>
                <p className="text-sm text-gray-700"><strong>CPF:</strong> {formatCPF(viewCliente.cpf)}</p>
                <p className="text-sm text-gray-700"><strong>RG:</strong> {viewCliente.rg || 'Não informado'}</p>
                <p className="text-sm text-gray-700">
                  <strong>Nascimento:</strong> {viewCliente.dataNascimento ? formatDate(viewCliente.dataNascimento) : 'Não informada'}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-lg space-y-2">
                <span className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1.5">
                  <Phone size={14} className="text-primary-600" />
                  Contato
                </span>
                <p className="text-sm text-gray-700"><strong>Telefone:</strong> {formatPhone(viewCliente.telefone)}</p>
                <p className="text-sm text-gray-700"><strong>E-mail:</strong> {viewCliente.email || 'Não informado'}</p>
              </div>
            </div>

            {/* Endereço */}
            <div className="p-3.5 bg-gray-50 rounded-lg space-y-1.5">
              <span className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1.5 mb-2">
                <MapPin size={14} className="text-primary-600" />
                Endereço
              </span>
              <p className="text-sm text-gray-700">
                {viewCliente.logradouro ? (
                  <>
                    {viewCliente.logradouro}
                    {viewCliente.numero ? `, nº ${viewCliente.numero}` : ''}
                    {viewCliente.complemento ? ` (${viewCliente.complemento})` : ''}
                    <br />
                    {viewCliente.bairro ? `${viewCliente.bairro} — ` : ''}
                    {viewCliente.cidade || ''}
                    {viewCliente.estado ? `/${viewCliente.estado}` : ''}
                    {viewCliente.cep ? ` • CEP: ${viewCliente.cep}` : ''}
                  </>
                ) : (
                  <span className="text-gray-400">Nenhum endereço informado</span>
                )}
              </p>
            </div>

            {/* Observações */}
            {viewCliente.observacoes && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-lg">
                <span className="text-xs font-semibold uppercase text-amber-800 flex items-center gap-1.5 mb-1">
                  <FileText size={14} />
                  Observações
                </span>
                <p className="text-sm text-amber-900 whitespace-pre-line">{viewCliente.observacoes}</p>
              </div>
            )}

            {/* Histórico de Hospedagens */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <BedDouble size={16} className="text-primary-600" />
                Histórico de Hospedagens
              </h4>

              {loadingDetails ? (
                <div className="py-6 text-center text-sm text-gray-400">Carregando histórico...</div>
              ) : !viewCliente.hospedagens || viewCliente.hospedagens.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-lg">
                  Nenhuma hospedagem registrada para este cliente.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="py-2.5 px-3">Quarto</th>
                        <th className="py-2.5 px-3">Entrada</th>
                        <th className="py-2.5 px-3">Saída</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewCliente.hospedagens.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-semibold text-gray-800">
                            Quarto {h.quarto?.numero} <span className="text-xs text-gray-400 font-normal">({h.quarto?.tipo})</span>
                          </td>
                          <td className="py-2 px-3 text-gray-600">{formatDate(h.dataEntrada)}</td>
                          <td className="py-2 px-3 text-gray-600">{h.dataSaida ? formatDate(h.dataSaida) : formatDate(h.previsaoSaida)}</td>
                          <td className="py-2 px-3">
                            <Badge color={h.status === 'ATIVA' ? 'green' : h.status === 'FINALIZADA' ? 'blue' : 'gray'}>
                              {h.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-gray-900">
                            {h.valorTotal ? formatCurrency(h.valorTotal) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Criação / Edição */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>
              {editItem ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </>
        }
      >
        <ClienteForm form={form} onChange={onChange} onSubmit={handleSave} />
      </Modal>

      {/* Modal de Exclusão Real */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Excluir Cliente Permanentemente"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Excluir Definitivamente
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Tem certeza que deseja excluir o cliente <strong>{deleteModal?.nome}</strong>?
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              ⚠️ O registro será apagado definitivamente do banco de dados. Esta ação não poderá ser desfeita.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
