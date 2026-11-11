import * as pdfjsLib from 'pdfjs-dist';

export async function renderDocument(buffer: ArrayBuffer, container: HTMLElement) {
  // Engage the PDF.js document loading task
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdfDoc = await loadingTask.promise;
  
  // Clear the drop-zone / loading indicator
  container.innerHTML = '';
  
  // Iterate through every page sequentially
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    
    // Scale 1.5 provides a comfortable reading size on desktop monitors
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    // Create the structural wrapper for this specific page
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'relative bg-white shadow-xl rounded-sm mb-6 flex-shrink-0';
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;
    
    // Initialize the optical canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute top-0 left-0 w-full h-full';
    
    // Crucial Math: Compensate for device pixel ratios to prevent blurry rendering
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    
    // Apply the scaling matrix
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
    
    // Await rendering sequentially to prevent memory spikes on large manuals
    await page.render(renderContext).promise;
  }
}
