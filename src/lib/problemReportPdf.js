import { jsPDF } from 'jspdf';

// Builds a complete, standalone export of a Problem Search report (the same
// object rendered by src/modules/Experiments/tabs/ProblemReportTab.jsx and
// src/modules/shared/ProblemReportSections.jsx) — every section those two
// render, this renders too, in the same order, so the PDF is a faithful full
// export rather than a summary. Every section is optional here for the same
// reason it's optional there: reports generated before Product Update 3
// won't have the later fields at all.
//
// Colors/signal palette reused verbatim from the app (Landing/index.jsx's
// NAVY/OCEAN/TEAL/CYAN, ProblemReportTab.jsx's SIGNAL_META) rather than
// invented fresh, so the exported document doesn't visually drift from the
// in-app report — the RGB triplets below are those same hex values converted
// once, since jsPDF's color setters take numeric channels, not hex strings.

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 12;

const COLOR = {
  navy:   [27, 58, 107],    // #1B3A6B — titles
  ocean:  [42, 96, 153],    // #2A6099 — section labels
  teal:   [24, 144, 144],   // #189090 — eyebrow / accents
  body:   [51, 65, 85],     // #334155 — body copy
  muted:  [100, 116, 139],  // #64748B — meta text, footer
  faint:  [148, 163, 184],  // #94A3B8 — quiet captions
  card:   [248, 250, 252],  // #F8FAFC — card fill
  border: [226, 232, 240],  // #E2E8F0 — card/divider lines
  white:  [255, 255, 255],
  mint:   [127, 212, 199],  // #7FD4C7 — light accent on dark fills (executive summary label), matches ProblemReportSections.jsx's in-app equivalent
  good:   [6, 95, 70],      // #065F46 — competitor strengths
  warn:   [146, 64, 14],    // #92400E — competitor weaknesses
};

const SIGNAL_META = {
  STRONG:   { color: [5, 150, 105],  bg: [236, 253, 245], label: 'Strong signal' },
  MODERATE: { color: [0, 85, 255],   bg: [239, 246, 255], label: 'Moderate signal' },
  WEAK:     { color: [217, 119, 6],  bg: [255, 251, 235], label: 'Weak signal' },
  SILENT:   { color: [220, 38, 38],  bg: [254, 242, 242], label: 'Silent — no evidence found' },
  ERROR:    { color: [100, 116, 139], bg: [241, 245, 249], label: 'Search unavailable' },
};

// pt -> mm line height with a bit of leading, tuned for readability rather
// than exact typographic precision (this is a data export, not a design doc).
const lineHeightMm = (fontSizePt) => fontSizePt * 0.3528 * 1.35;

