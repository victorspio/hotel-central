import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  BedDouble,
  CheckCircle,
  LogOut,
  DollarSign,
  ArrowRight
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { dashboard } from '../services/api'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

function StatCard({ title, value, sub, icon: Icon, iconColor, change }) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${iconColor}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        {change !== undefined && (
          <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change}% vs ontem
          </span>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton h-5 w-24 mb-3 rounded" />
      <div className="skeleton h-8 w-16 rounded" />
    </div>
  )
}

const statusColorMap = {
  ATIVA: 'green',
  FINALIZADA: 'blue',
  CANCELADA: 'red'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await dashboard.get()
      setData(res.data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Erro ao carregar dashboard', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const stats = data?.resumo || data || {}
  const ocupacaoData = data?.ocupacaoUltimos30Dias || []
  const fluxoData = (data?.fluxoCaixa || data?.receitaMensal || []).map((item) => ({
    ...item,
    mes: item.mesLabel ? item.mesLabel.replace('.', '') : item.mes
  }))
  const proximosSaidas = data?.proximasSaidas || data?.proximosCheckouts || []
  const ultimasHospedagens = data?.ultimasHospedagens || []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral e indicadores do hotel em tempo real</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Taxa de Ocupação"
              value={`${stats.taxaOcupacao ?? 0}%`}
              icon={TrendingUp}
              iconColor="bg-primary-600"
            />
            <StatCard
              title="Quartos Livres"
              value={stats.quartosLivres ?? 0}
              icon={BedDouble}
              iconColor="bg-green-500"
            />
            <StatCard
              title="Quartos Ocupados"
              value={stats.quartosOcupados ?? 0}
              icon={BedDouble}
              iconColor="bg-red-500"
            />
            <StatCard
              title="Check-ins Hoje"
              value={stats.checkinsHoje ?? 0}
              icon={CheckCircle}
              iconColor="bg-blue-500"
            />
            <StatCard
              title="Check-outs Hoje"
              value={stats.checkoutsHoje ?? 0}
              icon={LogOut}
              iconColor="bg-orange-500"
            />
            <StatCard
              title="Receita Hoje"
              value={formatCurrency(stats.receitaHoje ?? 0)}
              icon={DollarSign}
              iconColor="bg-emerald-500"
            />
            <StatCard
              title="Receita do Mês"
              value={formatCurrency(stats.receitaMes ?? 0)}
              icon={DollarSign}
              iconColor="bg-indigo-500"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Occupation chart */}
        <Card title="Ocupação — Últimos 30 Dias">
          {loading ? (
            <div className="skeleton h-52 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ocupacaoData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [value, name === 'ocupados' ? 'Ocupados' : 'Total']}
                  labelFormatter={(l) => formatDate(l)}
                />
                <Legend formatter={(v) => v === 'ocupados' ? 'Ocupados' : 'Total'} />
                <Line type="monotone" dataKey="ocupados" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Revenue chart */}
        <Card title="Receita vs Despesa — Últimos 12 Meses">
          {loading ? (
            <div className="skeleton h-52 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fluxoData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Próximas saídas */}
        <Card
          title="Próximas Saídas"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/hospedagens')}>
              Ver todas <ArrowRight size={14} />
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : proximosSaidas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma saída prevista.</p>
          ) : (
            <div className="space-y-2">
              {proximosSaidas.map((h) => (
                <div
                  key={h.id}
                  onClick={() => navigate(`/hospedagens/${h.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {h.cliente?.nome || '-'}
                    </p>
                    <p className="text-xs text-gray-500">Quarto {h.quarto?.numero}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{formatDate(h.previsaoSaida)}</p>
                    <p className="text-xs text-gray-400">{h.numHospedes} hóspede(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Últimas hospedagens */}
        <Card
          title="Últimas Hospedagens"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/hospedagens')}>
              Ver todas <ArrowRight size={14} />
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : ultimasHospedagens.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma hospedagem encontrada.</p>
          ) : (
            <div className="space-y-2">
              {ultimasHospedagens.map((h) => (
                <div
                  key={h.id}
                  onClick={() => navigate(`/hospedagens/${h.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {h.cliente?.nome || '-'}
                    </p>
                    <p className="text-xs text-gray-500">Quarto {h.quarto?.numero} · {formatDate(h.dataEntrada)}</p>
                  </div>
                  <div className="text-right">
                    <Badge color={statusColorMap[h.status] || 'gray'}>
                      {h.status === 'ATIVA' ? 'Ativa' : h.status === 'FINALIZADA' ? 'Finalizada' : 'Cancelada'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(h.valorTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
