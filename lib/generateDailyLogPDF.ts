import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DailyLogPDFData {
  project: { name: string; address: string; contractNumber: string }
  date: string           // formatted display date like "Wednesday, February 19, 2026"
  dateRaw: string        // YYYY-MM-DD for report number
  preparedBy: { name: string; role: string }
  rawEntry: string
  weather?: string       // dropdown value like "Clear", "Rain", etc.
  weatherDetails?: string // AI-parsed details like "Cloudy morning, cleared by noon"
  crewCount?: number
  crew: Array<{ company: string; count: number; role?: string }>
  workCompleted: Array<{ description: string; location?: string }>
  deliveries: Array<{ material: string; status: string; details: string }>
  inspections: Array<{ inspector: string; area: string; result: string; details: string }>
  delays: Array<{ issue: string; impact: string }>
  visitors: string
  taggedMessages: Array<{ tag: string; text: string; sender: string; time: string }>
}

export function generateDailyLogPDF(data: DailyLogPDFData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Colors
  const brandGray = '#787878';
  const titleColor = '#1e1e1e';
  const bodyColor = '#3c3c3c';
  const sectionColor = '#1e1e1e';
  const footerGray = '#a0a0a0';
  const headerFill: [number, number, number] = [55, 65, 81];

  // ── Helpers ──────────────────────────────────────────────

  function checkPageBreak(needed: number = 20) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    } else if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  }

  function addSectionTitle(title: string) {
    checkPageBreak(14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(sectionColor);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  function addBulletSection(title: string, items: string[]) {
    if (items.length === 0) return;
    addSectionTitle(title);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(bodyColor);
    for (const item of items) {
      checkPageBreak(10);
      const lines = doc.splitTextToSize(item, contentWidth - 6);
      for (let i = 0; i < lines.length; i++) {
        checkPageBreak(6);
        doc.text(lines[i], margin + 6, y);
        y += 5;
      }
    }
    y += 4;
  }

  // ── PAGE 1: HEADER & SUMMARY ───────────────────────────

  // Branding
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(brandGray);
  doc.text('ConstructionGlue', margin, y);
  y += 10;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(titleColor);
  doc.text('DAILY CONSTRUCTION LOG', margin, y);
  y += 4;

  // Gray separator
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Project info block
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(bodyColor);

  const infoLines = [
    `Project: ${data.project.name}`,
    `Address: ${data.project.address}`,
    `Contract: ${data.project.contractNumber}`,
    `Date: ${data.date}`,
    `Prepared by: ${data.preparedBy.name}, ${data.preparedBy.role}`,
    `Report #: DL-${data.dateRaw}-001`,
  ];

  for (const line of infoLines) {
    doc.text(line, margin, y);
    y += 6;
  }
  y += 6;

  // ── WEATHER CONDITIONS ──────────────────────────────────

  if (data.weather) {
    addSectionTitle('WEATHER CONDITIONS');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(bodyColor);
    doc.text(`Condition: ${data.weather}`, margin, y);
    y += 6;
    if (data.weatherDetails) {
      doc.text(`Details: ${data.weatherDetails}`, margin, y);
      y += 6;
    }
    y += 4;
  }

  // ── WORKFORCE SUMMARY ───────────────────────────────────

  if (data.crew.length > 0) {
    addSectionTitle('WORKFORCE SUMMARY');

    const crewBody = data.crew.map(c => [c.company, String(c.count), c.role || '—']);
    const totalCount = data.crew.reduce((sum, c) => sum + c.count, 0);
    crewBody.push([{ content: 'TOTAL', styles: { fontStyle: 'bold' } } as unknown as string, { content: String(totalCount), styles: { fontStyle: 'bold' } } as unknown as string, '']);

    autoTable(doc, {
      startY: y,
      head: [['Trade / Company', 'Headcount', 'Role']],
      body: crewBody,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: headerFill,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      theme: 'striped',
    });

    const lastTable = (doc as unknown as Record<string, { finalY?: number }>).lastAutoTable;
    y = (lastTable?.finalY ?? y) + 8;
  } else if (data.crewCount !== undefined && data.crewCount > 0) {
    addSectionTitle('WORKFORCE SUMMARY');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(bodyColor);
    doc.text(`Total Crew: ${data.crewCount}`, margin, y);
    y += 10;
  }

  // ── PAGE 2+: WORK & ISSUES ─────────────────────────────

  // Work Performed
  const workBullets = data.workCompleted.map(w =>
    w.location ? `\u2022 ${w.description} \u2014 ${w.location}` : `\u2022 ${w.description}`
  );
  addBulletSection('WORK PERFORMED', workBullets);

  // Deliveries
  const deliveryBullets = data.deliveries.map(d =>
    `\u2022 ${d.material} [${d.status}] \u2014 ${d.details}`
  );
  addBulletSection('DELIVERIES', deliveryBullets);

  // Open Issues & Tagged Items
  if (data.taggedMessages.length > 0) {
    addSectionTitle('OPEN ISSUES & TAGGED ITEMS');

    autoTable(doc, {
      startY: y,
      head: [['Tag', 'Description', 'Reported By', 'Time']],
      body: data.taggedMessages.map(m => [m.tag, m.text, m.sender, m.time]),
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: headerFill,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 80 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
      },
      theme: 'striped',
    });

    const lastTable = (doc as unknown as Record<string, { finalY?: number }>).lastAutoTable;
    y = (lastTable?.finalY ?? y) + 8;
  }

  // Delays & Issues
  const delayBullets = data.delays.map(d =>
    `\u2022 ${d.issue} \u2014 Impact: ${d.impact}`
  );
  addBulletSection('DELAYS & ISSUES', delayBullets);

  // Inspections
  const inspectionBullets = data.inspections.map(i =>
    `\u2022 ${i.area} \u2014 ${i.inspector}: ${i.result}. ${i.details}`
  );
  addBulletSection('INSPECTIONS', inspectionBullets);

  // Visitors
  if (data.visitors && data.visitors.trim().length > 0) {
    addSectionTitle('VISITORS');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(bodyColor);
    const visitorLines = doc.splitTextToSize(data.visitors, contentWidth);
    for (const line of visitorLines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4;
  }

  // Daily Log Entry (raw narrative)
  if (data.rawEntry && data.rawEntry.trim().length > 0) {
    addSectionTitle('DAILY LOG ENTRY');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(bodyColor);
    const entryLines = doc.splitTextToSize(data.rawEntry, contentWidth);
    for (const line of entryLines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4;
  }

  // ── SIGNATURE BLOCK ─────────────────────────────────────

  checkPageBreak(40);

  // Gray separator
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(bodyColor);
  doc.text('Signature: _________________________________', margin, y);
  y += 8;
  doc.text(`${data.preparedBy.name}, ${data.preparedBy.role}`, margin, y);
  y += 6;
  doc.text(`Date: ${data.date}`, margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(footerGray);
  const now = new Date();
  const generatedAt = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  doc.text(`Generated by ConstructionGlue \u2014 ${generatedAt}`, margin, y);

  // ── PAGE FOOTER ON EVERY PAGE ───────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(footerGray);
    const footerText = `${data.project.name} \u2014 Daily Log ${data.date} \u2014 Page ${i} of ${totalPages}`;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, 290);
  }

  // ── SAVE ────────────────────────────────────────────────

  const safeProjectName = data.project.name.replace(/\s+/g, '_');
  const fileName = `DailyLog_${safeProjectName}_${data.dateRaw}.pdf`;
  doc.save(fileName);
}
