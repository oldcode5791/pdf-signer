import * as pdfjsLib from 'pdfjs-dist';

export async function renderDocument(buffer: ArrayBuffer, container: HTMLElement) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdfDoc = await loadingTask.promise;
  
  container.innerHTML = '';
  
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const pageWrapper = document.createElement('div');
    // Added 'page-wrapper' class and data attribute for targeting
    pageWrapper.className = 'page-wrapper relative bg-white shadow-xl rounded-sm mb-6 flex-shrink-0 cursor-crosshair overflow-hidden';
    pageWrapper.dataset.pageNumber = pageNum.toString();
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;
    
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute top-0 left-0 w-full h-full pointer-events-none';
    
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    
    const transform = outputScale !== 1 
      ? [outputScale, 0, 0, outputScale, 0, 0] 
      : undefined;
    
    const renderContext = {
      canvasContext: context,
      transform: transform,
      viewport: viewport
    };
    
    pageWrapper.appendChild(canvas);
    container.appendChild(pageWrapper);
    
    await page.render(renderContext).promise;
  }
}
