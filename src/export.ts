import { PDFDocument } from 'pdf-lib';

export async function exportSignedPdf(originalBuffer: ArrayBuffer) {
  const pdfDoc = await PDFDocument.load(originalBuffer.slice(0));
  const pages = pdfDoc.getPages();

  const pageWrappers = document.querySelectorAll('.page-wrapper');

  for (let i = 0; i < pageWrappers.length; i++) {
    const wrapper = pageWrappers[i] as HTMLElement;
    const pageIndex = parseInt(wrapper.dataset.pageNumber || '1', 10) - 1;
    
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const pdfPage = pages[pageIndex];
    const pdfWidth = pdfPage.getWidth();
    const pdfHeight = pdfPage.getHeight();
    
    const domWidth = wrapper.offsetWidth;
    const domHeight = wrapper.offsetHeight;

    // Scan for our new resizable wrappers instead of raw images
    const signatures = wrapper.querySelectorAll('.sig-wrapper');
    
    for (let j = 0; j < signatures.length; j++) {
      const sigWrap = signatures[j] as HTMLElement;
      const img = sigWrap.querySelector('img') as HTMLImageElement;
      
      const imgResponse = await fetch(img.src);
      const imgArrayBuffer = await imgResponse.arrayBuffer();
      const pngImage = await pdfDoc.embedPng(imgArrayBuffer);
      
      const scaleX = pdfWidth / domWidth;
      const scaleY = pdfHeight / domHeight;
      
      // Pull dimensions and coordinates from the resized wrapper box
      const pdfImgWidth = sigWrap.offsetWidth * scaleX;
      const pdfImgHeight = sigWrap.offsetHeight * scaleY;
      
      const pdfImgX = sigWrap.offsetLeft * scaleX;
      const pdfImgY = pdfHeight - (sigWrap.offsetTop * scaleY) - pdfImgHeight;
      
      pdfPage.drawImage(pngImage, {
        x: pdfImgX,
        y: pdfImgY,
        width: pdfImgWidth,
        height: pdfImgHeight,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'signed_document.pdf';
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
