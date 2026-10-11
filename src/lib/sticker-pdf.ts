import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface StickerData {
  driverName: string;
  vehicleNumber: string;
  slug: string;
  vpa?: string;
  baseUrl?: string;
}

/**
 * Generates an A6 Landscape printable sticker PDF (148mm x 105mm)
 * A6 Landscape in points (72 points/inch, 1mm ~ 2.83465 pt):
 * Width: 148 * 2.83465 = ~419.5 pt
 * Height: 105 * 2.83465 = ~297.6 pt
 */
export async function generateA6StickerPdf(data: StickerData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const widthPt = 419.53;
  const heightPt = 297.64;

  const page = pdfDoc.addPage([widthPt, heightPt]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Background fill: soft clean off-white
  page.drawRectangle({
    x: 0,
    y: 0,
    width: widthPt,
    height: heightPt,
    color: rgb(0.98, 0.98, 0.97),
  });

  // Top header banner: AutoMitra branding (amber / emerald theme)
  page.drawRectangle({
    x: 0,
    y: heightPt - 48,
    width: widthPt,
    height: 48,
    color: rgb(0.12, 0.16, 0.22), // deep slate
  });

  page.drawText('AutoMitra', {
    x: 20,
    y: heightPt - 32,
    size: 20,
    font: fontBold,
    color: rgb(0.98, 0.75, 0.18), // warm amber
  });

  page.drawText('SECURE UPI FARE VERIFICATION', {
    x: 135,
    y: heightPt - 30,
    size: 9,
    font: fontBold,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Yellow warning stripe / border accent
  page.drawRectangle({
    x: 0,
    y: heightPt - 52,
    width: widthPt,
    height: 4,
    color: rgb(0.98, 0.75, 0.18),
  });

  // Left card: Driver details
  const leftX = 22;
  page.drawText('DRIVER / VEHICLE', {
    x: leftX,
    y: heightPt - 75,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.5),
  });

  page.drawText(data.driverName.toUpperCase(), {
    x: leftX,
    y: heightPt - 98,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Vehicle number badge
  page.drawRectangle({
    x: leftX,
    y: heightPt - 130,
    width: 170,
    height: 26,
    color: rgb(0.94, 0.95, 0.97),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
  });

  page.drawText(data.vehicleNumber.toUpperCase(), {
    x: leftX + 10,
    y: heightPt - 122,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  // Slug ID display
  page.drawText(`QR ID: ${data.slug}`, {
    x: leftX,
    y: heightPt - 146,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  // 3-step Passenger instructions
  const stepsY = heightPt - 170;
  page.drawText('PASSENGER STEPS:', {
    x: leftX,
    y: stepsY,
    size: 8,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.4),
  });

  const steps = [
    '1. Scan QR with any camera or UPI app',
    '2. Enter meter fare & pay via UPI',
    '3. Show 4-digit token on screen to driver',
  ];

  steps.forEach((step, idx) => {
    page.drawText(step, {
      x: leftX,
      y: stepsY - 16 * (idx + 1),
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.3),
    });
  });

  // Right side: QR Placeholder Frame
  const qrBoxSize = 180;
  const qrX = widthPt - qrBoxSize - 22;
  const qrY = 40;

  page.drawRectangle({
    x: qrX,
    y: qrY,
    width: qrBoxSize,
    height: qrBoxSize,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.85, 0.87, 0.9),
    borderWidth: 2,
  });

  page.drawText('SCAN TO PAY', {
    x: qrX + 45,
    y: qrY + qrBoxSize + 8,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.6, 0.3), // emerald
  });

  const landingUrl = `${data.baseUrl || 'https://automitra.in'}/q/${data.slug}`;
  page.drawText(landingUrl, {
    x: qrX + 10,
    y: qrY - 14,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Footer banner
  page.drawText('Verified by AutoMitra - Safe Keypad-SMS Fare Confirmation', {
    x: leftX,
    y: 12,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });

  return await pdfDoc.save();
}

/**
 * Triggers a direct browser download of the generated PDF
 */
export async function downloadA6StickerPdf(data: StickerData): Promise<void> {
  const bytes = await generateA6StickerPdf(data);
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AutoMitra_Sticker_${data.vehicleNumber.replace(/\s+/g, '')}_${data.slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
