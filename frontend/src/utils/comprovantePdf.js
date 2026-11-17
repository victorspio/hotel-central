import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { formatCurrency, formatDate } from './formatters'
import toast from 'react-hot-toast'

let cachedLogo = null

const getLogoImage = () => {
  if (cachedLogo) return Promise.resolve(cachedLogo)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      cachedLogo = img
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
}

// Pré-carrega a logo para abertura instantânea sem acionar bloqueador de popups
if (typeof window !== 'undefined') {
  getLogoImage()
}

export async function gerarComprovanteHospedagem(hosp, options = {}) {
  if (!hosp) return

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth() // 210mm
    const margin = 14
    const contentWidth = pageWidth - margin * 2 // 182mm

    // Calculations
    const consumos = hosp.consumosExtras || hosp.consumos || []
    const dias = options.dias || hosp._diasProvisorio || Math.max(1, Math.round(
      (new Date(hosp.dataSaida || hosp.previsaoSaida) - new Date(hosp.dataEntrada)) / 86400000
    ))
    const numHospedes = hosp.numHospedes || 1
    const valorPorPessoa = options.valorPorPessoa || hosp._valorPorPessoa || (hosp.quarto?.valorDiaria ? hosp.quarto.valorDiaria / numHospedes : 0)
    const valorDiaria = options.valorDiaria || hosp._valorDiaria || (valorPorPessoa * numHospedes)
    const totalDiarias = options.totalDiarias != null
      ? options.totalDiarias
      : (hosp._totalProvisorio != null ? (hosp._totalProvisorio - (hosp.totalConsumos || 0)) : (dias * valorDiaria))
    const totalConsumos = options.totalConsumos != null
      ? options.totalConsumos
      : (hosp.totalConsumos != null ? hosp.totalConsumos : consumos.reduce((s, c) => s + (c.valor || 0), 0))
    const totalGeral = hosp.valorTotal != null ? hosp.valorTotal : (totalDiarias + totalConsumos)

    const isFinalizada = hosp.status === 'FINALIZADA'
    const predioNome = hosp.quarto?.predio === 'ANEXO' ? 'Anexo' : 'Hotel'
    const isEsquema = hosp.tipo === 'ESQUEMA'
    const acomodacaoNome = (() => {
      if (hosp.tipo === 'ESQUEMA') return 'Esquema (Descanso Rápido)'
      if (hosp.tipo === 'SUITE_PREMIUM') return 'Suíte Premium'
      if (hosp.tipo === 'COMPLETO') return 'Quarto Completo'
      return 'Quarto Simples (sem ar)'
    })()

    // ── 1. HEADER COM LOGO ───────────────────────────────────────────────
    let currentY = 12

    // Load Logo (aspect ratio ~2.42: width 44mm, height 18mm)
    const logoImg = await getLogoImage()
    if (logoImg) {
      try {
        doc.addImage(logoImg, 'PNG', margin, currentY, 44, 18)
      } catch {
        // Fallback text if addImage fails
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 58, 138)
        doc.text('Hotel Central 2', margin, currentY + 10)
      }
    } else {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('Hotel Central 2', margin, currentY + 10)
    }

    // Header Right: Title & Receipt Info
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42) // Slate 900
    doc.text('COMPROVANTE DE HOSPEDAGEM', pageWidth - margin, currentY + 4, { align: 'right' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139) // Slate 500
    doc.text(`Reserva: #HOSP-${String(hosp.id).padStart(5, '0')}`, pageWidth - margin, currentY + 9.5, { align: 'right' })
    doc.text(`Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, currentY + 14.5, { align: 'right' })

    // Status Badge Pill (perfeitamente alinhado à margem direita)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const statusText = isFinalizada ? 'FINALIZADA / QUITADA' : 'HOSPEDAGEM ATIVA'
    const statusWidth = doc.getTextWidth(statusText) + 8
    const statusHeight = 5.5
    const statusX = pageWidth - margin - statusWidth
    const statusY = currentY + 17.5

    if (isFinalizada) {
      doc.setFillColor(236, 253, 245) // Emerald 50
      doc.setDrawColor(167, 243, 208) // Emerald 200
      doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 1.5, 1.5, 'FD')
      doc.setTextColor(5, 150, 105) // Emerald 600
    } else {
      doc.setFillColor(239, 246, 255) // Blue 50
      doc.setDrawColor(191, 219, 254) // Blue 200
      doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 1.5, 1.5, 'FD')
      doc.setTextColor(37, 99, 235) // Blue 600
    }
    doc.text(statusText, statusX + statusWidth / 2, statusY + 3.9, { align: 'center' })

    // Divider Line
    currentY += 26
    doc.setDrawColor(226, 232, 240) // Slate 200
    doc.setLineWidth(0.6)
    doc.line(margin, currentY, pageWidth - margin, currentY)

    // ── 2. DADOS DO HÓSPEDE & ESTADIA (CARDS LADO A LADO) ─────────────────
    currentY += 5
    const colWidth = (contentWidth - 6) / 2
    const col2X = margin + colWidth + 6

    // Col 1: Dados do Hóspede
    doc.setFillColor(248, 250, 252) // Slate 50
    doc.roundedRect(margin, currentY, colWidth, 42, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, currentY, colWidth, 42, 2, 2, 'S')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 58, 138)
    doc.text('DADOS DO HÓSPEDE', margin + 4, currentY + 6)

    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105) // Slate 600
    const cliente = hosp.cliente || {}
    const cLinhas = [
      `Nome: ${cliente.nome || '-'}`,
      `CPF: ${cliente.cpf || '-'}` + (cliente.rg ? `   RG: ${cliente.rg}` : ''),
      `Telefone: ${cliente.telefone || '-'}`,
      `E-mail: ${cliente.email || '-'}`,
      `Cidade: ${[cliente.cidade, cliente.estado].filter(Boolean).join(' - ') || '-'}`
    ]
    let yCli = currentY + 12
    cLinhas.forEach((txt) => {
      doc.text(txt, margin + 4, yCli)
      yCli += 5.5
    })

    // Col 2: Dados da Estadia
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(col2X, currentY, colWidth, 42, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(col2X, currentY, colWidth, 42, 2, 2, 'S')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 58, 138)
    doc.text('DADOS DA ACOMODAÇÃO', col2X + 4, currentY + 6)

    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    const eLinhas = [
      `Quarto: ${hosp.quarto?.numero || '-'} (${predioNome})`,
      `Acomodação: ${acomodacaoNome}`,
      `Ocupantes: ${numHospedes} pessoa(s)`,
      `Check-in: ${formatDate(hosp.dataEntrada)}`,
      `Check-out: ${formatDate(hosp.dataSaida || hosp.previsaoSaida)} ${hosp.dataSaida ? '(Realizado)' : '(Previsto)'}`
    ]
    let yEst = currentY + 12
    eLinhas.forEach((txt) => {
      doc.text(txt, col2X + 4, yEst)
      yEst += 5.5
    })

    currentY += 47

    // ── 3. TABELA DE ITENS (DIÁRIAS E CONSUMOS) ──────────────────────────
    const tableBody = []

    // 1. Linha de Diárias
    tableBody.push([
      isEsquema ? `Descanso Rápido (${predioNome} - Esquema)` : `Diárias da Acomodação (${predioNome} - ${acomodacaoNome})`,
      isEsquema ? 'Descanso Rápido' : 'Diárias',
      isEsquema ? `${dias} período(s)` : `${dias} diária(s)`,
      formatCurrency(valorDiaria),
      formatCurrency(totalDiarias)
    ])

    // 2. Linhas de Consumos Extras
    if (consumos.length > 0) {
      consumos.forEach((c) => {
        tableBody.push([
          c.descricao || 'Consumo Extra',
          c.categoria || 'Geral',
          '1 un.',
          formatCurrency(c.valor || 0),
          formatCurrency(c.valor || 0)
        ])
      })
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Item / Discriminação dos Serviços', 'Categoria', 'Qtd.', 'Valor Unit.', 'Subtotal']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138], // Navy
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 32 },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 23, halign: 'right' },
        4: { cellWidth: 23, halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 3
      },
      margin: { left: margin, right: margin }
    })

    currentY = doc.lastAutoTable.finalY + 4

    // ── 4. RESUMO FINANCEIRO ─────────────────────────────────────────────
    const summaryX = pageWidth - margin - 75
    const summaryWidth = 75

    doc.setFillColor(241, 245, 249) // Slate 100
    doc.roundedRect(summaryX, currentY, summaryWidth, 34, 2, 2, 'F')
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(summaryX, currentY, summaryWidth, 34, 2, 2, 'S')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)

    // Subtotal Diárias / Esquema
    doc.text(isEsquema ? 'Subtotal Esquema:' : 'Subtotal Diárias:', summaryX + 4, currentY + 6)
    doc.text(formatCurrency(totalDiarias), summaryX + summaryWidth - 4, currentY + 6, { align: 'right' })

    // Subtotal Consumos
    doc.text('Consumos Extras:', summaryX + 4, currentY + 12)
    doc.text(formatCurrency(totalConsumos), summaryX + summaryWidth - 4, currentY + 12, { align: 'right' })

    // Linha
    doc.setDrawColor(203, 213, 225)
    doc.line(summaryX + 4, currentY + 15, summaryX + summaryWidth - 4, currentY + 15)

    // Total Geral
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('TOTAL A PAGAR:', summaryX + 4, currentY + 22)
    doc.setTextColor(30, 58, 138)
    doc.text(formatCurrency(totalGeral), summaryX + summaryWidth - 4, currentY + 22, { align: 'right' })

    // Pagamento info
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    const pgtoTxt = hosp.formaPagamento
      ? `Forma de Pagto: ${hosp.formaPagamento}`
      : (isFinalizada ? 'Forma de Pagto: Quitada' : 'Pagamento: No Check-out')
    doc.text(pgtoTxt, summaryX + 4, currentY + 29)

    // ── 5. OBSERVAÇÕES (SE HOUVER) ────────────────────────────────────────
    if (hosp.observacoes) {
      doc.setFillColor(254, 249, 195) // Amber 50
      doc.setDrawColor(253, 224, 71) // Amber 300
      doc.roundedRect(margin, currentY, contentWidth - summaryWidth - 6, 34, 2, 2, 'FD')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(133, 77, 14)
      doc.text('Observações:', margin + 4, currentY + 6)

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(113, 63, 18)
      const splitObs = doc.splitTextToSize(hosp.observacoes, contentWidth - summaryWidth - 14)
      doc.text(splitObs, margin + 4, currentY + 12)
    }

    currentY += 42

    // ── 6. DECLARAÇÃO E ASSINATURAS ───────────────────────────────────────
    if (currentY > 235) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text(
      'Declaro que utilizei os serviços de hospedagem e consumos discriminados acima e estou de pleno acordo com os valores e condições.',
      pageWidth / 2,
      currentY,
      { align: 'center' }
    )

    currentY += 24
    const signColWidth = 70
    const sign1X = margin + 15
    const sign2X = pageWidth - margin - 15 - signColWidth

    // Assinatura Hóspede
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.4)
    doc.line(sign1X, currentY, sign1X + signColWidth, currentY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(cliente.nome || 'Hóspede Responsável', sign1X + signColWidth / 2, currentY + 4, { align: 'center' })
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('Assinatura do Hóspede', sign1X + signColWidth / 2, currentY + 8, { align: 'center' })

    // Assinatura Recepção
    doc.line(sign2X, currentY, sign2X + signColWidth, currentY)
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text('Hotel Central 2 & Anexo', sign2X + signColWidth / 2, currentY + 4, { align: 'center' })
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('Assinatura da Recepção / Gerência', sign2X + signColWidth / 2, currentY + 8, { align: 'center' })

    // ── 7. FOOTER DA PÁGINA ───────────────────────────────────────────────
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Hotel Central 2 & Anexo · Documento gerado eletronicamente em ${format(new Date(), 'dd/MM/yyyy às HH:mm')}`,
      pageWidth / 2,
      287,
      { align: 'center' }
    )

    // Metadados do documento (usado pelo navegador para título da aba e nome do download padrão)
    const docTitle = `Comprovante - Quarto ${hosp.quarto?.numero || ''} - ${cliente.nome || 'Hospede'}`
    doc.setProperties({
      title: docTitle,
      subject: 'Comprovante de Hospedagem - Hotel Central 2',
      author: 'Hotel Central 2',
      creator: 'Hotel Central 2'
    })

    // Gera o Blob do PDF para abrir na janela de impressão/visualização padrão do navegador
    const pdfBlob = doc.output('blob')
    const blobUrl = URL.createObjectURL(pdfBlob)

    let targetWin = options.targetWindow
    if (targetWin && !targetWin.closed) {
      targetWin.location.href = blobUrl
      try { targetWin.focus() } catch { /* ignore */ }
    } else {
      targetWin = window.open(blobUrl, '_blank')
      if (targetWin) {
        try { targetWin.focus() } catch { /* ignore */ }
      } else {
        // Fallback se o navegador bloquear o popup
        const link = document.createElement('a')
        link.href = blobUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }

    // Mantém a URL válida para visualização, impressão e download, liberando depois
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {
        // ignore
      }
    }, 5 * 60 * 1000)

    toast.success('Comprovante aberto para impressão / download!')
  } catch (err) {
    console.error('Erro ao gerar comprovante PDF:', err)
    toast.error('Erro ao gerar comprovante em PDF.')
  }
}

