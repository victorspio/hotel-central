import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, CreditCard, AlertTriangle } from 'lucide-react'
import { hospedagens as hospedagensApi } from '../services/api'
import { formatDate, formatDateTime, formatCurrency, calcDias } from '../utils/formatters'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'

const statusColorMap = { ATIVA: 'green', FINALIZADA: 'blue', CANCELADA: 'red' }
const statusLabelMap = { ATIVA: 'Ativa', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' }

const pgtoOptions = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' }
]

const categoriaOptions = [
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'BEBIDA', label: 'Bebida' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'LAVANDERIA', label: 'Lavanderia' },
  { value: 'OUTRO', label: 'Outro' }
]

const emptyConsumo = { descricao: '', categoria: 'ALIMENTACAO', valor: '', data: '' }
const emptyCheckout = { formaPagamento: 'PIX' }

function InfoCard({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function HospedagemDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hosp, setHosp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addConsumoOpen, setAddConsumoOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [consumoForm, setConsumoForm] = useState(emptyConsumo)
  const [checkoutForm, setCheckoutForm] = useState(emptyCheckout)
  const [savingConsumo, setSavingConsumo] = useState(false)
  const [savingCheckout, setSavingCheckout] = useState(false)
  const [deletingConsumo, setDeletingConsumo] = useState(null)

  const fetchHosp = useCallback(async () => {
    try {
      const res = await hospedagensApi.getOne(id)
      setHosp(res.data?.hospedagem || res.data)
    } catch {
      toast.error('Erro ao carregar hospedagem.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchHosp() }, [fetchHosp])

  const consumos = hosp?.consumos || []
  const dias = calcDias(hosp?.dataEntrada, hosp?.dataSaida || hosp?.previsaoSaida)
  const totalDiarias = (hosp?.quarto?.valorDiaria || 0) * dias
  const totalConsumos = consumos.reduce((s, c) => s + (c.valor || 0), 0)
  const totalGeral = totalDiarias + totalConsumos

  const handleAddConsumo = async () => {
    if (!consumoForm.descricao) return toast.error('Descrição é obrigatória.')
    if (!consumoForm.valor) return toast.error('Valor é obrigatório.')
    setSavingConsumo(true)
    try {
      await hospedagensApi.addConsumo(id, {
        ...consumoForm,
        valor: parseFloat(consumoForm.valor),
        data: consumoForm.data || new Date().toISOString().slice(0, 10)
      })
      toast.success('Consumo adicionado!')
      setAddConsumoOpen(false)
      setConsumoForm(emptyConsumo)
      fetchHosp()
    } catch {
      toast.error('Erro ao adicionar consumo.')
    } finally {
      setSavingConsumo(false)
    }
  }

  const handleRemoveConsumo = async (consumoId) => {
    setDeletingConsumo(consumoId)
    try {
      await hospedagensApi.removeConsumo(id, consumoId)
      toast.success('Consumo removido.')
      fetchHosp()
    } catch {
      toast.error('Erro ao remover consumo.')
    } finally {
      setDeletingConsumo(null)
    }
  }

  const handleCheckout = async () => {
    setSavingCheckout(true)
    try {
      await hospedagensApi.checkout(id, {
        formaPagamento: checkoutForm.formaPagamento,
        valorTotal: totalGeral
      })
      toast.success('Check-out realizado com sucesso!')
      setCheckoutOpen(false)
      fetchHosp()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao realizar check-out.')
    } finally {
      setSavingCheckout(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    )
  }

  if (!hosp) return <p className="text-gray-500">Hospedagem não encontrada.</p>

  const isAtiva = hosp.status === 'ATIVA'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">Quarto {hosp.quarto?.numero}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hosp.quarto?.predio === 'ANEXO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {hosp.quarto?.predio === 'ANEXO' ? 'Prédio Anexo' : 'Prédio Central'}
            </span>
            <Badge color={statusColorMap[hosp.status] || 'gray'} className="text-sm px-3 py-1">
              {statusLabelMap[hosp.status] || hosp.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{hosp.cliente?.nome}</p>
        </div>
        {isAtiva && (
          <Button variant="danger" icon={CreditCard} onClick={() => setCheckoutOpen(true)}>
            Realizar Check-out
          </Button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Check-in" value={formatDate(hosp.dataEntrada)} />
        <InfoCard label="Prev. Saída" value={formatDate(hosp.previsaoSaida)} />
        {hosp.dataSaida && <InfoCard label="Saída real" value={formatDate(hosp.dataSaida)} />}
        <InfoCard label="Hóspedes" value={hosp.numHospedes} />
        <InfoCard label="Diárias" value={`${dias} dia(s)`} sub={`${formatCurrency(hosp.quarto?.valorDiaria)}/dia`} />
        <InfoCard label="Total diárias" value={formatCurrency(totalDiarias)} />
        <InfoCard label="Total consumos" value={formatCurrency(totalConsumos)} />
        <InfoCard label="Total geral" value={formatCurrency(totalGeral)} />
      </div>

      {/* Consumos */}
      <Card
        title="Consumos Extras"
        action={
          isAtiva && (
            <Button size="sm" icon={Plus} onClick={() => { setConsumoForm(emptyConsumo); setAddConsumoOpen(true) }}>
              Adicionar
            </Button>
          )
        }
      >
        {consumos.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhum consumo registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header">Data</th>
                  <th className="table-header">Descrição</th>
                  <th className="table-header">Categoria</th>
                  <th className="table-header">Valor</th>
                  {isAtiva && <th className="table-header w-16">Ação</th>}
                </tr>
              </thead>
              <tbody>
                {consumos.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell">{formatDate(c.data)}</td>
                    <td className="table-cell font-medium">{c.descricao}</td>
                    <td className="table-cell">{c.categoria || '-'}</td>
                    <td className="table-cell font-semibold">{formatCurrency(c.valor)}</td>
                    {isAtiva && (
                      <td className="table-cell">
                        <button
                          onClick={() => handleRemoveConsumo(c.id)}
                          disabled={deletingConsumo === c.id}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={isAtiva ? 3 : 3} className="px-4 py-2 text-sm font-semibold text-gray-700">Total consumos</td>
                  <td className="px-4 py-2 text-sm font-bold text-gray-900">{formatCurrency(totalConsumos)}</td>
                  {isAtiva && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Observations */}
      {hosp.observacoes && (
        <Card title="Observações">
          <p className="text-sm text-gray-700">{hosp.observacoes}</p>
        </Card>
      )}

      {/* Add consumo modal */}
      <Modal
        isOpen={addConsumoOpen}
        onClose={() => setAddConsumoOpen(false)}
        title="Adicionar Consumo"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddConsumoOpen(false)}>Cancelar</Button>
            <Button loading={savingConsumo} onClick={handleAddConsumo}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Descrição"
            required
            value={consumoForm.descricao}
            onChange={(e) => setConsumoForm((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Ex: Frigobar, restaurante..."
          />
          <Select
            label="Categoria"
            options={categoriaOptions}
            value={consumoForm.categoria}
            onChange={(e) => setConsumoForm((f) => ({ ...f, categoria: e.target.value }))}
          />
          <Input
            label="Valor (R$)"
            type="number"
            min="0"
            step="0.01"
            required
            value={consumoForm.valor}
            onChange={(e) => setConsumoForm((f) => ({ ...f, valor: e.target.value }))}
            placeholder="0,00"
          />
          <DatePicker
            label="Data"
            value={consumoForm.data}
            onChange={(val) => setConsumoForm((f) => ({ ...f, data: val }))}
          />
        </div>
      </Modal>

      {/* Checkout modal */}
      <Modal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Realizar Check-out"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
            <Button variant="success" loading={savingCheckout} onClick={handleCheckout}>
              Confirmar Check-out
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{dias} diária(s) × {formatCurrency(hosp.quarto?.valorDiaria)}</span>
              <span className="font-medium">{formatCurrency(totalDiarias)}</span>
            </div>
            {consumos.map((c) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{c.descricao}</span>
                <span className="font-medium">{formatCurrency(c.valor)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-bold text-gray-800">Total a pagar</span>
              <span className="font-bold text-primary-700 text-lg">{formatCurrency(totalGeral)}</span>
            </div>
          </div>

          <Select
            label="Forma de Pagamento"
            required
            options={pgtoOptions}
            value={checkoutForm.formaPagamento}
            onChange={(e) => setCheckoutForm((f) => ({ ...f, formaPagamento: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  )
}
