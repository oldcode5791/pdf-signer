// Bring in our styles and the tools we need to run the app
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { renderDocument } from './renderer';
import { openSignaturePad } from './signature';
import { exportSignedPdf } from './export';

// Tell the PDF reader where to find its background worker brain
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Grab the main empty box on our webpage where the app will live
const app = document.querySelector<HTMLDivElement>('#app')!;

// Build the screen (the top menu and the drag-and-drop box)
app.innerHTML = `
  <div class="min-h-screen bg-slate-900 text-slate-200 flex flex-col h-screen overflow-hidden">
    <header class="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
      <h1 class="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
        <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        PDF Signer Core
      </h1>
      <div class="flex gap-3">
        <button id="btn-export" class="hidden bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm">
          Export PDF
        </button>
        <button id="btn-sign" class="hidden bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors border border-slate-600">
          Create Signature
        </button>
        <label class="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm">
          Load PDF
          <input type="file" id="file-upload" class="hidden" accept="application/pdf" />
        </label>
      </div>
    </header>
    
    <main id="document-container" class="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center cursor-default">
      <div id="drop-zone" class="w-full max-w-2xl border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-400 mt-20 flex flex-col items-center justify-center transition-colors">
        <svg class="w-12 h-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p class="text-lg font-medium text-slate-300">Drag and drop a PDF here</p>
        <p class="text-sm mt-1">or click "Load PDF" to browse</p>
      </div>
    </main>

    <!-- This is the tiny message that follows your mouse -->
    <div id="cursor-tooltip" class="hidden fixed pointer-events-none z-50 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap transition-opacity">
      Place Signature Here
    </div>
  </div>
`;

// Connect our code to the buttons and boxes on the screen
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
const container = document.getElementById('document-container') as HTMLDivElement;
const btnSign = document.getElementById('btn-sign') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const cursorTooltip = document.getElementById('cursor-tooltip') as HTMLDivElement;

// Memory to hold the picture of the signature and the raw PDF file
let activeSignaturePng: string | null = null;
export let rawPdfBuffer: ArrayBuffer | null = null; 

// What happens when someone gives us a file
const handleFile = async (file: File) => {
  // Make sure it is actually a PDF
  if (file.type !== 'application/pdf') {
    alert('Invalid format. Please supply a standard PDF.');
    return;
  }
  
  container.innerHTML = '<div class="text-indigo-400 mt-20 animate-pulse font-mono text-sm">Loading document...</div>';
  
  try {
    // Read the file and draw it on the screen
    rawPdfBuffer = await file.arrayBuffer();
    // We make a copy of the file (.slice(0)) so it doesn't crash later when saving
    await renderDocument(rawPdfBuffer.slice(0), container);
    
    // Show the hidden buttons now that a document is ready
    btnSign.classList.remove('hidden');
    btnExport.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-red-400 mt-20 font-mono text-sm">Error: Could not read the document.</div>';
  }
};

// Stop the web browser from opening the PDF taking over the whole tab when dragging
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Make the tooltip follow the mouse when a signature is ready to be placed
window.addEventListener('mousemove', (e) => {
  if (activeSignaturePng) {
    cursorTooltip.style.left = `${e.clientX + 15}px`;
    cursorTooltip.style.top = `${e.clientY + 15}px`;
  }
});

// Listen for when someone clicks "Load PDF"
fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
});

// Make the drop zone change colour when a file is hovering over it
container.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone?.classList.add('border-indigo-500', 'bg-slate-800');
});
container.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone?.classList.remove('border-indigo-500', 'bg-slate-800');
});

// Listen for when someone drops a file in
container.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone?.classList.remove('border-indigo-500', 'bg-slate-800');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

// What happens when you click "Create Signature"
btnSign.addEventListener('click', async () => {
  const signatureData = await openSignaturePad();
  if (signatureData) {
    // Save the picture, show the tooltip, and change the mouse pointer
    activeSignaturePng = signatureData;
    cursorTooltip.classList.remove('hidden');
    container.classList.add('cursor-crosshair');
  }
});

