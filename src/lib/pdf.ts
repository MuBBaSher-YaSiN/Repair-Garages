// src/lib/pdf.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Job } from "@/types/job";

export async function generateJobPDF(job: Job, logoBytes?: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let { height, width } = page.getSize();
  let y = height - 70;
  const marginX = 40;

  const refreshPageMetrics = () => {
    const size = page.getSize();
    width = size.width;
    height = size.height;
  };

  const ensureSpace = (need: number) => {
    const bottomY = 40;
    if (y - need < bottomY) {
      page = pdfDoc.addPage([595, 842]);
      refreshPageMetrics();
      y = height - 70;
    }
  };

  const wrapText = (text: string, usedFont: any, size: number, maxWidth: number) => {
    const words = (text ?? "-").split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      const wWidth = usedFont.widthOfTextAtSize(test, size);
      if (wWidth <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        if (usedFont.widthOfTextAtSize(w, size) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            const t = chunk + ch;
            if (usedFont.widthOfTextAtSize(t, size) <= maxWidth) {
              chunk = t;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        } else {
          current = w;
        }
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // header gradient
  const headerHeight = 100;
  const gradientSteps = 20;
  const gradientWidth = width / gradientSteps;
  for (let i = 0; i < gradientSteps; i++) {
    const progress = i / gradientSteps;
    const color = rgb(0.35 - progress * 0.25, 0.1 + progress * 0.3, 0.6 + progress * 0.2);
    page.drawRectangle({
      x: i * gradientWidth,
      y: height - headerHeight,
      width: gradientWidth,
      height: headerHeight,
      color,
    });
  }

  if (logoBytes) {
    try {
      const logoImg = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImg, { x: marginX, y: height - 80, width: 100, height: 50 });
    } catch (e) {
      console.warn("Logo embedding failed", e);
    }
  }

  page.drawText("CAR INSPECTION REPORT", {
    x: marginX + 120,
    y: height - 65,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("Comprehensive Vehicle Assessment", {
    x: marginX + 120,
    y: height - 85,
    size: 12,
    font,
    color: rgb(0.9, 0.9, 0.9),
  });

  y = height - 140;

  // Info box
  ensureSpace(70 + 10);
  page.drawRectangle({
    x: marginX,
    y: y - 70,
    width: width - marginX * 2,
    height: 70,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
    color: rgb(0.96, 0.96, 1),
  });

  const infoLeft = [`FILE #: ${job._id || "-"}`, `CHASSIS #: ${job.engineNumber || "-"}`];
  const infoRight = [`INSPECTOR: ${job.customerName || "-"}`, `DATE: ${new Date().toISOString().slice(0, 10)}`];

  let infoY = y - 20;
  infoLeft.forEach((line) => {
    page.drawText(line, { x: marginX + 10, y: infoY, size: 11, font });
    infoY -= 15;
  });

  infoY = y - 20;
  infoRight.forEach((line) => {
    page.drawText(line, { x: width / 2 + 20, y: infoY, size: 11, font });
    infoY -= 15;
  });

  y -= 110;

  // Services + estimate table
  if (job.services && job.services.length > 0) {
    ensureSpace(22 + (job.services.length + 4) * 16);
    page.drawText("Services & Estimate", { x: marginX, y, size: 12, font: boldFont, color: rgb(0.13, 0.13, 0.13) });
    y -= 18;

    // headers
    page.drawText("Service", { x: marginX, y, size: 10, font: boldFont });
    page.drawText("Qty", { x: marginX + 260, y, size: 10, font: boldFont });
    page.drawText("Unit", { x: marginX + 320, y, size: 10, font: boldFont });
    page.drawText("Total", { x: marginX + 400, y, size: 10, font: boldFont });
    y -= 14;

    for (const s of job.services) {
      const nameLines = wrapText(s.name || "-", font, 10, width - marginX * 2 - 200);
      for (const ln of nameLines) {
        page.drawText(ln, { x: marginX, y, size: 10, font });
        y -= 12;
      }
      const rowY = y + 12 * nameLines.length;
      page.drawText(String(s.quantity ?? 1), { x: marginX + 260, y: rowY, size: 10, font });
      page.drawText((s.unitPrice ?? 0).toFixed(2), { x: marginX + 320, y: rowY, size: 10, font });
      page.drawText((s.totalPrice ?? 0).toFixed(2), { x: marginX + 400, y: rowY, size: 10, font });
    }

    // invoice summary
    y -= 12;
    ensureSpace(60);
    const inv = job.invoice || { subtotal: 0, tax: 0, total: 0 };
    page.drawText(`Subtotal: ${Number(inv.subtotal || 0).toFixed(2)}`, { x: marginX + 320, y, size: 11, font: boldFont });
    y -= 14;
    page.drawText(`Tax: ${Number(inv.tax || 0).toFixed(2)}`, { x: marginX + 320, y, size: 11, font: boldFont });
    y -= 14;
    page.drawText(`Total: ${Number(inv.total || inv.subtotal || 0).toFixed(2)}`, { x: marginX + 320, y, size: 12, font: boldFont });
    y -= 18;
  } else {
    page.drawText("No services recorded", { x: marginX, y, size: 11, font });
    y -= 18;
  }

  // Footer
  page.drawText(`Generated on ${new Date().toLocaleString()}`, { x: marginX, y: 30, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  return await pdfDoc.save();
}
