import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, User, BedDouble, Calendar, ChevronRight, Check } from 'lucide-react'
import { clientes as clientesApi, quartos as quartosApi, hospedagens as hospedagensApi } from '../services/api'
import { formatCurrency, formatDate, formatCPF, formatPhone } from '../utils/formatters'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STEPS = [
  { num: 1, label: 'Cliente', icon: User },
  { num: 2, label: 'Quarto', icon: BedDouble },
  { num: 3, label: 'Detalhes', icon: Calendar }
]

const tipoLabel = { SOLTEIRO: 'Solteiro', CASAL: 'Casal', SUITE: 'Suíte', FAMILIA: 'Família' }

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center">
            <div className={[
              'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all',
              current > step.num ? 'bg-green-500 text-white' :
              current === step.num ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
              'bg-gray-200 text-gray-500'
            ].join(' ')}>
              {current > step.num ? <Check size={16} /> : step.num}
            </div>
            <span className={`text-xs mt-1.5 font-medium ${current === step.num ? 'text-primary-700' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 ${current > idx + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function NovaHospedagemPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedRoomId = searchParams.get('quartoId')

  const [step, setStep] = useState(1)
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [selectedQuarto, setSelectedQuarto] = useState(null)
  const [form, setForm] = useState({
    dataEntrada: format(new Date(), 'yyyy-MM-dd'),
    previsaoSaida: '',
    numHospedes: '1',
    observacoes: ''
  })
  const [saving, setSaving] = useState(false)

  // Step 1 — client search
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteResults, setClienteResults] = useState([])
  const [searchingCliente, setSearchingCliente] = useState(false)
  const debounceRef = useRef(null)

  const searchClientes = useCallback(async (q) => {
    if (!q || q.length < 2) { setClienteResults([]); return }
    setSearchingCliente(true)
    try {
      const res = await clientesApi.list({ search: q, limit: 8 })
      setClienteResults(res.data.data || res.data.clientes || [])
    } catch {}
    finally { setSearchingCliente(false) }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchClientes(clienteSearch), 350)
  }, [clienteSearch, searchClientes])

  // Step 2 — available rooms
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [predioFilter, setPredioFilter] = useState('TODOS')

  useEffect(() => {
    if (step === 2) {
      setLoadingRooms(true)
      quartosApi.list({ status: 'LIVRE', limit: 100 })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data.data || res.data.quartos || [])
          setRooms(list)
          if (preselectedRoomId) {
            const found = list.find((r) => String(r.id) === preselectedRoomId)
            if (found) setSelectedQuarto(found)
          }
        })
        .catch(() => toast.error('Erro ao carregar quartos.'))
        .finally(() => setLoadingRooms(false))
    }
  }, [step, preselectedRoomId])

  const countCentral = rooms.filter((r) => (r.predio || 'CENTRAL') === 'CENTRAL').length
  const countAnexo = rooms.filter((r) => r.predio === 'ANEXO').length

  const filteredRooms = rooms.filter((r) => {
    if (predioFilter === 'CENTRAL') return (r.predio || 'CENTRAL') === 'CENTRAL'
    if (predioFilter === 'ANEXO') return r.predio === 'ANEXO'
    return true
  })

  const estimatedDias = (() => {
    if (!form.dataEntrada || !form.previsaoSaida) return 0
    const a = new Date(form.dataEntrada)
    const b = new Date(form.previsaoSaida)
    const d = Math.round((b - a) / 86400000)
    return d > 0 ? d : 0
  })()

  const estimatedTotal = selectedQuarto ? estimatedDias * selectedQuarto.valorDiaria : 0

  const handleSubmit = async () => {
    if (!selectedCliente) return toast.error('Selecione um cliente.')
    if (!selectedQuarto) return toast.error('Selecione um quarto.')
    if (!form.previsaoSaida) return toast.error('Informe a previsão de saída.')

    setSaving(true)
    try {
      const res = await hospedagensApi.create({
        clienteId: selectedCliente.id,
        quartoId: selectedQuarto.id,
        dataEntrada: form.dataEntrada,
        previsaoSaida: form.previsaoSaida,
        numHospedes: parseInt(form.numHospedes),
        observacoes: form.observacoes
      })
      const created = res.data?.hospedagem || res.data
      toast.success('Check-in realizado com sucesso!')
      navigate(`/hospedagens/${created.id}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao realizar check-in.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">Nova Hospedagem</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <StepIndicator current={step} />

        {/* Step 1 — Select client */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="section-title">Selecionar Cliente</h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="form-input pl-9"
                placeholder="Buscar por nome, CPF ou e-mail..."
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                autoFocus
              />
            </div>

            {searchingCliente && (
              <div className="text-center py-4 text-gray-400 text-sm">Buscando...</div>
            )}

            {clienteResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {clienteResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCliente(c); setClienteSearch(''); setClienteResults([]) }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{c.nome}</p>
                      <p className="text-xs text-gray-500">CPF: {formatCPF(c.cpf)}{c.telefone ? ` · ${formatPhone(c.telefone)}` : ''}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {selectedCliente && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary-800">{selectedCliente.nome}</p>
                  <p className="text-sm text-primary-600">CPF: {formatCPF(selectedCliente.cpf)}</p>
                </div>
                <button onClick={() => setSelectedCliente(null)} className="text-primary-400 hover:text-primary-600 text-xs underline">
                  Trocar
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button disabled={!selectedCliente} onClick={() => setStep(2)}>
                Próximo — Selecionar Quarto <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Select room */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="section-title">Selecionar Quarto (apenas livres)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Escolha o prédio onde o hóspede irá se hospedar:</p>
            </div>

            {/* Building Selection Toggle */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setPredioFilter('TODOS')}
                className={[
                  'p-2.5 sm:p-3 rounded-xl border text-center transition-all',
                  predioFilter === 'TODOS'
                    ? 'border-primary-500 bg-primary-50/80 text-primary-900 ring-2 ring-primary-200 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                ].join(' ')}
              >
                <div className="text-xs sm:text-sm font-bold">Todos os Prédios</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{rooms.length} livres</div>
              </button>

              <button
                type="button"
                onClick={() => setPredioFilter('CENTRAL')}
                className={[
                  'p-2.5 sm:p-3 rounded-xl border text-center transition-all',
                  predioFilter === 'CENTRAL'
                    ? 'border-blue-500 bg-blue-50/90 text-blue-900 ring-2 ring-blue-200 font-semibold'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700 bg-white'
                ].join(' ')}
              >
                <div className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1">
                  <span>🏨</span> Prédio Central
                </div>
                <div className="text-[11px] text-blue-600 font-medium mt-0.5">{countCentral} livres</div>
              </button>

              <button
                type="button"
                onClick={() => setPredioFilter('ANEXO')}
                className={[
                  'p-2.5 sm:p-3 rounded-xl border text-center transition-all',
                  predioFilter === 'ANEXO'
                    ? 'border-purple-500 bg-purple-50/90 text-purple-900 ring-2 ring-purple-200 font-semibold'
                    : 'border-gray-200 hover:border-purple-300 text-gray-700 bg-white'
                ].join(' ')}
              >
                <div className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1">
                  <span>🏢</span> Prédio Anexo
                </div>
                <div className="text-[11px] text-purple-600 font-medium mt-0.5">{countAnexo} livres</div>
              </button>
            </div>

            {loadingRooms ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p>Nenhum quarto disponível {predioFilter !== 'TODOS' ? `no ${predioFilter === 'CENTRAL' ? 'Prédio Central' : 'Prédio Anexo'}` : ''}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                {filteredRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedQuarto(r)}
                    className={[
                      'p-3 rounded-xl border-2 text-left transition-all relative',
                      selectedQuarto?.id === r.id
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200 shadow-sm'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-xl font-bold text-gray-800">{r.numero}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.predio === 'ANEXO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.predio === 'ANEXO' ? 'Anexo' : 'Central'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{tipoLabel[r.tipo] || r.tipo}</p>
                    <p className="text-xs text-gray-500">{r.andar}º andar · {r.capacidade} pess.</p>
                    <p className="text-xs font-semibold text-primary-700 mt-1">{formatCurrency(r.valorDiaria)}/dia</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
              <Button disabled={!selectedQuarto} onClick={() => setStep(3)}>
                Próximo — Detalhes <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="section-title">Detalhes da Hospedagem</h2>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Data de Entrada"
                required
                value={form.dataEntrada}
                onChange={(val) => setForm((f) => ({ ...f, dataEntrada: val }))}
              />
              <DatePicker
                label="Previsão de Saída"
                required
                value={form.previsaoSaida}
                min={form.dataEntrada}
                onChange={(val) => setForm((f) => ({ ...f, previsaoSaida: val }))}
              />
            </div>

            <Input
              label="Número de Hóspedes"
              type="number"
              min="1"
              max={selectedQuarto?.capacidade}
              value={form.numHospedes}
              onChange={(e) => setForm((f) => ({ ...f, numHospedes: e.target.value }))}
            />

            <Textarea
              label="Observações"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              placeholder="Pedidos especiais, anotações..."
            />

            {/* Summary */}
            {selectedQuarto && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">Resumo</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium">{selectedCliente?.nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quarto</span>
                  <span className="font-medium">
                    Quarto {selectedQuarto.numero} · {tipoLabel[selectedQuarto.tipo] || selectedQuarto.tipo} ({selectedQuarto.predio === 'ANEXO' ? 'Prédio Anexo' : 'Prédio Central'})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Período</span>
                  <span className="font-medium">{estimatedDias} diária(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Diária</span>
                  <span className="font-medium">{formatCurrency(selectedQuarto.valorDiaria)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-800">Total estimado</span>
                  <span className="font-bold text-primary-700 text-lg">{formatCurrency(estimatedTotal)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Voltar</Button>
              <Button loading={saving} onClick={handleSubmit} variant="success">
                Confirmar Check-in
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
