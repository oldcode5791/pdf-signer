import { PDFDocument } from 'pdf-lib';

export const exportSignedPdf = async (rawBuffer: ArrayBuffer) => {
  // Always create a clean copy of the ArrayBuffer so pdf-lib never hits a detached buffer
  const pdfBytes = rawBuffer.slice(0);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const pageWrappers = document.querySelectorAll('.page-wrapper');

  for (let i = 0; i < pageWrappers.length; i++) {
    const pageWrapper = pageWrappers[i] as HTMLElement;
    const pageNum = parseInt(pageWrapper.dataset.pageNumber || `${i + 1}`, 10);
    const pdfPage = pdfDoc.getPage(pageNum - 1);
    
    // Physical dimensions of the PDF page in points (72 DPI)
    const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
    
    // Rendered on-screen dimensions of the page wrapper
    const wrapperRect = pageWrapper.getBoundingClientRect();
    if (wrapperRect.width === 0 || wrapperRect.height === 0) continue;

    const scaleX = pdfWidth / wrapperRect.width;
    const scaleY = pdfHeight / wrapperRect.height;

    const sigWrappers = pageWrapper.querySelectorAll('.sig-wrapper');

    for (let j = 0; j < sigWrappers.length; j++) {
      const sigEl = sigWrappers[j] as HTMLElement;
      const img = sigEl.querySelector('img');
      if (!img || !img.src) continue;

      // Extract raw base64 PNG data
      const base64Data = img.src.split(',')[1];
      if (!base64Data) continue;

      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const embeddedImage = await pdfDoc.embedPng(imageBytes);

      // On-screen offsets relative to the page wrapper
      const elLeft = parseFloat(sigEl.style.left || '0');
      const elTop = parseFloat(sigEl.style.top || '0');
      const elWidth = parseFloat(sigEl.style.width || `${sigEl.offsetWidth}`);
      const elHeight = parseFloat(sigEl.style.height || `${sigEl.offsetHeight}`);

      // Translate HTML coordinates (top-left origin) to PDF coordinates (bottom-left origin)
      const pdfX = elLeft * scaleX;
      const pdfW = elWidth * scaleX;
      const pdfH = elHeight * scaleY;
      const pdfY = pdfHeight - ((elTop + elHeight) * scaleY);

      pdfPage.drawImage(embeddedImage, {
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
      });
    }
  }

  const modifiedPdfBytes = await pdfDoc.save();
  
  // Cast buffer to ArrayBuffer to satisfy Blob constructor typings in modern TypeScript
  const blob = new Blob([modifiedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = 'signed_document.pdf';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
};
