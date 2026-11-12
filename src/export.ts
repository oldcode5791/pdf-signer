import { PDFDocument } from 'pdf-lib';

/**
 * Embeds all placed PNG signature overlays directly into the underlying PDF page coordinate
 * space using pdf-lib, translating browser top-left CSS pixels into PDF bottom-left points,
 * and triggers a local client-side download of `signed_document.pdf`.
 *
 * @param rawBytes - Fresh Uint8Array copy of the original uploaded PDF binary
 */
export const exportSignedPdf = async (rawBytes: Uint8Array) => {
  // Load original PDF structure in browser memory (tolerating owner-permission flags)
  const pdfDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });

  const pageWrappers = document.querySelectorAll('.page-wrapper');

  for (let i = 0; i < pageWrappers.length; i++) {
    const pageWrapper = pageWrappers[i] as HTMLElement;
    const pageNum = parseInt(pageWrapper.dataset.pageNumber || `${i + 1}`, 10);
    const pdfPage = pdfDoc.getPage(pageNum - 1);

    // Compute scale ratios between PDF point dimensions and rendered DOM pixel dimensions
    const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
    const wrapperRect = pageWrapper.getBoundingClientRect();

    if (wrapperRect.width === 0 || wrapperRect.height === 0) continue;

    const scaleX = pdfWidth / wrapperRect.width;
    const scaleY = pdfHeight / wrapperRect.height;

    const sigWrappers = pageWrapper.querySelectorAll('.sig-wrapper');

    for (let j = 0; j < sigWrappers.length; j++) {
      const sigEl = sigWrappers[j] as HTMLElement;
      const img = sigEl.querySelector('img');
      if (!img || !img.src) continue;

      // Decode base64 PNG Data URI into raw Uint8Array bytes for pdf-lib embedding
      const base64Parts = img.src.split(',');
      const base64Data = base64Parts[1];
      if (!base64Data) continue;

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let k = 0; k < len; k++) {
        bytes[k] = binaryString.charCodeAt(k);
      }

      const embeddedImage = await pdfDoc.embedPng(bytes);

      const elLeft = parseFloat(sigEl.style.left || '0');
      const elTop = parseFloat(sigEl.style.top || '0');
      const elWidth = parseFloat(sigEl.style.width || `${sigEl.offsetWidth}`);
      const elHeight = parseFloat(sigEl.style.height || `${sigEl.offsetHeight}`);

      // Convert top-left screen coordinates into bottom-left PDF coordinate space
      const pdfX = Math.max(0, elLeft * scaleX);
      const pdfW = Math.max(10, elWidth * scaleX);
      const pdfH = Math.max(10, elHeight * scaleY);
      const pdfY = Math.max(0, pdfHeight - (elTop + elHeight) * scaleY);

      pdfPage.drawImage(embeddedImage, {
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
      });
    }
  }

  // Serialize modified PDF binary and trigger immediate browser file download
  const modifiedPdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = 'signed_document.pdf';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
};
