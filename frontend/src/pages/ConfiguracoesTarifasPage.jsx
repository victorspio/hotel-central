import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Snowflake,
  Thermometer,
  Star,
  Save,
  Building2,
  Hotel as HotelIcon,
  Eye,
  Edit3,
  Plus,
  Users,
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react'
import { tarifasService } from '../services/tarifas'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const TARIFA_CONFIG_HOTEL = [
  {
    tipo: 'SIMPLES_SEM_AR',
    label: 'Quarto Simples',
    desc: 'Quarto simples sem ar condicionado no Hotel.',
    icon: Thermometer,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    tipo: 'COMPLETO',
    label: 'Quarto Completo',
    desc: 'Quarto completo com ar condicionado no Hotel.',
    icon: Star,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  }
]

const TARIFA_CONFIG_ANEXO = [
  {
    tipo: 'COMPLETO',
    label: 'Quarto Completo',
    desc: 'Quarto completo no Anexo.',
    icon: Star,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    tipo: 'SUITE_PREMIUM',
    label: 'Suíte Premium',
    desc: 'Suíte premium exclusiva no Anexo.',
    icon: Sparkles,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
  }
]

const PREDIOS = [
  { key: 'CENTRAL', label: 'Hotel', icon: HotelIcon, badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'ANEXO', label: 'Anexo', icon: Building2, badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' }
]

const DEFAULT_PERSON_COUNT = 5

export default function ConfiguracoesTarifasPage() {
  const { isAdmin } = useAuth()
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('TODOS') // 'TODOS' | 'CENTRAL' | 'ANEXO'

  // Modals state
  const [viewModalData, setViewModalData] = useState(null) // { tarifa, config, predio }
  const [editModalData, setEditModalData] = useState(null) // { tarifa, config, predio }
  const [editValores, setEditValores] = useState({}) // { '1': '70', '2': '100' ... }
  const [maxPessoas, setMaxPessoas] = useState(DEFAULT_PERSON_COUNT)
  const [saving, setSaving] = useState(false)

  const fetchTarifas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tarifasService.listar(undefined, true)
      const list = res.data?.data || res.data || []
      setTarifas(list)
    } catch {
      toast.error('Erro ao carregar tarifas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTarifas()
  }, [fetchTarifas])

  const findTarifa = (predioKey, tipo) => {
    if (!tarifas || tarifas.length === 0) return null
    const pk = (predioKey || 'CENTRAL').toUpperCase()
    const tp = (tipo || '').toUpperCase()
    return tarifas.find((t) => {
      const tPredio = (t.predio || 'CENTRAL').toUpperCase()
      const tTipo = (t.tipo || '').toUpperCase()
      const isPredioMatch =
        tPredio === pk ||
        (pk === 'CENTRAL' && (tPredio === 'HOTEL' || tPredio === 'CENTRAL')) ||
        (pk === 'HOTEL' && (tPredio === 'CENTRAL' || tPredio === 'HOTEL'))
      return isPredioMatch && tTipo === tp
    })
  }

  // Open View Modal
  const handleOpenView = async (predio, config) => {
    let tarifa = findTarifa(predio.key, config.tipo)
    if (!tarifa) {
      try {
        const res = await tarifasService.buscarPorTipo(config.tipo, predio.key)
        tarifa = res.data?.data || res.data
      } catch {
        // ok if null
      }
    }
    setViewModalData({ tarifa, config, predio })
  }

  // Open Edit Modal
  const handleOpenEdit = async (predio, config) => {
    let tarifa = findTarifa(predio.key, config.tipo)
    if (!tarifa) {
      try {
        const res = await tarifasService.buscarPorTipo(config.tipo, predio.key)
        tarifa = res.data?.data || res.data
      } catch {
        // ok if null
      }
    }
    const existingValores = tarifa?.valoresPorPessoa || {}

    // Find highest configured person count or use default 5
    const existingKeys = Object.keys(existingValores)
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0 && Number(existingValores[String(n)]) > 0)
    const highest = existingKeys.length > 0 ? Math.max(...existingKeys) : DEFAULT_PERSON_COUNT
    const initialCount = Math.max(DEFAULT_PERSON_COUNT, highest)
    setMaxPessoas(initialCount)

    // Populate input values
    const initialForm = {}
    for (let i = 1; i <= initialCount; i++) {
      const val = existingValores[String(i)]
      initialForm[String(i)] = val !== undefined && val !== null && Number(val) > 0 ? String(val) : ''
    }
    setEditValores(initialForm)
    setEditModalData({ tarifa, config, predio })
  }

  const handleSaveModal = async () => {
    if (!editModalData?.config || !editModalData?.predio) {
      return toast.error('Configuração de tarifa inválida.')
    }

    const cleanValores = {}
    Object.entries(editValores).forEach(([num, rawVal]) => {
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        const numVal = parseFloat(String(rawVal).replace(',', '.'))
        if (!isNaN(numVal) && numVal > 0) {
          cleanValores[num] = numVal
        }
      }
    })

    if (!cleanValores['1']) {
      return toast.error('Informe pelo menos o valor da diária para 1 pessoa.')
    }

    setSaving(true)
    try {
      const currentTarifa = editModalData.tarifa || findTarifa(editModalData.predio.key, editModalData.config.tipo)
      const tarifaId = currentTarifa?.id || 0

      await tarifasService.atualizar(tarifaId || 'salvar', {
        id: tarifaId,
        tipo: editModalData.config.tipo,
        predio: editModalData.predio.key,
        nome: `${editModalData.predio.label} - ${editModalData.config.label}`,
        valoresPorPessoa: cleanValores,
        valorPorPessoa: cleanValores['1'] || 0
      })

      toast.success(
        `Tarifas de "${editModalData.predio.label} - ${editModalData.config.label}" salvas com sucesso!`
      )
      setEditModalData(null)
      fetchTarifas()
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao salvar tarifas.'
      )
    } finally {
      setSaving(false)
    }
  }

  const prediosToRender = activeTab === 'TODOS' ? PREDIOS : PREDIOS.filter((p) => p.key === activeTab)

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <Settings size={22} className="text-primary-700" />
          </div>
          <div>
            <h1 className="page-title">Configuração de Tarifas</h1>
            <p className="text-sm text-gray-500">
              Configure o valor da diária para cada quantidade de pessoas (1, 2, 3+ pessoas) por tipo e prédio.
            </p>
          </div>
        </div>

        {/* Filter tab buttons */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'TODOS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CENTRAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'CENTRAL' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-blue-700'
            }`}
          >
            <span>🏨</span> Hotel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ANEXO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'ANEXO' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-purple-700'
            }`}
          >
            <span>🏢</span> Anexo
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Preços personalizados por quantidade de hóspedes</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            Os valores da diária aumentam gradualmente e não precisam dobrar (ex: 1 pessoa = R$ 70,00 e 2 pessoas = R$ 100,00).
            Clique no card para <strong>visualizar</strong> ou <strong>editar</strong> os valores por pessoa de cada acomodação.
          </p>
        </div>
      </div>

      {/* Predios & Cards */}
      <div className="space-y-8">
        {prediosToRender.map((predio) => (
          <div key={predio.key} className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <span className="text-2xl">{predio.key === 'ANEXO' ? '🏢' : '🏨'}</span>
              <h2 className="text-lg font-bold text-gray-800">
                Tarifas do {predio.label}
              </h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${predio.badgeColor} ml-2`}>
                {predio.label}
              </span>
            </div>

            {(() => {
              const configs = predio.key === 'ANEXO' ? TARIFA_CONFIG_ANEXO : TARIFA_CONFIG_HOTEL
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {configs.map((config) => {
                    const tarifa = findTarifa(predio.key, config.tipo)
                    const valores = tarifa?.valoresPorPessoa || {}
                    const configuredKeys = Object.keys(valores)
                      .map(Number)
                      .filter((n) => !isNaN(n) && valores[String(n)] > 0)
                      .sort((a, b) => a - b)

                    const hasValues = configuredKeys.length > 0
                    const baseValor = valores['1'] || tarifa?.valorPorPessoa || 0

                    return (
                      <div
                        key={`${predio.key}_${config.tipo}`}
                        onClick={() => {
                          if (isAdmin) handleOpenEdit(predio, config)
                          else handleOpenView(predio, config)
                        }}
                        className={`bg-white rounded-2xl border-2 ${config.borderColor} shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group`}
                      >
                        <div className="space-y-3">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2.5 rounded-xl ${config.iconBg} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                <config.icon size={22} className={config.iconColor} />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-800 text-sm">
                                  {config.label}
                                </h3>
                                <span className="text-[11px] text-gray-500 font-medium">
                                  {predio.label}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}`}>
                              {predio.label}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 line-clamp-2">
                            {config.desc}
                          </p>

                          {/* Values Preview Box */}
                          {loading ? (
                            <div className="skeleton h-16 rounded-xl" />
                          ) : (
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                              {hasValues ? (
                                <>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-xs text-gray-500">1 pessoa (base)</span>
                                    <span className="text-sm font-bold text-primary-700">
                                      {formatCurrency(baseValor)} <span className="text-[10px] font-normal text-gray-400">/dia</span>
                                    </span>
                                  </div>
                                  {valores['2'] && (
                                    <div className="flex items-baseline justify-between text-xs text-gray-600">
                                      <span>2 pessoas</span>
                                      <span className="font-semibold text-gray-800">
                                        {formatCurrency(valores['2'])} <span className="text-[10px] font-normal text-gray-400">/dia</span>
                                      </span>
                                    </div>
                                  )}
                                  <div className="pt-1 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Users size={12} className="text-gray-400" />
                                      {configuredKeys.length} faixas cadastradas
                                    </span>
                                    <span className="text-primary-600 font-medium group-hover:underline">
                                      Ver todos
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="py-2 text-center">
                                  <p className="text-xs font-medium text-amber-700">Tarifa não configurada</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">Clique para definir valores por pessoa</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons on card */}
                        <div
                          className="pt-4 mt-3 border-t border-gray-100 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenView(predio, config)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                          >
                            <Eye size={14} className="text-gray-500" />
                            Visualizar
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(predio, config)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all"
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. MODAL DE VISUALIZAÇÃO                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!viewModalData}
        onClose={() => setViewModalData(null)}
        title={`Tarifas - ${viewModalData?.predio?.label}: ${viewModalData?.config?.label}`}
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="secondary" onClick={() => setViewModalData(null)}>
              Fechar
            </Button>
            {isAdmin && (
              <Button
                variant="primary"
                icon={Edit3}
                onClick={() => {
                  const { predio, config } = viewModalData
                  setViewModalData(null)
                  handleOpenEdit(predio, config)
                }}
              >
                Editar Valores
              </Button>
            )}
          </div>
        }
      >
        {viewModalData && (() => {
          const { tarifa, config, predio } = viewModalData
          const valores = tarifa?.valoresPorPessoa || {}
          const configuredKeys = Object.keys(valores)
            .map(Number)
            .filter((n) => !isNaN(n) && valores[String(n)] > 0)
            .sort((a, b) => a - b)

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className={`p-2.5 rounded-xl ${config.iconBg}`}>
                  <config.icon size={22} className={config.iconColor} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    {predio.label} — {config.label}
                  </h4>
                  <p className="text-xs text-gray-500">{config.desc}</p>
                </div>
              </div>

              {configuredKeys.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Quantidade de Pessoas</th>
                        <th className="py-2.5 px-3 text-right">Valor da Diária</th>
                        <th className="py-2.5 px-3 text-right text-gray-500 font-medium">Por Pessoa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {configuredKeys.map((num) => {
                        const valTotal = Number(valores[String(num)])
                        const porPessoa = valTotal / num
                        return (
                          <tr key={num} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3 font-medium text-gray-800 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                {num}
                              </span>
                              <span>{num} {num === 1 ? 'pessoa' : 'pessoas'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-primary-700">
                              {formatCurrency(valTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-500">
                              {formatCurrency(porPessoa)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Users size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Nenhum valor configurado ainda</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Defina os valores por quantidade de hóspedes clicando no botão "Editar Valores".
                  </p>
                </div>
              )}

              <p className="text-[11px] text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                💡 Esses valores são aplicados automaticamente na criação da hospedagem e no fechamento da conta de acordo com a quantidade de hóspedes no quarto.
              </p>
            </div>
          )
        })()}
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL DE CONFIGURAÇÃO / EDIÇÃO                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!editModalData}
        onClose={() => !saving && setEditModalData(null)}
        title={`Configurar Tarifas - ${editModalData?.predio?.label}: ${editModalData?.config?.label}`}
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="secondary" onClick={() => setEditModalData(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" icon={Save} onClick={handleSaveModal} loading={saving}>
              Salvar Tarifas
            </Button>
          </div>
        }
      >
        {editModalData && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className={`p-2.5 rounded-xl ${editModalData.config.iconBg}`}>
                <editModalData.config.icon size={22} className={editModalData.config.iconColor} />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">
                  {editModalData.predio.label} — {editModalData.config.label}
                </h4>
                <p className="text-xs text-gray-500">
                  Defina o valor da diária para cada quantidade de pessoas no quarto.
                </p>
              </div>
            </div>

            {/* Hint */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base">💡</span>
              <p className="leading-relaxed">
                <strong>Regra de Precificação:</strong> Os valores não precisam dobrar (exemplo: 1 pessoa = R$ 70,00 e 2 pessoas = R$ 100,00). Preencha o valor total da diária correspondente a cada quantidade de hóspedes.
              </p>
            </div>

            {/* Inputs list */}
            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
              {Array.from({ length: maxPessoas }, (_, idx) => {
                const num = idx + 1
                const key = String(num)
                const currentVal = editValores[key] ?? ''
                const numVal = parseFloat(String(currentVal).replace(',', '.'))
                const isValid = !isNaN(numVal) && numVal > 0
                const porPessoa = isValid ? numVal / num : 0

                return (
                  <div
                    key={num}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-[130px]">
                      <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                        {num}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">
                          {num} {num === 1 ? 'Pessoa' : 'Pessoas'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {num === 1 ? 'Ocupação individual' : `Até ${num} hóspedes`}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                          R$
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input pl-9 text-sm"
                          placeholder={num === 1 ? 'Ex: 70,00' : num === 2 ? 'Ex: 100,00' : 'Ex: 130,00'}
                          value={currentVal}
                          onChange={(e) =>
                            setEditValores((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          disabled={saving}
                        />
                      </div>

                      <div className="min-w-[140px] text-right">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={12} />
                            {formatCurrency(porPessoa)} / pessoa
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">
                            Não configurado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Button to add more people */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setMaxPessoas((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3.5 py-2 rounded-xl transition-all"
              >
                <Plus size={14} />
                Adicionar mais pessoas ({maxPessoas + 1} pessoas)
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Footer note */}
      <p className="text-xs text-gray-400">
        * As alterações de tarifa afetarão novas hospedagens e novos check-outs. Hospedagens já finalizadas mantêm o histórico financeiro intacto.
      </p>
    </div>
  )
}