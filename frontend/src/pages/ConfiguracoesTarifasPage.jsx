import React, { useState, useEffect, useCallback } from 'react'
import { Settings, Snowflake, Thermometer, Star, Save } from 'lucide-react'
import { tarifasService } from '../services/tarifas'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import toast from 'react-hot-toast'

const TARIFA_CONFIG = [
  {
    tipo: 'SIMPLES_SEM_AR',
    label: 'Simples Sem Ar Condicionado',
    desc: 'Quartos simples sem ar condicionado. Valor cobrado por pessoa por diária.',
    icon: Thermometer,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200'
  },
  {
    tipo: 'SIMPLES_COM_AR',
    label: 'Simples Com Ar Condicionado',
    desc: 'Quartos simples com ar condicionado. Valor cobrado por pessoa por diária.',
    icon: Snowflake,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  },
  {
    tipo: 'COMPLETO',
    label: 'Completo',
    desc: 'Quartos completos com todos os benefícios incluídos. Valor cobrado por pessoa por diária.',
    icon: Star,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200'
  }
]

export default function ConfiguracoesTarifasPage() {
  const { isAdmin } = useAuth()
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState({})

  const fetchTarifas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tarifasService.listar()
      const list = res.data?.data || res.data || []
      setTarifas(list)
      const vals = {}
      list.forEach((t) => { vals[t.tipo] = String(t.valorPorPessoa ?? '') })
      setValues(vals)
    } catch {
      toast.error('Erro ao carregar tarifas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTarifas() }, [fetchTarifas])

  const handleSave = async (config) => {
    const tarifa = tarifas.find((t) => t.tipo === config.tipo)
    if (!tarifa) return toast.error('Tarifa não encontrada.')
    const valor = parseFloat(values[config.tipo])
    if (isNaN(valor) || valor < 0) return toast.error('Valor inválido.')

    setSaving((s) => ({ ...s, [config.tipo]: true }))
    try {
      await tarifasService.atualizar(tarifa.id, { valorPorPessoa: valor })
      toast.success(`Tarifa "${config.label}" atualizada com sucesso!`)
      fetchTarifas()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar tarifa.')
    } finally {
      setSaving((s) => ({ ...s, [config.tipo]: false }))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary-100 rounded-xl">
          <Settings size={22} className="text-primary-700" />
        </div>
        <div>
          <h1 className="page-title">Configuração de Tarifas</h1>
          <p className="text-sm text-gray-500">
            Configure os valores cobrados por pessoa por diária para cada tipo de quarto.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Como funciona a precificação?</p>
        <p>O valor total de uma hospedagem é calculado como: <strong>Tarifa × Nº de Hóspedes × Nº de Diárias</strong>. Cada tipo de quarto possui sua própria tarifa por pessoa/noite.</p>
      </div>

      {/* Tarifa cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TARIFA_CONFIG.map((config) => {
          const tarifa = tarifas.find((t) => t.tipo === config.tipo)
          const isSaving = saving[config.tipo]

          return (
            <div key={config.tipo} className={`bg-white rounded-2xl border-2 ${config.borderColor} shadow-sm p-5 flex flex-col gap-4`}>
              {/* Icon + Title */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${config.iconBg} flex-shrink-0`}>
                  <config.icon size={22} className={config.iconColor} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight">{config.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{config.desc}</p>
                </div>
              </div>

              {/* Current value display */}
              {loading ? (
                <div className="skeleton h-8 rounded-lg" />
              ) : (
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <p className="text-xs text-gray-500">Valor atual</p>
                  <p className="font-bold text-gray-800 text-lg">
                    {tarifa ? `${formatCurrency(tarifa.valorPorPessoa)} / pessoa / noite` : 'Não configurado'}
                  </p>
                </div>
              )}

              {/* Edit field */}
              {isAdmin ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Novo valor (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input pl-9"
                        value={values[config.tipo] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [config.tipo]: e.target.value }))}
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
                    onClick={() => handleSave(config)}
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Apenas administradores podem editar tarifas.</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400">
        * As alterações de tarifa afetarão apenas novas hospedagens. Hospedagens em andamento não serão recalculadas automaticamente.
      </p>
    </div>
  )
}
