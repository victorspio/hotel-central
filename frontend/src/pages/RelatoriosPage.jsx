import React, { useState, useEffect } from 'react'
import {
  FileText, Download, Calendar, Users, BedDouble, DollarSign,
  TrendingUp, RefreshCw, BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { relatorios as relatoriosApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import DatePicker from '../components/ui/DatePicker'
import toast from 'react-hot-toast'
import { format, subDays, startOfMonth } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TABS = ['Relatório Diário', 'Resumo por Período']

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)

  // Diário State
  const [dataDiario, setDataDiario] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [diarioData, setDiarioData] = useState(null)

  // Período State
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [periodoData, setPeriodoData] = useState(null)

  // Carregar dados diários
  const fetchDiario = async () => {
    setLoading(true)
    try {
      const res = await relatoriosApi.getDiario({ data: dataDiario })
      setDiarioData(res.data)
    } catch (err) {
      toast.error('Erro ao carregar relatório diário: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados por período
  const fetchPeriodo = async () => {
    setLoading(true)
    try {
      const res = await relatoriosApi.getPeriodo({ dataInicio, dataFim })
      setPeriodoData(res.data)
    } catch (err) {
      toast.error('Erro ao carregar relatório de período: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 0) {
      fetchDiario()
    } else {
      fetchPeriodo()
    }
  }, [activeTab])

  // Exportar CSV Diário
  const exportarCSVDiario = () => {
    if (!diarioData) return
    const checkins = (diarioData.checkinsDetalhes || []).map(h => [
      'Check-in',
      `"${h.cliente?.nome || ''}"`,
      h.cliente?.cpf || '',
      h.quarto?.numero || '',
      h.quarto?.tipo || '',
      formatDate(h.dataEntrada),
      formatDate(h.previsaoSaida),
      h.numHospedes,
      formatCurrency(h.quarto?.valorDiaria || 0)
    ])

    const checkouts = (diarioData.checkoutsDetalhes || []).map(h => [
      'Check-out',
      `"${h.cliente?.nome || ''}"`,
      h.cliente?.cpf || '',
      h.quarto?.numero || '',
      h.quarto?.tipo || '',
      formatDate(h.dataEntrada),
      formatDate(h.dataSaida),
      h.numHospedes,
      formatCurrency(h.valorTotal || 0)
    ])

    const headers = ['Tipo', 'Cliente', 'CPF', 'Quarto', 'Categoria', 'Entrada', 'Saída/Previsão', 'Hóspedes', 'Valor']
    const rows = [...checkins, ...checkouts]

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_diario_${dataDiario}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado com sucesso!')
  }

  // Exportar PDF Diário
  const exportarPDFDiario = () => {
    if (!diarioData) return
    const doc = new jsPDF()

    // Header
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Hotel Central 2 e Anexo — Relatório Diário', 14, 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Data de Referência: ${formatDate(dataDiario)}`, 14, 32)
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 140, 32)

    // Resumo Cards
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumo do Dia', 14, 42)

    const summaryData = [
      ['Hospedagens Ativas', String(diarioData.hospedagensAtivas || 0)],
      ['Check-ins Realizados', String(diarioData.checkins || 0)],
      ['Check-outs Realizados', String(diarioData.checkouts || 0)],
      ['Receita do Dia', formatCurrency(diarioData.receitaDia || 0)],
      ['Despesas do Dia', formatCurrency(diarioData.despesaDia || 0)],
      ['Saldo do Dia', formatCurrency(diarioData.saldoDia || 0)]
    ]

    autoTable(doc, {
      startY: 46,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: 255 },
      margin: { left: 14, right: 14 },
      tableWidth: 100
    })

    // Tabela de Check-ins
    let currentY = doc.lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'bold')
    doc.text('Check-ins do Dia', 14, currentY)

    const checkinsRows = (diarioData.checkinsDetalhes || []).map(h => [
      h.cliente?.nome || '—',
      h.cliente?.cpf || '—',
      `Quarto ${h.quarto?.numero || ''} (${h.quarto?.tipo || ''})`,
      formatDate(h.previsaoSaida),
      String(h.numHospedes)
    ])

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Cliente', 'CPF', 'Quarto', 'Previsão Saída', 'Hóspedes']],
      body: checkinsRows.length > 0 ? checkinsRows : [['Nenhum check-in registrado neste dia.', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      margin: { left: 14, right: 14 }
    })

    // Tabela de Check-outs
    currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.text('Check-outs do Dia', 14, currentY)

    const checkoutsRows = (diarioData.checkoutsDetalhes || []).map(h => [
      h.cliente?.nome || '—',
      `Quarto ${h.quarto?.numero || ''}`,
      formatDate(h.dataEntrada),
      formatDate(h.dataSaida),
      formatCurrency(h.valorTotal || 0)
    ])

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Cliente', 'Quarto', 'Entrada', 'Saída', 'Valor Total']],
      body: checkoutsRows.length > 0 ? checkoutsRows : [['Nenhum check-out registrado neste dia.', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], textColor: 255 },
      margin: { left: 14, right: 14 }
    })

    doc.save(`relatorio_diario_${dataDiario}.pdf`)
    toast.success('PDF exportado com sucesso!')
  }

  // Exportar CSV Período
  const exportarCSVPeriodo = async () => {
    try {
      const res = await relatoriosApi.exportar({ tipo: 'hospedagens', dataInicio, dataFim })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relatorio_periodo_${dataInicio}_${dataFim}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('CSV exportado com sucesso!')
    } catch {
      // Fallback frontend CSV
      if (!periodoData || !periodoData.hospedagens) return
      const headers = ['ID', 'Cliente', 'Quarto', 'Tipo', 'Entrada', 'Saída', 'Hóspedes', 'Status', 'Valor Total']
      const rows = periodoData.hospedagens.map(h => [
        h.id,
        `"${h.cliente}"`,
        h.quarto,
        h.tipo,
        formatDate(h.dataEntrada),
        h.dataSaida ? formatDate(h.dataSaida) : 'Em aberto',
        h.numHospedes,
        h.status,
        h.valorTotal ? formatCurrency(h.valorTotal) : '—'
      ])
      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio_hospedagens_${dataInicio}_a_${dataFim}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado com sucesso!')
    }
  }

  // Exportar PDF Período
  const exportarPDFPeriodo = () => {
    if (!periodoData) return
    const doc = new jsPDF()

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Hotel Central 2 e Anexo — Relatório por Período', 14, 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`, 14, 32)
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 140, 32)

    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text('Indicadores Gerais', 14, 42)

    const indicadores = [
      ['Total de Hospedagens', String(periodoData.totalHospedagens || 0)],
      ['Total de Hóspedes Atendidos', String(periodoData.totalHospedes || 0)],
      ['Ocupação Média', `${periodoData.ocupacaoMedia || 0}%`],
      ['Receita Total', formatCurrency(periodoData.receitaTotal || 0)],
      ['Despesas Totais', formatCurrency(periodoData.despesaTotal || 0)],
      ['Saldo Líquido', formatCurrency(periodoData.saldo || 0)],
      ['Ticket Médio por Hospedagem', formatCurrency(periodoData.ticketMedio || 0)]
    ]

    autoTable(doc, {
      startY: 46,
      head: [['Indicador', 'Valor']],
      body: indicadores,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: 255 },
      margin: { left: 14, right: 14 },
      tableWidth: 120
    })

    const tableRows = (periodoData.hospedagens || []).map(h => [
      h.cliente || '—',
      `Q.${h.quarto} (${h.tipo})`,
      formatDate(h.dataEntrada),
      h.dataSaida ? formatDate(h.dataSaida) : 'Ativa',
      String(h.numHospedes),
      h.status,
      h.valorTotal ? formatCurrency(h.valorTotal) : '—'
    ])

    let currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.text('Detalhamento das Hospedagens', 14, currentY)

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Cliente', 'Quarto', 'Entrada', 'Saída', 'Hósp.', 'Status', 'Total']],
      body: tableRows.length > 0 ? tableRows : [['Nenhuma hospedagem no período', '', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      margin: { left: 14, right: 14 }
    })

    doc.save(`relatorio_periodo_${dataInicio}_a_${dataFim}.pdf`)
    toast.success('PDF exportado com sucesso!')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhamento diário e consolidado de hóspedes, ocupação e receitas
          </p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tabLabel, idx) => (
          <button
            key={tabLabel}
            onClick={() => setActiveTab(idx)}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${activeTab === idx
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tabLabel}
          </button>
        ))}
      </div>

      {/* ABA 1: RELATÓRIO DIÁRIO */}
      {activeTab === 0 && (
        <div className="space-y-6">
          {/* Barra de Filtro e Exportação */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dia:</span>
                <DatePicker
                  value={dataDiario}
                  onChange={(val) => val && setDataDiario(val)}
                  containerClassName="w-44"
                  className="py-1.5"
                />
                <Button variant="secondary" size="sm" onClick={fetchDiario} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Filtrar
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={exportarCSVDiario} disabled={!diarioData}>
                  <Download className="w-4 h-4 mr-1 text-emerald-600" />
                  Exportar CSV
                </Button>
                <Button variant="primary" size="sm" onClick={exportarPDFDiario} disabled={!diarioData}>
                  <FileText className="w-4 h-4 mr-1" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </Card>

          {/* Cards de Métricas do Dia */}
          {diarioData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-xs font-semibold uppercase">Hosp. Ativas</span>
                  <BedDouble className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{diarioData.hospedagensAtivas}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-xs font-semibold uppercase">Check-ins</span>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">{diarioData.checkins}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-xs font-semibold uppercase">Check-outs</span>
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600">{diarioData.checkouts}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-xs font-semibold uppercase">Receita Dia</span>
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-xl font-bold text-green-600">{formatCurrency(diarioData.receitaDia || 0)}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-xs font-semibold uppercase">Despesas Dia</span>
                  <DollarSign className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-xl font-bold text-red-600">{formatCurrency(diarioData.despesaDia || 0)}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-xs font-semibold uppercase">Saldo Dia</span>
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                </div>
                <div className={`text-xl font-bold ${(diarioData.saldoDia || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(diarioData.saldoDia || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Gráfico do Dia (ou dias caso haja agrupamento) */}
          {diarioData && (
            <Card title="Movimentação e Fluxo Diário">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Check-ins', quantidade: diarioData.checkins },
                      { name: 'Check-outs', quantidade: diarioData.checkouts },
                      { name: 'Hospedagens Ativas', quantidade: diarioData.hospedagensAtivas }
                    ]}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Tabelas de Detalhes Diários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Check-ins */}
            <Card title={`Check-ins em ${formatDate(dataDiario)}`}>
              {diarioData?.checkinsDetalhes?.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum check-in registrado para esta data.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Quarto</th>
                        <th className="py-2.5 px-3">Previsão Saída</th>
                        <th className="py-2.5 px-3">Hóspedes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {diarioData?.checkinsDetalhes?.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{h.cliente?.nome}</td>
                          <td className="py-2 px-3">Quarto {h.quarto?.numero}</td>
                          <td className="py-2 px-3 text-gray-600">{formatDate(h.previsaoSaida)}</td>
                          <td className="py-2 px-3">{h.numHospedes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Check-outs */}
            <Card title={`Check-outs em ${formatDate(dataDiario)}`}>
              {diarioData?.checkoutsDetalhes?.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum check-out registrado para esta data.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Quarto</th>
                        <th className="py-2.5 px-3">Entrada</th>
                        <th className="py-2.5 px-3">Total Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {diarioData?.checkoutsDetalhes?.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{h.cliente?.nome}</td>
                          <td className="py-2 px-3">Quarto {h.quarto?.numero}</td>
                          <td className="py-2 px-3 text-gray-600">{formatDate(h.dataEntrada)}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-600">{formatCurrency(h.valorTotal || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ABA 2: RESUMO POR PERÍODO */}
      {activeTab === 1 && (
        <div className="space-y-6">
          {/* Barra de Filtros de Período e Exportação */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">De:</span>
                  <DatePicker
                    value={dataInicio}
                    onChange={(val) => val && setDataInicio(val)}
                    containerClassName="w-40"
                    className="py-1.5"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Até:</span>
                  <DatePicker
                    value={dataFim}
                    min={dataInicio}
                    onChange={(val) => val && setDataFim(val)}
                    containerClassName="w-40"
                    className="py-1.5"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={fetchPeriodo} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Aplicar Filtro
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={exportarCSVPeriodo} disabled={!periodoData}>
                  <Download className="w-4 h-4 mr-1 text-emerald-600" />
                  Exportar CSV
                </Button>
                <Button variant="primary" size="sm" onClick={exportarPDFPeriodo} disabled={!periodoData}>
                  <FileText className="w-4 h-4 mr-1" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </Card>

          {/* Cards de Indicadores do Período */}
          {periodoData && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Hospedagens</span>
                <span className="text-2xl font-bold text-gray-900">{periodoData.totalHospedagens}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Total Hóspedes</span>
                <span className="text-2xl font-bold text-blue-600">{periodoData.totalHospedes}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Ocupação Média</span>
                <span className="text-2xl font-bold text-purple-600">{periodoData.ocupacaoMedia}%</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Ticket Médio</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(periodoData.ticketMedio || 0)}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Receita Total</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(periodoData.receitaTotal || 0)}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Despesas</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(periodoData.despesaTotal || 0)}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-gray-500 block mb-1">Saldo Líquido</span>
                <span className={`text-xl font-bold ${(periodoData.saldo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(periodoData.saldo || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Tabela Detalhada do Período */}
          <Card title={`Hospedagens no Período (${formatDate(dataInicio)} a ${formatDate(dataFim)})`}>
            {!periodoData || !periodoData.hospedagens || periodoData.hospedagens.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Nenhuma hospedagem encontrada no período selecionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Quarto</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Entrada</th>
                      <th className="py-3 px-4">Saída</th>
                      <th className="py-3 px-4 text-center">Hóspedes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {periodoData.hospedagens.map((h) => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-medium text-gray-900">{h.cliente}</td>
                        <td className="py-2.5 px-4 font-semibold">Quarto {h.quarto}</td>
                        <td className="py-2.5 px-4 text-gray-600 capitalize">{h.tipo?.toLowerCase()}</td>
                        <td className="py-2.5 px-4">{formatDate(h.dataEntrada)}</td>
                        <td className="py-2.5 px-4 text-gray-600">{h.dataSaida ? formatDate(h.dataSaida) : 'Ativa'}</td>
                        <td className="py-2.5 px-4 text-center">{h.numHospedes}</td>
                        <td className="py-2.5 px-4">
                          <Badge variant={h.status === 'ATIVA' ? 'blue' : h.status === 'FINALIZADA' ? 'green' : 'gray'}>
                            {h.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                          {h.valorTotal ? formatCurrency(h.valorTotal) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