function makeCursor(doc) {
  let y = MARGIN;
  const setColor = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  return {
    ensureSpace(needed) {
      if (y + needed > PAGE_HEIGHT - MARGIN - 6) {
        doc.addPage();
        y = MARGIN;
      }
    },
    title(text) {
      // jsPDF's text(x, y) treats y as the baseline — a big jump in font size
      // right after a small line needs real headroom for the larger font's
      // own ascent, or it visually overlaps whatever was drawn above it
      // (confirmed live: a 20pt title right after a 9pt eyebrow line
      // overlapped it). Padding by a fraction of this font's own size (not
      // the previous line's) is what actually clears that, regardless of
      // what came before.
      y += 20 * 0.3528 * 0.5;
      this.ensureSpace(lineHeightMm(20) + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      setColor(COLOR.navy);
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
      for (const line of lines) {
        this.ensureSpace(lineHeightMm(20));
        doc.text(line, MARGIN, y);
        y += lineHeightMm(20);
      }
      y += 1;
    },
    eyebrow(text) {
      this.ensureSpace(lineHeightMm(9));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(COLOR.teal);
      doc.text(text.toUpperCase(), MARGIN, y);
      y += lineHeightMm(9) + 1;
    },
    // A colored pill, e.g. the signal badge — sized to its own text.
    badge(text, { color, bg }) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const textW = doc.getTextWidth(text.toUpperCase());
      const padX = 3.5, h = 7;
      this.ensureSpace(h + 3);
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.roundedRect(MARGIN, y, textW + padX * 2, h, h / 2, h / 2, 'F');
      setColor(color);
      doc.text(text.toUpperCase(), MARGIN + padX, y + h / 2 + 1.2);
      y += h + 5;
    },
    // Section heading: small accent dot + uppercase label, matching the
    // app's own SectionHeading pattern (a colored dot beside an uppercase
    // muted-ocean label) rather than a plain bold black line.
    sectionLabel(text) {
      this.ensureSpace(lineHeightMm(10) + 3);
      y += 2;
      doc.setFillColor(COLOR.teal[0], COLOR.teal[1], COLOR.teal[2]);
      doc.circle(MARGIN + 1, y - 1.2, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(COLOR.ocean);
      doc.text(text.toUpperCase(), MARGIN + 4.5, y);
      y += lineHeightMm(10) + 2;
    },
    paragraph(text, { size = 10, color = COLOR.body, italic = false } = {}) {
      if (!text) return;
      doc.setFont('helvetica', italic ? 'italic' : 'normal');
      doc.setFontSize(size);
      setColor(color);
      const lh = lineHeightMm(size);
      const lines = doc.splitTextToSize(String(text), CONTENT_WIDTH);
      for (const line of lines) {
        this.ensureSpace(lh);
        doc.text(line, MARGIN, y);
        y += lh;
      }
      y += 2.5;
    },
    divider() {
      this.ensureSpace(6);
      y += 2;
      doc.setDrawColor(COLOR.border[0], COLOR.border[1], COLOR.border[2]);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 5;
    },
    gap(mm = 4) {
      y += mm;
    },
    getY() { return y; },
  };
}

// Evidence-wall / competitor entries need their card background drawn BEHIND
// the text, but the cursor only knows the card's height once the text inside
// it has been wrapped — so this measures the wrapped line count up front
// (splitTextToSize, the same jsPDF API the cursor's own paragraph() uses),
// draws the card rect first, then the text on top, rather than going through
// the generic cursor which lays text down immediately.
function addCard(doc, c, lines, { fill } = {}) {
  const size = 9.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  const lh = lineHeightMm(size);
  const wrapped = lines.flatMap(({ text, bold, color }) => {
    const split = doc.splitTextToSize(text, CONTENT_WIDTH - 6);
    return split.map((line, i) => ({ line, bold, color, first: i === 0 }));
  });
  const cardHeight = wrapped.length * lh + 6;
  c.ensureSpace(cardHeight + 3);
  const startY = c.getY();
  const fillColor = fill || COLOR.card;
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(COLOR.border[0], COLOR.border[1], COLOR.border[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN - 3, startY - 4, CONTENT_WIDTH + 6, cardHeight, 2, 2, 'FD');
  let y = startY;
  for (const { line, bold, color } of wrapped) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(line, MARGIN, y);
    y += lh;
  }
  c.gap(cardHeight - (wrapped.length * lh) + 3);
}

// A quick "at a glance" KPI row — mentions/competitors/suggested price — the
// same metrics ProblemReportSections.jsx shows as its stat strip in the web
// app, so the PDF and the in-app views read as the same report family. Not
// drawn via the cursor's own text helpers since jsPDF has no flexbox; this
// lays out `tiles.length` equal-width boxes side by side at the cursor's
// current y, then advances the cursor past them with c.gap().
function addStatStrip(doc, c, tiles) {
  if (tiles.length === 0) return;
  const gap = 4, tileHeight = 14;
  const tileWidth = (CONTENT_WIDTH - gap * (tiles.length - 1)) / tiles.length;
  c.ensureSpace(tileHeight + 5);
  const startY = c.getY();
  tiles.forEach((tile, i) => {
    const x = MARGIN + i * (tileWidth + gap);
    doc.setFillColor(COLOR.card[0], COLOR.card[1], COLOR.card[2]);
    doc.setDrawColor(COLOR.border[0], COLOR.border[1], COLOR.border[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, startY, tileWidth, tileHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR.faint[0], COLOR.faint[1], COLOR.faint[2]);
    doc.text(tile.label.toUpperCase(), x + 3, startY + 5.5);
    doc.setFontSize(11);
    doc.setTextColor(COLOR.navy[0], COLOR.navy[1], COLOR.navy[2]);
    doc.text(String(tile.value), x + 3, startY + 11.5);
  });
  c.gap(tileHeight + 4);
}

function stampFooters(doc, subtitle) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(COLOR.border[0], COLOR.border[1], COLOR.border[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, FOOTER_Y - 4, PAGE_WIDTH - MARGIN, FOOTER_Y - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR.faint[0], COLOR.faint[1], COLOR.faint[2]);
    doc.text(subtitle || 'Generated by theLab · trythelab.com', MARGIN, FOOTER_Y);
    doc.text(`Page ${i} of ${total}`, PAGE_WIDTH - MARGIN, FOOTER_Y, { align: 'right' });
  }
}

function sanitizeFilename(name) {
  const cleaned = (name || 'experiment').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${cleaned || 'experiment'}-problem-report.pdf`;
}

// Split from generateProblemReportPdf() below so the document-building logic
// (the part actually worth testing) can run headlessly in Node — jsPDF's
// .save() reaches for browser-only APIs (document/window) to trigger a
// download, so it can't be exercised outside a real browser.
export function buildProblemReportPdfDoc(report, { title } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const c = makeCursor(doc);
  const meta = SIGNAL_META[report.signal] || SIGNAL_META.WEAK;

  c.eyebrow('Problem search report');
  c.title(title || 'Problem Search Report');
  c.badge(meta.label, meta);

  // Skipped for ERROR — the search infrastructure failed, so mentions/
  // competitors/price would all render as misleading zeros rather than a
  // real reading. Same rule as the web app's stat strip.
  if (report.signal !== 'ERROR') {
    const tiles = [
      { label: 'Mentions', value: `${report.mentionCount ?? 0}${report.totalRawCount ? ` / ${report.totalRawCount}` : ''}` },
      { label: 'Competitors', value: report.competition?.named?.length ?? 0 },
    ];
    if (report.suggestedPrice) {
      tiles.push({ label: 'Suggested price', value: `${report.suggestedPrice.currency} ${report.suggestedPrice.amount}` });
    }
    addStatStrip(doc, c, tiles);
  }

  if (report.problem) {
    c.paragraph(`"${report.problem}"${report.icp ? ` — ${report.icp}` : ''}`, { size: 10.5, color: COLOR.muted, italic: true });
  }

  if (report.executiveSummary) {
    c.gap(1);
    addCard(doc, c, [
      { text: 'EXECUTIVE SUMMARY', bold: true, color: COLOR.mint },
      { text: report.executiveSummary, bold: false, color: COLOR.white },
    ], { fill: COLOR.navy });
    c.gap(1);
  }

  if (report.signal === 'ERROR' || report.signal === 'SILENT') {
    // No real evidence to show for either of these — give the explanation
    // real visual weight (a tinted panel matching the badge's own color)
    // instead of leaving it as plain paragraphs that blend into everything
    // else, so a failed/empty search still reads as a deliberately designed
    // report state, not a bare placeholder.
    const lines = [];
    if (report.interpretation) lines.push({ text: report.interpretation, bold: true, color: meta.color });
    if (report.weakSpots) lines.push({ text: report.weakSpots, bold: false, color: COLOR.body });
    if (lines.length > 0) {
      c.gap(1);
      addCard(doc, c, lines, { fill: meta.bg });
      c.gap(1);
    }
    if (report.facetInsight) {
      c.paragraph(report.facetInsight, { size: 10, color: COLOR.body });
    }
  } else {
    if (report.interpretation) {
      c.paragraph(report.interpretation, { size: 11, color: COLOR.navy });
    }
    if (report.facetInsight) {
      c.paragraph(report.facetInsight, { size: 10, color: COLOR.body });
    }
  }

  if (report.evidenceWall?.length > 0) {
    c.divider();
    c.sectionLabel(`Evidence wall (${report.mentionCount ?? report.evidenceWall.length} of ${report.totalRawCount ?? report.evidenceWall.length} raw mentions)`);
    for (const e of report.evidenceWall) {
      const metaLine = [e.platform?.toUpperCase(), e.intensity != null ? `intensity ${e.intensity}/5` : null, e.date].filter(Boolean).join('   ·   ');
      addCard(doc, c, [
        ...(metaLine ? [{ text: metaLine, bold: true, color: COLOR.faint }] : []),
        { text: `"${e.quote}"`, bold: false, color: COLOR.body },
      ]);
    }
  }

  if (report.vocabulary?.length > 0) {
    c.divider();
    c.sectionLabel("Founder framing vs market's words");
    for (const v of report.vocabulary) {
      // jsPDF's default Helvetica uses WinAnsi encoding, which doesn't
      // include U+2192 (→) — confirmed live: it silently corrupted the
      // entire line's spacing, not just the glyph itself. ASCII "->" only.
      c.paragraph(`${v.founderTerm}   ->   ${v.marketTerm}`, { size: 10, color: COLOR.body });
    }
  }

  // ERROR/SILENT already showed weakSpots inside the tinted callout above.
  if (report.weakSpots && report.signal !== 'ERROR' && report.signal !== 'SILENT') {
    c.gap(2);
    c.paragraph(report.weakSpots, { size: 9.5, color: COLOR.muted, italic: true });
  }

  if (report.marketExistence) {
    c.divider();
    c.sectionLabel(`Market existence evidence${report.marketExistence.signal ? ` (${report.marketExistence.signal})` : ''}`);
    if (report.marketExistence.interpretation) c.paragraph(report.marketExistence.interpretation, { size: 10 });
    for (const f of report.marketExistence.findings || []) {
      c.paragraph(`•  ${f.title}${f.relevance ? ` — ${f.relevance}` : ''}`, { size: 9.5, color: COLOR.muted });
    }
  }

  if (report.competition) {
    c.divider();
    c.sectionLabel('Competitive landscape');
    if (report.competition.named?.length > 0) {
      for (const comp of report.competition.named) {
        const nameLine = comp.name
          + (comp.sentimentSummary ? `  —  ${comp.sentimentSummary}` : '')
          + (comp.pricingModel ? `  (${comp.pricingModel})` : '');
        const lines = [{ text: nameLine, bold: true, color: COLOR.navy }];
        if (comp.pricingFound?.length > 0) {
          lines.push({ text: `Pricing found: ${comp.pricingFound.map(p => `${p.currency} ${p.amount}`).join(', ')}`, bold: false, color: COLOR.muted });
        }
        if (comp.complaints?.length > 0) {
          lines.push({ text: `"${comp.complaints[0].quote}" — ${comp.complaints[0].platform}`, bold: false, color: COLOR.body });
        }
        if (comp.strengths) lines.push({ text: `Strengths: ${comp.strengths}`, bold: false, color: COLOR.good });
        if (comp.weaknesses) lines.push({ text: `Weaknesses: ${comp.weaknesses}`, bold: false, color: COLOR.warn });
        if (comp.counterPositioning) lines.push({ text: `How to win: ${comp.counterPositioning}`, bold: false, color: COLOR.body });
        addCard(doc, c, lines);
      }
    } else {
      c.paragraph(report.competition.coverageNote || 'No direct competitor found.', { size: 10, color: COLOR.muted });
    }
    if (report.competition.citations?.length > 0) {
      c.gap(1);
      c.paragraph(`Sources: ${report.competition.citations.join('   ·   ')}`, { size: 8, color: COLOR.faint });
    }
  }

  if (report.marketGap?.gapStatement) {
    c.divider();
    c.sectionLabel('Market gap');
    c.paragraph(report.marketGap.gapStatement, { size: 10 });
  }

  if (report.suggestedNicheFit?.pickedCandidate) {
    c.divider();
    c.sectionLabel('Suggested niche fit');
    c.paragraph(`${report.suggestedNicheFit.pickedCandidate}${report.suggestedNicheFit.rationale ? ` — ${report.suggestedNicheFit.rationale}` : ''}`, { size: 10 });
  }

  if (report.suggestedPrice) {
    c.divider();
    c.sectionLabel('Suggested price');
    c.paragraph(`${report.suggestedPrice.currency} ${report.suggestedPrice.amount}${report.suggestedPrice.rationale ? ` — ${report.suggestedPrice.rationale}` : ''}`, { size: 10 });
  }

  if (report.utilityIdentity) {
    c.divider();
    c.sectionLabel(`Utility / identity — ${report.utilityIdentity.classification || ''}`);
    let text = report.utilityIdentity.rationale || '';
    if (report.utilityIdentity.classification === 'IDENTITY') {
      text += ' This kind of idea needs the ads engine, not email outreach — not available yet in this pipeline.';
    }
    c.paragraph(text, { size: 10 });
  }

  if (report.queriesUsed?.length > 0) {
    c.divider();
    c.sectionLabel('Search queries used');
    c.paragraph(report.queriesUsed.join('   ·   '), { size: 8.5, color: COLOR.faint });
  }

  stampFooters(doc, title ? `${title} · Problem Search Report` : undefined);
  return doc;
}

export function generateProblemReportPdf(report, { title } = {}) {
  const doc = buildProblemReportPdfDoc(report, { title });
  doc.save(sanitizeFilename(title));
}
