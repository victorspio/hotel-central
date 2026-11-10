import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, User, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { clientes as clientesApi, hospedagens as hospedagensApi } from '../services/api'
import { formatCPF, formatPhone, formatDate, formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Input, { CPFInput, PhoneInput, Textarea } from '../components/ui/Input'
import Select from '../components/ui/Select'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

const statusColor = { ATIVA: 'green', FINALIZADA: 'blue', CANCELADA: 'red' }
const statusLabel = { ATIVA: 'Ativa', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' }

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
      </div>
    </div>
  )
}

export default function ClienteDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [hospedagens, setHospedagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, hRes] = await Promise.all([
          clientesApi.getOne(id),
          hospedagensApi.list({ clienteId: id, limit: 50 })
        ])
        const c = cRes.data?.cliente || cRes.data
        setCliente(c)
        setForm({
          nome: c.nome || '',
          cpf: formatCPF(c.cpf) || '',
          rg: c.rg || '',
          dataNascimento: c.dataNascimento?.slice(0, 10) || '',
          telefone: c.telefone || '',
          email: c.email || '',
          logradouro: c.logradouro || '',
          numero: c.numero || '',
          complemento: c.complemento || '',
          bairro: c.bairro || '',
          cidade: c.cidade || '',
          estado: c.estado || '',
          cep: c.cep || '',
          observacoes: c.observacoes || ''
        })
        const list = hRes.data?.data || hRes.data?.hospedagens || []
        setHospedagens(list)
      } catch {
        toast.error('Erro ao carregar dados do cliente.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const onChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await clientesApi.update(id, {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, '')
      })
      toast.success('Cliente atualizado!')
      setEditOpen(false)
      const res = await clientesApi.getOne(id)
      setCliente(res.data?.cliente || res.data)
    } catch {
      toast.error('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const totalGasto = hospedagens.reduce((s, h) => s + (h.valorTotal || 0), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!cliente) return <p className="text-gray-500">Cliente não encontrado.</p>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{cliente.nome}</h1>
          <p className="text-sm text-gray-500">CPF: {formatCPF(cliente.cpf)}</p>
        </div>
        <Button icon={Pencil} variant="secondary" onClick={() => setEditOpen(true)}>
          Editar
        </Button>
      </div>

      {/* Client info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Dados Pessoais" className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow label="Nome completo" value={cliente.nome} icon={User} />
            <InfoRow label="CPF" value={formatCPF(cliente.cpf)} />
            <InfoRow label="RG" value={cliente.rg} />
            <InfoRow label="Data de nascimento" value={formatDate(cliente.dataNascimento)} />
            <InfoRow label="Telefone" value={formatPhone(cliente.telefone)} icon={Phone} />
            <InfoRow label="E-mail" value={cliente.email} icon={Mail} />
            {cliente.observacoes && (
              <div className="sm:col-span-2">
                <InfoRow label="Observações" value={cliente.observacoes} icon={FileText} />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {/* Summary card */}
          <Card title="Resumo">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total de estadias</span>
                <span className="font-bold text-gray-800">{hospedagens.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total gasto</span>
                <span className="font-bold text-primary-700">{formatCurrency(totalGasto)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <Badge color={cliente.ativo !== false ? 'green' : 'red'}>
                  {cliente.ativo !== false ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Address */}
          {cliente.logradouro && (
            <Card title="Endereço">
              <div className="flex gap-2 text-sm text-gray-700">
                <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{cliente.logradouro}, {cliente.numero} {cliente.complemento}</p>
                  <p>{cliente.bairro}</p>
                  <p>{cliente.cidade} – {cliente.estado}</p>
                  <p>{cliente.cep}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Hospedagens history */}
      <Card title="Histórico de Hospedagens">
        {hospedagens.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhuma hospedagem registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header">Quarto</th>
                  <th className="table-header">Entrada</th>
                  <th className="table-header">Saída</th>
                  <th className="table-header">Hóspedes</th>
                  <th className="table-header">Valor Total</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {hospedagens.map((h) => (
                  <tr
                    key={h.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/hospedagens/${h.id}`)}
                  >
                    <td className="table-cell font-medium">Quarto {h.quarto?.numero || '-'}</td>
                    <td className="table-cell">{formatDate(h.dataEntrada)}</td>
                    <td className="table-cell">{formatDate(h.dataSaida || h.previsaoSaida)}</td>
                    <td className="table-cell">{h.numHospedes}</td>
                    <td className="table-cell font-semibold">{formatCurrency(h.valorTotal)}</td>
                    <td className="table-cell">
                      <Badge color={statusColor[h.status] || 'gray'}>
                        {statusLabel[h.status] || h.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Cliente"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave}>Salvar alterações</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome completo" required value={form.nome} onChange={onChange('nome')} containerClassName="sm:col-span-2" />
            <CPFInput label="CPF" value={form.cpf} onChange={onChange('cpf')} />
            <Input label="RG" value={form.rg} onChange={onChange('rg')} />
            <DatePicker
              label="Data de Nascimento"
              value={form.dataNascimento}
              onChange={(val) => setForm((f) => ({ ...f, dataNascimento: val }))}
            />
            <PhoneInput label="Telefone" value={form.telefone} onChange={onChange('telefone')} />
            <Input label="E-mail" type="email" value={form.email} onChange={onChange('email')} containerClassName="sm:col-span-2" />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Endereço</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Logradouro" value={form.logradouro} onChange={onChange('logradouro')} containerClassName="sm:col-span-2" />
              <Input label="Número" value={form.numero} onChange={onChange('numero')} />
              <Input label="Complemento" value={form.complemento} onChange={onChange('complemento')} />
              <Input label="Bairro" value={form.bairro} onChange={onChange('bairro')} />
              <Input label="Cidade" value={form.cidade} onChange={onChange('cidade')} />
              <Select label="Estado" value={form.estado} onChange={onChange('estado')} placeholder="Selecione" options={ESTADOS_BR.map((e) => ({ value: e, label: e }))} />
              <Input label="CEP" value={form.cep} onChange={onChange('cep')} />
            </div>
          </div>
          <Textarea label="Observações" value={form.observacoes} onChange={onChange('observacoes')} rows={2} />
        </div>
      </Modal>
    </div>
  )
}
