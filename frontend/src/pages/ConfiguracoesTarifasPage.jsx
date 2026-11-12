import React, { useState, useEffect, useCallback } from 'react'
import { Settings, Snowflake, Thermometer, Star, Save, Building2, Hotel as HotelIcon } from 'lucide-react'
import { tarifasService } from '../services/tarifas'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

const TARIFA_CONFIG = [
  {
    tipo: 'SIMPLES_SEM_AR',
    label: 'Simples Sem Ar',
    desc: 'Sem ar condicionado. Cobrado por pessoa por diária.',
    icon: Thermometer,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200'
  },
  {
    tipo: 'SIMPLES_COM_AR',
    label: 'Simples Com Ar',
    desc: 'Com ar condicionado. Cobrado por pessoa por diária.',
    icon: Snowflake,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  },
  {
    tipo: 'COMPLETO',
    label: 'Completo',
    desc: 'Com todos os benefícios. Cobrado por pessoa por diária.',
    icon: Star,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200'
  }
]

const PREDIOS = [
  { key: 'CENTRAL', label: 'Hotel', icon: HotelIcon, badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'ANEXO', label: 'Anexo', icon: Building2, badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' }
]

export default function ConfiguracoesTarifasPage() {
  const { isAdmin } = useAuth()
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState({})
  const [activeTab, setActiveTab] = useState('TODOS') // 'TODOS' | 'CENTRAL' | 'ANEXO'

  const fetchTarifas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tarifasService.listar()
      const list = res.data?.data || res.data || []
      setTarifas(list)
      const vals = {}
      list.forEach((t) => {
        const key = `${t.predio || 'CENTRAL'}_${t.tipo}`
        vals[key] = String(t.valorPorPessoa ?? '')
      })
      setValues(vals)
    } catch {
      toast.error('Erro ao carregar tarifas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTarifas() }, [fetchTarifas])

  const handleSave = async (predioKey, config) => {
    const tarifa = tarifas.find((t) => (t.predio || 'CENTRAL') === predioKey && t.tipo === config.tipo)
    if (!tarifa) return toast.error('Tarifa não encontrada.')

    const valKey = `${predioKey}_${config.tipo}`
    const valor = parseFloat(values[valKey])
    if (isNaN(valor) || valor < 0) return toast.error('Valor inválido.')

    setSaving((s) => ({ ...s, [valKey]: true }))
    try {
      await tarifasService.atualizar(tarifa.id, { valorPorPessoa: valor })
      const predioLabel = predioKey === 'ANEXO' ? 'Anexo' : 'Hotel'
      toast.success(`Tarifa "${predioLabel} - ${config.label}" salva com sucesso!`)
      fetchTarifas()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar tarifa.')
    } finally {
      setSaving((s) => ({ ...s, [valKey]: false }))
    }
  }

  const prediosToRender = activeTab === 'TODOS' ? PREDIOS : PREDIOS.filter((p) => p.key === activeTab)

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <Settings size={22} className="text-primary-700" />
          </div>
          <div>
            <h1 className="page-title">Configuração de Tarifas</h1>
            <p className="text-sm text-gray-500">
              Configure os valores cobrados por pessoa por diária para o Hotel e para o Anexo.
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
        <span className="text-xl">💡</span>
        <div>
          <p className="font-semibold mb-0.5">Precificação por Prédio e por Pessoa</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            As diárias do <strong>Hotel</strong> e do <strong>Anexo</strong> podem ter valores diferentes. O valor da hospedagem é calculado como:{' '}
            <strong>Tarifa (do Prédio/Tipo) × Nº de Hóspedes × Nº de Diárias</strong>.
          </p>
        </div>
      </div>

      {/* Sections for each Predio */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TARIFA_CONFIG.map((config) => {
                const tarifa = tarifas.find(
                  (t) => (t.predio || 'CENTRAL') === predio.key && t.tipo === config.tipo
                )
                const valKey = `${predio.key}_${config.tipo}`
                const isSaving = saving[valKey]

                return (
                  <div
                    key={valKey}
                    className={`bg-white rounded-2xl border-2 ${config.borderColor} shadow-sm p-5 flex flex-col gap-4`}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${config.iconBg} flex-shrink-0`}>
                        <config.icon size={22} className={config.iconColor} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                          {config.label}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{config.desc}</p>
                      </div>
                    </div>

                    {/* Current value display */}
                    {loading ? (
                      <div className="skeleton h-8 rounded-lg" />
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-500">Valor atual no {predio.label}</p>
                        <p className="font-bold text-gray-800 text-base">
                          {tarifa && tarifa.valorPorPessoa > 0
                            ? `${formatCurrency(tarifa.valorPorPessoa)} / pessoa / noite`
                            : 'R$ 0,00 (Não configurado)'}
                        </p>
                      </div>
                    )}

                    {/* Edit field */}
                    {isAdmin ? (
                      <div className="space-y-3 mt-auto">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">
                            Novo valor no {predio.label} (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                              R$
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input pl-9"
                              value={values[valKey] ?? ''}
                              onChange={(e) =>
                                setValues((v) => ({ ...v, [valKey]: e.target.value }))
                              }
                              placeholder="0,00"
                              disabled={loading}
                            />
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          size="sm"
                          icon={Save}
                          loading={isSaving}
                          disabled={loading}
                          onClick={() => handleSave(predio.key, config)}
                        >
                          Salvar no {predio.label}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Apenas administradores podem editar tarifas.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400">
        * As alterações de tarifa afetarão apenas novos cadastros e check-outs. Hospedagens já finalizadas mantêm o histórico salvo.
      </p>
    </div>
  )
}
