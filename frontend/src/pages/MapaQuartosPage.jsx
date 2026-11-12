import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Info, LogIn, LogOut as LogOutIcon } from 'lucide-react'
import { quartos, hospedagens } from '../services/api'
import { formatDate, formatCurrency, getStatusLabel, getStatusCardColor } from '../utils/formatters'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import toast from 'react-hot-toast'

const statusColors = {
  LIVRE: 'green',
  OCUPADO: 'red',
  LIMPEZA: 'yellow',
  MANUTENCAO: 'gray'
}

const tipoOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'SIMPLES', label: 'Simples' },
  { value: 'COMPLETO', label: 'Completo' }
]

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'LIVRE', label: 'Livre' },
  { value: 'OCUPADO', label: 'Ocupado' },
  { value: 'LIMPEZA', label: 'Limpeza' },
  { value: 'MANUTENCAO', label: 'Manutenção' }
]

export default function MapaQuartosPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [predioTab, setPredioTab] = useState('TODOS') // 'TODOS' | 'CENTRAL' | 'ANEXO'
  const [filters, setFilters] = useState({ andar: '', tipo: '', status: '' })
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [roomStay, setRoomStay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(null)

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await quartos.list({ limit: 200 })
      setRooms(res.data.data || res.data || [])
    } catch {
      toast.error('Erro ao carregar quartos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  const floors = [...new Set(rooms.map((r) => r.andar))].filter((v) => v !== undefined && v !== null).sort((a, b) => a - b)

  const filtered = rooms.filter((r) => {
    if (filters.andar && String(r.andar) !== String(filters.andar)) return false
    if (filters.tipo && r.tipo !== filters.tipo) return false
    if (filters.status && r.status !== filters.status) return false
    return true
  })

  const centralRooms = filtered.filter((r) => (r.predio || 'CENTRAL') === 'CENTRAL')
  const anexoRooms = filtered.filter((r) => r.predio === 'ANEXO')

  // Overall counts for tabs
  const allCentral = rooms.filter((r) => (r.predio || 'CENTRAL') === 'CENTRAL')
  const allAnexo = rooms.filter((r) => r.predio === 'ANEXO')

  const centralStats = {
    total: allCentral.length,
    livres: allCentral.filter((r) => r.status === 'LIVRE').length,
    ocupados: allCentral.filter((r) => r.status === 'OCUPADO').length
  }

  const anexoStats = {
    total: allAnexo.length,
    livres: allAnexo.filter((r) => r.status === 'LIVRE').length,
    ocupados: allAnexo.filter((r) => r.status === 'OCUPADO').length
  }

  const handleCardClick = async (room) => {
    setSelectedRoom(room)
    setRoomStay(null)
    if (room.status === 'OCUPADO') {
      try {
        const res = await hospedagens.list({ quartoId: room.id, status: 'ATIVA', limit: 1 })
        const list = res.data.data || res.data || []
        setRoomStay(list[0] || null)
      } catch {}
    }
    setModalOpen(true)
  }

  const handleStatusChange = async (roomId, newStatus) => {
    setChangingStatus(roomId)
    try {
      await hospedagens.updateQuartoStatus(roomId, newStatus)
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, status: newStatus } : r))
      toast.success('Status atualizado!')
    } catch {
      toast.error('Erro ao atualizar status.')
    } finally {
      setChangingStatus(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Mapa de Quartos</h1>
          <p className="text-sm text-gray-500">{filtered.length} quarto(s) exibido(s)</p>
        </div>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchRooms} loading={loading}>
          Atualizar
        </Button>
      </div>

      {/* Building Tabs Selector */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setPredioTab('TODOS')}
          className={[
            'p-3 sm:p-4 rounded-xl border text-left transition-all',
            predioTab === 'TODOS'
              ? 'border-primary-500 bg-white ring-2 ring-primary-200 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 bg-white/70'
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-bold text-gray-800">Todos os Prédios</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {rooms.length} quartos
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {rooms.filter((r) => r.status === 'LIVRE').length} livres · {rooms.filter((r) => r.status === 'OCUPADO').length} ocupados
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPredioTab('CENTRAL')}
          className={[
            'p-3 sm:p-4 rounded-xl border text-left transition-all',
            predioTab === 'CENTRAL'
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200 shadow-sm'
              : 'border-gray-200 hover:border-blue-200 bg-white/70'
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-bold text-blue-900 flex items-center gap-1.5">
              <span>🏨</span> Hotel
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {centralStats.total} quartos
            </span>
          </div>
          <p className="text-xs text-blue-700/80 mt-1">
            {centralStats.livres} livres · {centralStats.ocupados} ocupados
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPredioTab('ANEXO')}
          className={[
            'p-3 sm:p-4 rounded-xl border text-left transition-all',
            predioTab === 'ANEXO'
              ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-200 shadow-sm'
              : 'border-gray-200 hover:border-purple-200 bg-white/70'
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-bold text-purple-900 flex items-center gap-1.5">
              <span>🏢</span> Anexo
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {anexoStats.total} quartos
            </span>
          </div>
          <p className="text-xs text-purple-700/80 mt-1">
            {anexoStats.livres} livres · {anexoStats.ocupados} ocupados
          </p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <Select
          placeholder="Todos os andares"
          options={floors.map((f) => ({ value: String(f), label: `${f}º Andar` }))}
          value={filters.andar}
          onChange={(e) => setFilters((f) => ({ ...f, andar: e.target.value }))}
          containerClassName="w-40"
        />
        <Select
          options={tipoOptions}
          value={filters.tipo}
          onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
          containerClassName="w-44"
        />
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          containerClassName="w-44"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ andar: '', tipo: '', status: '' })}
        >
          Limpar filtros
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          { status: 'LIVRE', label: 'Livre', cls: 'bg-green-500' },
          { status: 'OCUPADO', label: 'Ocupado', cls: 'bg-red-500' },
          { status: 'LIMPEZA', label: 'Limpeza', cls: 'bg-yellow-400' },
          { status: 'MANUTENCAO', label: 'Manutenção', cls: 'bg-gray-400' }
        ].map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${item.cls}`} />
            <span className="text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid of rooms by building */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p>Nenhum quarto encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hotel Section */}
          {(predioTab === 'TODOS' || predioTab === 'CENTRAL') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg shadow-sm">
                    🏨
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Hotel</h2>
                    <p className="text-xs text-gray-500">Hotel · {centralRooms.length} quarto(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold border border-green-200">
                    {centralRooms.filter((r) => r.status === 'LIVRE').length} Livres
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                    {centralRooms.filter((r) => r.status === 'OCUPADO').length} Ocupados
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 font-semibold border border-yellow-200">
                    {centralRooms.filter((r) => r.status === 'LIMPEZA').length} Limpeza
                  </span>
                </div>
              </div>

              {centralRooms.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-sm">
                  Nenhum quarto no Hotel corresponde aos filtros.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {centralRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleCardClick(room)}
                      className={[
                        'rounded-xl border-2 p-3 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
                        getStatusCardColor(room.status)
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-xl font-bold text-gray-800">{room.numero}</span>
                        <Badge color={statusColors[room.status] || 'gray'}>
                          {getStatusLabel(room.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{room.tipo}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          Hotel
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{room.andar}º andar</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1">
                        {formatCurrency(room.valorDiaria)}/dia
                      </p>

                      {/* Quick status change */}
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={room.status}
                          disabled={changingStatus === room.id}
                          onChange={(e) => handleStatusChange(room.id, e.target.value)}
                          className="w-full text-xs rounded border border-gray-200 px-1.5 py-1 bg-white/80 focus:outline-none cursor-pointer"
                        >
                          <option value="LIVRE">Livre</option>
                          <option value="OCUPADO">Ocupado</option>
                          <option value="LIMPEZA">Limpeza</option>
                          <option value="MANUTENCAO">Manutenção</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prédio Anexo Section */}
          {(predioTab === 'TODOS' || predioTab === 'ANEXO') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg shadow-sm">
                    🏢
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Prédio Anexo</h2>
                    <p className="text-xs text-gray-500">Estrutura Anexa · {anexoRooms.length} quarto(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold border border-green-200">
                    {anexoRooms.filter((r) => r.status === 'LIVRE').length} Livres
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                    {anexoRooms.filter((r) => r.status === 'OCUPADO').length} Ocupados
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 font-semibold border border-yellow-200">
                    {anexoRooms.filter((r) => r.status === 'LIMPEZA').length} Limpeza
                  </span>
                </div>
              </div>

              {anexoRooms.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-sm">
                  Nenhum quarto no Prédio Anexo corresponde aos filtros.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {anexoRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleCardClick(room)}
                      className={[
                        'rounded-xl border-2 p-3 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
                        getStatusCardColor(room.status)
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-xl font-bold text-gray-800">{room.numero}</span>
                        <Badge color={statusColors[room.status] || 'gray'}>
                          {getStatusLabel(room.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{room.tipo}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          Anexo
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{room.andar}º andar</p>
                      <p className="text-xs font-semibold text-gray-700 mt-1">
                        {formatCurrency(room.valorDiaria)}/dia
                      </p>

                      {/* Quick status change */}
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={room.status}
                          disabled={changingStatus === room.id}
                          onChange={(e) => handleStatusChange(room.id, e.target.value)}
                          className="w-full text-xs rounded border border-gray-200 px-1.5 py-1 bg-white/80 focus:outline-none cursor-pointer"
                        >
                          <option value="LIVRE">Livre</option>
                          <option value="OCUPADO">Ocupado</option>
                          <option value="LIMPEZA">Limpeza</option>
                          <option value="MANUTENCAO">Manutenção</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Quarto ${selectedRoom?.numero}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Fechar
            </Button>
            {selectedRoom?.status === 'LIVRE' && (
              <Button
                variant="primary"
                size="sm"
                icon={LogIn}
                onClick={() => {
                  setModalOpen(false)
                  navigate(`/hospedagens/nova?quartoId=${selectedRoom.id}`)
                }}
              >
                Check-in
              </Button>
            )}
            {selectedRoom?.status === 'OCUPADO' && roomStay && (
              <Button
                variant="danger"
                size="sm"
                icon={LogOutIcon}
                onClick={() => {
                  setModalOpen(false)
                  navigate(`/hospedagens/${roomStay.id}`)
                }}
              >
                Ver hospedagem
              </Button>
            )}
          </>
        }
      >
        {selectedRoom && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge color={statusColors[selectedRoom.status] || 'gray'} className="text-sm px-3 py-1">
                {getStatusLabel(selectedRoom.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Prédio</p>
                <p className="font-semibold text-gray-800">
                  {selectedRoom.predio === 'ANEXO' ? '🏢 Anexo' : '🏨 Hotel'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Tipo</p>
                <p className="font-semibold text-gray-800">{selectedRoom.tipo}</p>
              </div>
              <div>
                <p className="text-gray-500">Andar</p>
                <p className="font-semibold text-gray-800">{selectedRoom.andar}º</p>
              </div>
              <div>
                <p className="text-gray-500">Capacidade</p>
                <p className="font-semibold text-gray-800">{selectedRoom.capacidade} pessoa(s)</p>
              </div>
              <div>
                <p className="text-gray-500">Diária</p>
                <p className="font-semibold text-gray-800">{formatCurrency(selectedRoom.valorDiaria)}</p>
              </div>
            </div>

            {selectedRoom.descricao && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Descrição</p>
                <p className="text-sm text-gray-700">{selectedRoom.descricao}</p>
              </div>
            )}

            {selectedRoom.status === 'OCUPADO' && roomStay && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200 space-y-2">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Hospedagem atual</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Hóspede</p>
                    <p className="font-medium text-gray-800">{roomStay.cliente?.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Check-in</p>
                    <p className="font-medium text-gray-800">{formatDate(roomStay.dataEntrada)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Previsão saída</p>
                    <p className="font-medium text-gray-800">{formatDate(roomStay.previsaoSaida)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Hóspedes</p>
                    <p className="font-medium text-gray-800">{roomStay.numHospedes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
