// Bring in our styles and the tools we need to run the app
// @ts-ignore
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

// Build the screen (top menu, drag-and-drop box, and floating toast notifications)
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
    
    <main id="document-container" class="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center cursor-default relative">
      <div id="drop-zone" class="w-full max-w-2xl border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-400 mt-20 flex flex-col items-center justify-center transition-colors">
        <svg class="w-12 h-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p class="text-lg font-medium text-slate-300">Drag and drop a PDF here</p>
        <p class="text-sm mt-1">or click "Load PDF" to browse</p>
      </div>
    </main>

    <div id="placement-toast" class="opacity-0 pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 backdrop-blur text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 border border-indigo-400/30">
      <svg class="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
      <span id="placement-toast-text">Tap anywhere on the document to place your signature</span>
    </div>

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
const placementToast = document.getElementById('placement-toast') as HTMLDivElement;
const placementToastText = document.getElementById('placement-toast-text') as HTMLSpanElement;

let activeSignaturePng: string | null = null;
export let rawPdfBuffer: ArrayBuffer | null = null; 
let toastTimer: number | null = null;

const showPlacementNotification = () => {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  placementToastText.textContent = isTouchDevice 
    ? 'Tap document to place signature' 
    : 'Click document to place signature';
    
  placementToast.classList.remove('opacity-0', '-translate-y-2');
  placementToast.classList.add('opacity-100', 'translate-y-0');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hidePlacementNotification(), 6000);
};

const hidePlacementNotification = () => {
  placementToast.classList.remove('opacity-100', 'translate-y-0');
  placementToast.classList.add('opacity-0', '-translate-y-2');
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
};

const handleFile = async (file: File) => {
  if (file.type !== 'application/pdf') {
    alert('Invalid format. Please supply a standard PDF.');
    return;
  }
  
  container.innerHTML = '<div class="text-indigo-400 mt-20 animate-pulse font-mono text-sm">Loading document...</div>';
  
  try {
    rawPdfBuffer = await file.arrayBuffer();
    await renderDocument(rawPdfBuffer.slice(0), container);
    
    btnSign.classList.remove('hidden');
    btnExport.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-red-400 mt-20 font-mono text-sm">Error: Could not read the document.</div>';
  }
};

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

window.addEventListener('pointermove', (e) => {
  if (activeSignaturePng && e.pointerType === 'mouse') {
    cursorTooltip.style.left = `${e.clientX + 15}px`;
    cursorTooltip.style.top = `${e.clientY + 15}px`;
  }
});

fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
});

container.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone?.classList.add('border-indigo-500', 'bg-slate-800');
});
container.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone?.classList.remove('border-indigo-500', 'bg-slate-800');
});

container.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone?.classList.remove('border-indigo-500', 'bg-slate-800');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

btnSign.addEventListener('click', async () => {
  const signatureData = await openSignaturePad();
  if (signatureData) {
    activeSignaturePng = signatureData;
    cursorTooltip.classList.remove('hidden');
    container.classList.add('cursor-crosshair');
    showPlacementNotification();
  }
});

btnExport.addEventListener('click', async () => {
  if (!rawPdfBuffer) return;
  
  btnExport.textContent = 'Processing...';
  btnExport.classList.add('opacity-75', 'cursor-not-allowed');
  
  try {
    await exportSignedPdf(rawPdfBuffer);
  } catch (err) {
    console.error(err);
    alert('Something went wrong while saving the PDF.');
  } finally {
    btnExport.textContent = 'Export PDF';
    btnExport.classList.remove('opacity-75', 'cursor-not-allowed');
  }
});

container.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  if (target.closest('.sig-wrapper')) return;
  
  const pageWrapper = target.closest('.page-wrapper') as HTMLElement;
  
  if (!activeSignaturePng) {
    if (pageWrapper && rawPdfBuffer) {
      btnSign.click();
    }
    return;
  }
  
  if (pageWrapper) {
    const rect = pageWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const sigWrapper = document.createElement('div');
    sigWrapper.className = 'absolute cursor-move border-2 border-transparent hover:border-indigo-500/50 rounded transition-colors z-20 sig-wrapper touch-none select-none';
    
    sigWrapper.style.left = `${x - 75}px`; 
    sigWrapper.style.top = `${y - 40}px`;
    sigWrapper.style.width = '150px'; 
    sigWrapper.style.height = '80px';
    sigWrapper.style.resize = 'both';
    sigWrapper.style.overflow = 'hidden';
    sigWrapper.style.minWidth = '50px';
    sigWrapper.style.minHeight = '30px';
    
    const sigImg = document.createElement('img');
    sigImg.src = activeSignaturePng;
    sigImg.className = 'w-full h-full object-contain pointer-events-none select-none';
    sigImg.draggable = false;
    
    sigWrapper.appendChild(sigImg);
    
    let isDragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    
    sigWrapper.addEventListener('pointerdown', (dragEvent: PointerEvent) => {
      const wrapRect = sigWrapper.getBoundingClientRect();
      const isResizeZone = dragEvent.clientX >= wrapRect.right - 24 && dragEvent.clientY >= wrapRect.bottom - 24;
      if (isResizeZone) return; 
      
      dragEvent.preventDefault();
      dragEvent.stopPropagation();
      
      isDragging = true;
      startX = dragEvent.clientX;
      startY = dragEvent.clientY;
      startLeft = parseInt(sigWrapper.style.left || '0', 10);
      startTop = parseInt(sigWrapper.style.top || '0', 10);
      
      sigWrapper.setPointerCapture(dragEvent.pointerId);
    });
    
    sigWrapper.addEventListener('pointermove', (moveEvent: PointerEvent) => {
      if (!isDragging) return;
      moveEvent.preventDefault();
      
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      sigWrapper.style.left = `${startLeft + dx}px`;
      sigWrapper.style.top = `${startTop + dy}px`;
    });
    
    const stopDragging = (endEvent: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        sigWrapper.releasePointerCapture(endEvent.pointerId);
      } catch {
        // Ignored if already released
      }
    };

    sigWrapper.addEventListener('pointerup', stopDragging);
    sigWrapper.addEventListener('pointercancel', stopDragging);
    
    pageWrapper.appendChild(sigWrapper);
    
    activeSignaturePng = null;
    cursorTooltip.classList.add('hidden');
    container.classList.remove('cursor-crosshair');
    hidePlacementNotification();
  }
});
