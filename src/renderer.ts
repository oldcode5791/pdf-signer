import * as pdfjsLib from 'pdfjs-dist';

// This function takes a raw PDF file and paints it onto the webpage so you can see it
export async function renderDocument(buffer: ArrayBuffer, container: HTMLElement) {
  
  // Tell the PDF tool to open and read the file
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdfDoc = await loadingTask.promise;
  
  // Clear the screen before we start painting
  container.innerHTML = '';
  
  // Loop through every single page in the PDF document
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    
    // Get the current page
    const page = await pdfDoc.getPage(pageNum);
    
    // Make it 1.5 times bigger so it's easier to read
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    // Create a white box (a wrapper) to hold this specific page
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'page-wrapper relative bg-white shadow-xl rounded-sm mb-6 flex-shrink-0 cursor-crosshair overflow-hidden';
    
    // Stick a hidden tag on the box so we know which page number this is later
    pageWrapper.dataset.pageNumber = pageNum.toString();
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;
    
    // Create a digital canvas. This is what we actually paint the PDF onto.
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute top-0 left-0 w-full h-full pointer-events-none';
    
    // Check if the user has a fancy screen (like a Retina display) and double the pixels if they do so it isn't blurry
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    
    // Grab the "paintbrush" for the canvas
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    
    // Apply the blurry-screen fix to the paintbrush
    const transform = outputScale !== 1 
      ? [outputScale, 0, 0, outputScale, 0, 0] 
      : undefined;
    
    // Gather all our painting instructions together
    const renderContext = {
      canvasContext: context,
      transform: transform,
      viewport: viewport
    };
    
    // Put the canvas inside the white box, and put the white box on the screen
    pageWrapper.appendChild(canvas);
    container.appendChild(pageWrapper);
    
    // Tell the tool to finally paint the page!
    // @ts-ignore
    await page.render(renderContext).promise;
  }
}
