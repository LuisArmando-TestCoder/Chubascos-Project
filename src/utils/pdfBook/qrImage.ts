// Generates a QR code as a PNG data URL for embedding in the PDF via addImage.

import QRCode from 'qrcode';

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 8,
    color: {
      dark: '#111111ff',
      light: '#ffffffff',
    },
  });
}