// What happens when you click "Export PDF"
btnExport.addEventListener('click', async () => {
  if (!rawPdfBuffer) return; // Do nothing if there's no PDF
  
  // Change the button text so the user knows it's working
  btnExport.textContent = 'Processing...';
  btnExport.classList.add('opacity-75', 'cursor-not-allowed');
  
  try {
    // Send the file to the export code to be glued together
    await exportSignedPdf(rawPdfBuffer);
  } catch (err) {
    console.error(err);
    alert('Something went wrong while saving the PDF.');
  } finally {
    // Change the button back when finished
    btnExport.textContent = 'Export PDF';
    btnExport.classList.remove('opacity-75', 'cursor-not-allowed');
  }
});

// What happens when you click on the actual document pages
container.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  // If you are clicking on a signature you already placed, do nothing
  if (target.closest('.sig-wrapper')) return;
  
  // Find which specific page you clicked on
  const pageWrapper = target.closest('.page-wrapper') as HTMLElement;
  
  // If you click a page but haven't made a signature yet, open the signature tool automatically
  if (!activeSignaturePng) {
    if (pageWrapper && rawPdfBuffer) {
      btnSign.click();
    }
    return;
  }
  
  // If you have a signature ready and clicked a page, place it!
  if (pageWrapper) {
    // Figure out the exact X and Y math of where the mouse clicked on the page
    const rect = pageWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create a special box to hold the signature so we can drag and resize it
    const sigWrapper = document.createElement('div');
    sigWrapper.className = 'absolute cursor-move border-2 border-transparent hover:border-indigo-500/50 rounded transition-colors z-20 sig-wrapper';
    
    // Put the box right where the mouse clicked (offset slightly so it centers on the pointer)
    sigWrapper.style.left = `${x - 75}px`; 
    sigWrapper.style.top = `${y - 40}px`;
    sigWrapper.style.width = '150px'; 
    sigWrapper.style.height = '80px';
    
    // Let the web browser add a drag handle to the bottom right corner for resizing
    sigWrapper.style.resize = 'both';
    sigWrapper.style.overflow = 'hidden';
    sigWrapper.style.minWidth = '50px';
    sigWrapper.style.minHeight = '30px';
    
    // Put the actual picture of the signature inside our special box
    const sigImg = document.createElement('img');
    sigImg.src = activeSignaturePng;
    sigImg.className = 'w-full h-full object-contain pointer-events-none';
    sigImg.draggable = false; // Stop the browser from accidentally opening the picture
    
    sigWrapper.appendChild(sigImg);
    
    // --- The dragging code ---
    let isDragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    
    // When the mouse button is pressed down on the signature box
    sigWrapper.addEventListener('mousedown', (dragEvent) => {
      // Check if they are trying to click the bottom-right resize corner
      const wrapRect = sigWrapper.getBoundingClientRect();
      const isResizeZone = dragEvent.clientX >= wrapRect.right - 20 && dragEvent.clientY >= wrapRect.bottom - 20;
      
      // If they are resizing, don't trigger the drag code
      if (isResizeZone) return; 
      
      dragEvent.preventDefault();
      dragEvent.stopPropagation();
      isDragging = true; // Turn dragging on
      
      // Remember where the mouse started
      startX = dragEvent.clientX;
      startY = dragEvent.clientY;
      startLeft = parseInt(sigWrapper.style.left || '0', 10);
      startTop = parseInt(sigWrapper.style.top || '0', 10);
    });
    
    // When the mouse moves (while dragging is turned on)
    window.addEventListener('mousemove', (moveEvent) => {
      if (!isDragging) return;
      // Calculate how far the mouse has moved and move the box the same amount
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      sigWrapper.style.left = `${startLeft + dx}px`;
      sigWrapper.style.top = `${startTop + dy}px`;
    });
    
    // When the mouse button is let go, turn dragging off
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Finally, stick the box onto the page
    pageWrapper.appendChild(sigWrapper);
    
    // Wipe the memory clean so they have to make a new signature next time
    activeSignaturePng = null;
    cursorTooltip.classList.add('hidden');
    container.classList.remove('cursor-crosshair');
  }
});
