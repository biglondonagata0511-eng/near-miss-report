import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Report } from '../types/report';
import { formatJapaneseDate, getDayOfWeekJapanese } from './dateUtils';

/**
 * Generate a PDF Blob from an HTML element
 */
export async function generatePdfBlobFromElement(
  element: HTMLElement,
  options?: { title?: string }
): Promise<Blob> {
  // Capture element using html2canvas with high DPI
  const canvas = await html2canvas(element, {
    scale: 2, // 2x resolution for crisp text
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  // Calculate scaled height based on A4 width
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  if (imgHeight <= pdfHeight) {
    // Fits on a single A4 page
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  } else {
    // Multi-page slicing
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
  }

  if (options?.title) {
    pdf.setProperties({
      title: options.title,
      subject: '介護事故・ヒヤリハット報告書',
      creator: '介護ヒヤリハット・事故報告システム',
    });
  }

  return pdf.output('blob');
}

/**
 * Generate a standalone self-contained HTML document
 */
export function generateStandaloneHtml(title: string, innerHtml: string): Blob {
  const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Meiryo UI', 'Meiryo', 'Hiragino Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      color: #0f172a;
    }
    .sheet-wrapper {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      box-sizing: border-box;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 8px;
    }
    th {
      background-color: #f8fafc;
      text-align: left;
    }
    @media print {
      body { background: white; padding: 0; }
      .sheet-wrapper { box-shadow: none; max-width: 100%; width: 100%; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; max-width: 210mm; margin: 0 auto 10px; font-size: 12px;">
    <span>【電子保管原本】このファイルはオフライン環境でも閲覧・印刷が可能です</span>
    <button onclick="window.print()" style="margin-left: 10px; padding: 4px 12px; cursor: pointer; font-weight: bold;">印刷する</button>
  </div>
  <div class="sheet-wrapper">
    ${innerHtml}
  </div>
</body>
</html>`;

  return new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
}

/**
 * Open file picker to let user choose the destination folder & filename,
 * or fallback to browser download if showSaveFilePicker is not supported or restricted.
 */
export async function saveWithLocationPicker(
  blob: Blob,
  suggestedFileName: string,
  extension: 'pdf' | 'html' | 'json'
): Promise<{
  success: boolean;
  method: 'picker' | 'download';
  canceled?: boolean;
  error?: string;
}> {
  const mimeTypes: Record<string, { desc: string; mime: string }> = {
    pdf: { desc: 'PDF ドキュメント (*.pdf)', mime: 'application/pdf' },
    html: { desc: 'HTML 公文書 (*.html)', mime: 'text/html' },
    json: { desc: 'JSON データファイル (*.json)', mime: 'application/json' },
  };

  const fileInfo = mimeTypes[extension] || mimeTypes.pdf;
  const cleanBaseName = suggestedFileName.replace(/\.(pdf|html|json)$/i, '');
  const finalFileName = `${cleanBaseName}.${extension}`;

  // 1. Try modern File System Access API: window.showSaveFilePicker
  // This opens the OS file explorer dialog ("名前を付けて保存"), letting the user browse to any folder!
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: finalFileName,
        types: [
          {
            description: fileInfo.desc,
            accept: {
              [fileInfo.mime]: [`.${extension}`],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return { success: true, method: 'picker' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User deliberately canceled the save dialog
        return { success: false, method: 'picker', canceled: true };
      }
      console.warn('showSaveFilePicker was not permitted or failed, falling back to download:', err);
    }
  }

  // 2. Fallback: Browser download trigger
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = finalFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 3000);

    return { success: true, method: 'download' };
  } catch (err: any) {
    return { success: false, method: 'download', error: err?.message || 'Download failed' };
  }
}
