// SA Invoice Pro v0.9002 – Multi-theme PDF Generator
window.THEME_COLOURS = {
  green:  [0, 122, 77],
  navy:   [15, 23, 42],
  blue:   [37, 99, 235],
  purple: [124, 58, 237],
  teal:   [13, 148, 136],
  orange: [234, 88, 12],
  red:    [185, 28, 28],
  gold:   [180, 130, 20]
};

window.generateInvoicePDF = function(invoice, company, client, options = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  let template = options.template || 'classic';
  if (template === 'corporate') template = 'modern';
  if (template === 'elegant') template = 'minimal';
  const colourKey = options.colour || 'green';
  const accent = THEME_COLOURS[colourKey] || THEME_COLOURS.green;
  const navy = [15, 23, 42];
  const slate = [71, 85, 105];
  const light = [248, 250, 252];
  const vatEnabled = options.vatEnabled !== false;
  const logoData = options.logoData || (typeof App !== 'undefined' ? App.logoData : null);
  const vatRate = options.vatRate || 0.15;

  const formatMoney = (n) => 'R ' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const isQuote = invoice.type === 'quote' || invoice.docType === 'quote';
  const docTitle = isQuote ? 'QUOTATION' : (invoice.status === 'draft' ? 'DRAFT INVOICE' : 'TAX INVOICE');

  // ===== HEADER BY TEMPLATE =====
  if (template === 'modern') {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setFillColor(...accent);
    doc.rect(0, 26, pageWidth, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Your Company', margin, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(docTitle, pageWidth - margin, 13, { align: 'right' });
    y = 36;
  } else if (template === 'minimal') {
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.5);
    doc.line(margin, 12, pageWidth - margin, 12);
    doc.setTextColor(...navy);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Your Company', margin, 22);
    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.text(docTitle, pageWidth - margin, 22, { align: 'right' });
    y = 30;
  } else if (template === 'bold') {
    doc.setFillColor(...accent);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Your Company', margin, 14);
    doc.setFontSize(11);
    doc.text(docTitle, margin, 24);
    y = 40;
  } else {
    // classic
    doc.setFillColor(...accent);
    doc.rect(margin, y, 12, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SA', margin + 6, y + 8, { align: 'center' });
    doc.setTextColor(...navy);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Your Company', margin + 16, y + 6);
    doc.setFillColor(...accent);
    doc.roundedRect(pageWidth - margin - 48, y, 48, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(docTitle, pageWidth - margin - 24, y + 6.5, { align: 'center' });
    y += 18;
  }


  // Logo (if uploaded)
  if (logoData && logoData.startsWith('data:image')) {
    try {
      const fmt = logoData.indexOf('png') > -1 ? 'PNG' : 'JPEG';
      doc.addImage(logoData, fmt, pageWidth - margin - 28, 12, 28, 14);
    } catch (e) { console.warn('Logo render failed', e); }
  }

  // Company details
  doc.setTextColor(...slate);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const companyLines = [
    company?.address || '',
    [company?.city, company?.postalCode].filter(Boolean).join(', '),
    company?.province || 'South Africa',
    company?.phone ? `Tel: ${company.phone}` : '',
    company?.email || '',
    company?.regNo ? `Reg No: ${company.regNo}` : '',
    company?.vatNo && vatEnabled ? `VAT No: ${company.vatNo}` : '',
    company?.beeLevel ? `B-BBEE: Level ${company.beeLevel}` : ''
  ].filter(Boolean);
  companyLines.forEach((line, i) => doc.text(line, margin, y + i * 4));

  // Meta
  const metaX = pageWidth - margin - 55;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(isQuote ? 'Quote No:' : 'Invoice No:', metaX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.number || '', metaX + 28, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', metaX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.date), metaX + 28, y + 5);
  if (invoice.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', metaX, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.dueDate), metaX + 28, y + 10);
  }
  if (invoice.paymentTerms) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms:', metaX, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.paymentTerms, metaX + 28, y + 15);
  }
  y += Math.max(companyLines.length * 4, 22) + 6;

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Bill To
  doc.setFillColor(...light);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, 'F');
  doc.setTextColor(...accent);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin + 4, y + 5);
  doc.setTextColor(...navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.name || invoice.clientName || 'Client', margin + 4, y + 11);
  doc.setTextColor(...slate);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let by = y + 15;
  if (client?.address) { doc.text(client.address, margin + 4, by); by += 4; }
  if (client?.city || client?.postalCode) doc.text([client.city, client.postalCode].filter(Boolean).join(', '), margin + 4, by);
  if (client?.vatNo && vatEnabled) doc.text(`VAT: ${client.vatNo}`, margin + 4, by + 4);
  y += 34;

  // Items
  const body = (invoice.items || []).map((item, i) => [
    String(i + 1),
    item.description || '',
    String(item.qty || 1),
    formatMoney(item.unitPrice),
    formatMoney((item.qty || 1) * (item.unitPrice || 0))
  ]);

  doc.autoTable({
    startY: y,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body,
    theme: 'grid',
    headStyles: { fillColor: accent, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: navy },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' }
    },
    margin: { left: margin, right: margin },
    styles: { cellPadding: 2, lineColor: [226,232,240], lineWidth: 0.3 }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Totals
  const totalsX = pageWidth - margin - 70;
  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discount || 0;
  const vatAmount = vatEnabled ? (invoice.vatAmount || 0) : 0;
  const total = invoice.total || 0;

  doc.setFontSize(9);
  doc.setTextColor(...slate);
  doc.text('Subtotal:', totalsX, y);
  doc.text(formatMoney(subtotal), pageWidth - margin, y, { align: 'right' });
  y += 6;
  if (discount > 0) {
    doc.text('Discount:', totalsX, y);
    doc.text('- ' + formatMoney(discount), pageWidth - margin, y, { align: 'right' });
    y += 6;
  }
  if (vatEnabled) {
    doc.text(`VAT (${(vatRate * 100).toFixed(0)}%):`, totalsX, y);
    doc.text(formatMoney(vatAmount), pageWidth - margin, y, { align: 'right' });
    y += 7;
  }

  doc.setFillColor(...accent);
  doc.roundedRect(totalsX - 5, y - 4, 75, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL:', totalsX, y + 3.5);
  doc.text(formatMoney(total), pageWidth - margin - 2, y + 3.5, { align: 'right' });
  y += 14;

  // Payments received + balance due (invoices only) — compact
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  let amountPaid = Number(invoice.amountPaid);
  if (!Number.isFinite(amountPaid)) {
    amountPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }
  let amountDue = invoice.amountDue;
  if (amountDue == null || amountDue === '') {
    amountDue = Math.max(0, total - amountPaid);
  } else {
    amountDue = Number(amountDue) || 0;
  }

  const pageH = doc.internal.pageSize.getHeight();
  const footerReserve = 18; // leave room for thin footer
  const ensureSpace = (need) => {
    if (y + need > pageH - footerReserve) {
      doc.addPage();
      y = 16;
    }
  };

  if (!isQuote && (amountPaid > 0 || payments.length > 0)) {
    ensureSpace(10 + Math.min(payments.length, 4) * 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slate);
    doc.text('Amount paid:', totalsX, y);
    doc.text(formatMoney(amountPaid), pageWidth - margin, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('BALANCE DUE:', totalsX, y);
    doc.text(formatMoney(amountDue), pageWidth - margin, y, { align: 'right' });
    y += 6;
    if (payments.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...accent);
      doc.text('PAYMENTS RECEIVED', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate);
      payments.slice(0, 6).forEach((p) => {
        ensureSpace(5);
        const when = (p.at || p.date || '').toString().slice(0, 10);
        const note = (p.note || p.method || '').toString().slice(0, 40);
        doc.text(`${when}  ${formatMoney(p.amount)}  ${note}`, margin, y);
        y += 3.5;
      });
      if (payments.length > 6) {
        doc.text('… +' + (payments.length - 6) + ' more', margin, y);
        y += 3.5;
      }
    }
  }

  // Banking — compact single block
  const hasBank = company && (company.bankName || company.accountNumber || company.bankAccount);
  if (hasBank && !isQuote) {
    ensureSpace(16);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text('BANKING DETAILS', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    const bankLines = [
      [company.bankName, company.accountName].filter(Boolean).join(' · '),
      [company.accountNumber && ('Acc: ' + company.accountNumber), company.branchCode && ('Branch: ' + company.branchCode)].filter(Boolean).join('  '),
      company.accountType ? ('Type: ' + company.accountType) : ''
    ].filter(Boolean);
    bankLines.forEach((ln) => { doc.text(ln, margin, y); y += 3.5; });
  }

  // Notes + terms — one block, tight, max height
  const termsText = (invoice.notes || company?.terms || invoice.paymentTerms || '').toString().trim();
  if (termsText) {
    ensureSpace(14);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text('NOTES / TERMS', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    const maxW = pageWidth - margin * 2;
    const split = doc.splitTextToSize(termsText, maxW);
    // Cap lines so we stay on one page when possible
    const maxLines = Math.max(2, Math.floor((pageH - footerReserve - y - 22) / 3.2));
    const use = split.slice(0, maxLines);
    doc.text(use, margin, y);
    y += use.length * 3.2;
    if (split.length > maxLines) {
      doc.text('…', margin, y);
      y += 3;
    }
  }

  // Signature — place AFTER terms with guaranteed gap; never overlap footer
  const autoSign = options.autoSign !== false && (options.signName || (typeof App !== 'undefined' && App.pdfSignName));
  if (autoSign) {
    const sn = options.signName || (typeof App !== 'undefined' && App.pdfSignName) || '';
    const st = options.signTitle || (typeof App !== 'undefined' && App.pdfSignTitle) || '';
    if (sn) {
      ensureSpace(22);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'normal');
      doc.text('Signed for and on behalf of ' + (company?.name || 'the Company') + ':', margin, y);
      y += 8;
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + 50, y);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(sn, margin, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...slate);
      if (st) { doc.text(st, margin, y); y += 3.5; }
      doc.text('Date: ' + formatDate(new Date()) + '  ·  Operational attestation (not QES)', margin, y);
      y += 4;
    }
  }

  // Footer on every page — fixed bottom, never overlaps content
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = pageH - 12;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, pageWidth - margin, fy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('SA Invoice Pro  © ' + new Date().getFullYear() + '  ·  All rights reserved', pageWidth / 2, fy + 4, { align: 'center' });
    if (!isQuote && vatEnabled && p === pageCount) {
      doc.setFontSize(5.5);
      doc.text('Tax Invoice — VAT Act 1991 (South Africa)', margin, fy + 7.5);
    }
    doc.text('Page ' + p + ' / ' + pageCount, pageWidth - margin, fy + 4, { align: 'right' });
  }

  if (options.returnBlob) return doc.output('blob');
  if (options.returnDataUrl) return doc.output('datauristring');
  if (options.returnDoc) return doc;
  doc.save(`${invoice.number || 'document'}.pdf`);
  return doc;
};

window.previewPDF = function(invoice, company, client, template, colour, vatEnabled, logoData) {
  return generateInvoicePDF(invoice, company, client, {
    returnDataUrl: true,
    template: template || 'classic',
    colour: colour || 'green',
    vatEnabled: vatEnabled !== false,
    logoData: logoData || null
  });
};

window.previewPDFBlob = function(invoice, company, client, template, colour, vatEnabled, logoData) {
  return generateInvoicePDF(invoice, company, client, {
    returnBlob: true,
    template: template || 'classic',
    colour: colour || 'green',
    vatEnabled: vatEnabled !== false,
    logoData: logoData
  });
};


/** Themed business letter / agreement PDF (matches invoice templates) */
window.generateBusinessLetterPDF = function(options = {}) {
  const jspdfNS = window.jspdf || window.jsPDF;
  if (!jspdfNS) throw new Error('jsPDF not loaded');
  const jsPDF = jspdfNS.jsPDF || jspdfNS;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = 16;

  const company = options.company || {};
  const client = options.client || {};
  const title = options.title || 'DOCUMENT';
  const bodyLines = options.bodyLines || [];
  const template = options.template || 'classic';
  const colourKey = options.colour || 'green';
  const accent = (window.THEME_COLOURS && THEME_COLOURS[colourKey]) || [0, 122, 77];
  const navy = [15, 23, 42];
  const slate = [71, 85, 105];
  const dateStr = options.date || new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  const ref = options.ref || '';

  // Header by template (same language as tax invoices)
  if (template === 'modern') {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFillColor(...accent);
    doc.rect(0, 28, pageWidth, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company.name || 'Your Company', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(title, pageWidth - margin, 14, { align: 'right' });
    y = 38;
  } else if (template === 'minimal') {
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.2);
    doc.line(margin, 12, pageWidth - margin, 12);
    doc.setTextColor(...navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(company.name || 'Your Company', margin, 22);
    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.text(title, pageWidth - margin, 22, { align: 'right' });
    y = 30;
  } else if (template === 'bold') {
    doc.setFillColor(...accent);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(company.name || 'Your Company', margin, 14);
    doc.setFontSize(11);
    doc.text(title, margin, 26);
    y = 42;
  } else {
    doc.setFillColor(...accent);
    doc.rect(margin, y, 11, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SA', margin + 5.5, y + 7.5, { align: 'center' });
    doc.setTextColor(...navy);
    doc.setFontSize(14);
    doc.text(company.name || 'Your Company', margin + 15, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(title, margin + 15, y + 11);
    y = 32;
  }

  // Company block
  doc.setTextColor(...slate);
  doc.setFontSize(8);
  const coBits = [
    [company.address, company.city, company.province, company.postalCode].filter(Boolean).join(', '),
    [company.phone, company.email].filter(Boolean).join(' · '),
    [company.vatNo ? 'VAT ' + company.vatNo : '', company.regNo ? 'CIPC ' + company.regNo : ''].filter(Boolean).join(' · ')
  ].filter(Boolean);
  coBits.forEach(line => {
    doc.text(line, margin, y);
    y += 4;
  });
  y += 4;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Meta
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  doc.text('Date: ' + dateStr, margin, y);
  if (ref) {
    doc.text('Reference: ' + ref, pageWidth - margin, y, { align: 'right' });
  }
  y += 8;

  // Addressee
  if (client.name) {
    doc.setTextColor(...navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('To:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(client.name, margin, y);
    y += 4;
    if (client.address) { doc.setTextColor(...slate); doc.text(String(client.address), margin, y); y += 4; }
    if (client.email || client.phone) {
      doc.text([client.email, client.phone].filter(Boolean).join(' · '), margin, y);
      y += 4;
    }
    y += 4;
  }

  // Body
  doc.setTextColor(...navy);
  doc.setFontSize(10);
  bodyLines.forEach(para => {
    const lines = doc.splitTextToSize(String(para || ''), pageWidth - margin * 2);
    lines.forEach(line => {
      if (y > pageHeight - 28) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 3;
  });

  // Signature block
  if (y > pageHeight - 45) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  doc.text('Yours faithfully,', margin, y);
  y += 12;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 50, y);
  y += 5;
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  const signN = options.signName || (typeof App !== 'undefined' && App.pdfSignName) || company.name || 'Authorised signatory';
  const signT = options.signTitle || (typeof App !== 'undefined' && App.pdfSignTitle) || '';
  doc.text(signN, margin, y);
  if (signT) { y += 4; doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(signT, margin, y); }
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Attested ' + dateStr + ' · SA Invoice Pro (operational signature block)', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.setFontSize(8);
  if (company.email) doc.text(company.email, margin, y);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('SA Invoice Pro  © ' + new Date().getFullYear() + '  ·  All rights reserved', pageWidth / 2, pageHeight - 10, { align: 'center' });

  const safeName = (title || 'Document').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40);
  doc.save(`SA-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
};
