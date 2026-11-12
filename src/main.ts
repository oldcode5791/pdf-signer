// Bring in our styles and the tools we need to run the app
// @ts-ignore
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  renderDocument, 
  clearRendererDoc, 
  createSignatureElement, 
  selectedSigWrapper, 
  setSelectedSignature 
} from './renderer';
import { openSignaturePad } from './signature';
import { exportSignedPdf } from './export';

// Configure the background PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="min-h-screen bg-slate-900 text-slate-200 flex flex-col h-screen overflow-hidden relative">
    <header class="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
      <div class="flex items-center gap-3">
        <button id="btn-home" class="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-600/30 transition-colors" title="Return to Home">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        </button>
        <span class="text-base font-semibold tracking-tight text-white hidden sm:inline">PDF Signer Core</span>
      </div>

      <!-- Zoom Controls -->
      <div id="zoom-controls" class="hidden items-center gap-1.5 bg-slate-900/80 border border-slate-700 rounded-xl px-2 py-1 shadow-inner">
        <button id="btn-zoom-out" class="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm transition-colors" title="Zoom Out">−</button>
        <span id="zoom-label" class="text-xs font-mono font-medium text-slate-300 min-w-[3.2rem] text-center select-none">100%</span>
        <button id="btn-zoom-in" class="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm transition-colors" title="Zoom In">+</button>
        <div class="w-px h-4 bg-slate-700 mx-1"></div>
        <button id="btn-zoom-fit" class="text-xs px-2 py-1 rounded-lg hover:bg-slate-700 text-indigo-300 font-medium transition-colors" title="Fit to Page">Fit</button>
      </div>

      <div class="flex items-center gap-3">
        <button id="btn-export" class="hidden bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-all shadow-sm">
          Export PDF
        </button>
        <button id="btn-sign" class="hidden bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-all shadow-sm ring-2 ring-indigo-400/50">
          Create Signature
        </button>
        <label id="header-upload-label" class="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors border border-slate-600">
          Open Document
          <input type="file" id="file-upload" class="hidden" accept="application/pdf" />
        </label>
      </div>
    </header>
    
    <main id="document-container" class="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center justify-center cursor-default relative">
      <div id="drop-zone" class="w-full max-w-xl bg-slate-900/90 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-10 text-center transition-all shadow-2xl flex flex-col items-center">
        
        <div class="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">Sign PDF Documents Safely</h2>
        <p class="text-slate-400 text-sm max-w-sm mb-6">Drag and drop your PDF here, or select a file from your device to begin signing immediately.</p>

        <label for="file-upload" class="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 mb-8">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Select PDF Document
        </label>

        <div class="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-800 text-xs text-slate-400">
          <div class="flex flex-col items-center">
            <span class="font-semibold text-slate-300 mb-1">1. Choose</span>
            <span>Open your PDF</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="font-semibold text-slate-300 mb-1">2. Sign</span>
            <span>Draw or type</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="font-semibold text-slate-300 mb-1">3. Download</span>
            <span>Export clean copy</span>
          </div>
        </div>

        <div class="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          100% Private: Documents never leave your browser
        </div>
      </div>
    </main>

    <!-- Disappearing toast guidance -->
    <div id="placement-toast" class="opacity-0 pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 backdrop-blur text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 border border-indigo-400/30">
      <svg class="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
      <span id="placement-toast-text"></span>
    </div>

    <!-- Mouse hover tooltip for desktop -->
    <div id="cursor-tooltip" class="hidden fixed pointer-events-none z-50 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap transition-opacity">
      Place Signature Here
    </div>

    <!-- Post-Export Success Modal -->
    <div id="success-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        
        <h3 class="text-xl font-bold text-white mb-2">Signed PDF Downloaded!</h3>
        <p class="text-slate-400 text-sm mb-6">Your modified document has been downloaded directly to your device. No files were stored on any server.</p>

        <div class="flex flex-col gap-3 w-full">
          <button id="btn-sign-another" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Sign Another Document
          </button>
          <button id="btn-keep-editing" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-6 rounded-xl border border-slate-700 transition-colors">
            Keep Editing This File
          </button>
        </div>

        <div class="mt-6 pt-5 border-t border-slate-800/80 w-full flex flex-col items-center">
          <p class="text-xs text-slate-400 mb-3">Saved you a $20/month subscription?</p>
          <a href="https://buymeacoffee.com/curiouslyso" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 text-sm font-semibold border border-amber-500/40 transition-all hover:scale-105 shadow-md">
            <span class="text-lg">☕</span>
            <span>Buy Me a Coffee</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Support Button with Attention Pulse -->
    <a id="btn-support-pill" href="https://buymeacoffee.com/curiouslyso" target="_blank" rel="noopener noreferrer" class="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-amber-300 font-medium text-sm border-2 border-amber-500/40 hover:border-amber-400 shadow-xl backdrop-blur transition-all duration-300 hover:scale-105" title="Support the project on Buy Me a Coffee">
      <span class="text-lg leading-none">☕</span>
      <span>Support the dev</span>
    </a>
  </div>
`;

// References
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const container = document.getElementById('document-container') as HTMLDivElement;
const btnHome = document.getElementById('btn-home') as HTMLButtonElement;
const btnSign = document.getElementById('btn-sign') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const cursorTooltip = document.getElementById('cursor-tooltip') as HTMLDivElement;
const placementToast = document.getElementById('placement-toast') as HTMLDivElement;
const placementToastText = document.getElementById('placement-toast-text') as HTMLSpanElement;
const btnSupportPill = document.getElementById('btn-support-pill') as HTMLAnchorElement;

// Zoom references
const zoomControls = document.getElementById('zoom-controls') as HTMLDivElement;
const btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
const btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
const btnZoomFit = document.getElementById('btn-zoom-fit') as HTMLButtonElement;
const zoomLabel = document.getElementById('zoom-label') as HTMLSpanElement;

// Modal references
const successModal = document.getElementById('success-modal') as HTMLDivElement;
const btnSignAnother = document.getElementById('btn-sign-another') as HTMLButtonElement;
const btnKeepEditing = document.getElementById('btn-keep-editing') as HTMLButtonElement;

let activeSignaturePng: string | null = null;
export let rawPdfBuffer: ArrayBuffer | null = null; 
let currentScale = 1.0;
let toastTimer: number | null = null;

const flashSupportButton = () => {
  if (!btnSupportPill) return;
  btnSupportPill.classList.add('animate-pulse', 'ring-4', 'ring-amber-400/50', 'border-amber-400');
  setTimeout(() => {
    btnSupportPill.classList.remove('animate-pulse', 'ring-4', 'ring-amber-400/50');
  }, 4500);
};
flashSupportButton();

const showNotification = (message: string, durationMs = 6000) => {
  placementToastText.textContent = message;
  placementToast.classList.remove('opacity-0', '-translate-y-2');
  placementToast.classList.add('opacity-100', 'translate-y-0');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hideNotification(), durationMs);
};

const hideNotification = () => {
  placementToast.classList.remove('opacity-100', 'translate-y-0');
  placementToast.classList.add('opacity-0', '-translate-y-2');
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
};

const updateZoomLabel = () => {
  zoomLabel.textContent = `${Math.round(currentScale * 100)}%`;
};

const renderPdfWithZoom = async (targetScale?: number) => {
  if (!rawPdfBuffer) return;
  currentScale = await renderDocument(rawPdfBuffer, container, targetScale);
  updateZoomLabel();
};

const resetToHome = () => {
  rawPdfBuffer = null;
  activeSignaturePng = null;
  fileInput.value = '';
  clearRendererDoc();
  
  btnSign.classList.add('hidden');
  btnExport.classList.add('hidden');
  zoomControls.classList.add('hidden');
  zoomControls.classList.remove('flex');
  btnExport.classList.remove('animate-pulse', 'ring-2', 'ring-emerald-400');
  btnSign.classList.remove('animate-pulse');
  
  hideNotification();
  cursorTooltip.classList.add('hidden');
  successModal.classList.add('hidden');

  container.classList.add('justify-center');
  container.innerHTML = `
    <div id="drop-zone" class="w-full max-w-xl bg-slate-900/90 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-10 text-center transition-all shadow-2xl flex flex-col items-center">
      <div class="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
      </div>

      <h2 class="text-2xl font-bold text-white mb-2">Sign PDF Documents Safely</h2>
      <p class="text-slate-400 text-sm max-w-sm mb-6">Drag and drop your PDF here, or select a file from your device to begin signing immediately.</p>

      <label for="file-upload" class="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 mb-8">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Select PDF Document
      </label>

      <div class="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-800 text-xs text-slate-400">
        <div class="flex flex-col items-center">
          <span class="font-semibold text-slate-300 mb-1">1. Choose</span>
          <span>Open your PDF</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="font-semibold text-slate-300 mb-1">2. Sign</span>
          <span>Draw or type</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="font-semibold text-slate-300 mb-1">3. Download</span>
          <span>Export clean copy</span>
        </div>
      </div>

      <div class="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        100% Private: Documents never leave your browser
      </div>
    </div>
  `;
};

const handleFile = async (file: File) => {
  if (file.type !== 'application/pdf') {
    alert('Invalid format. Please supply a standard PDF document.');
    return;
  }
  
  clearRendererDoc();
  container.classList.remove('justify-center');
  container.innerHTML = '<div class="text-indigo-400 mt-20 animate-pulse font-mono text-sm">Loading document...</div>';
  
  try {
    rawPdfBuffer = await file.arrayBuffer();
    await renderPdfWithZoom();
    
    btnSign.classList.remove('hidden');
    btnExport.classList.remove('hidden');
    zoomControls.classList.remove('hidden');
    zoomControls.classList.add('flex');
    btnSign.classList.add('animate-pulse');

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const actionVerb = isTouch ? 'Tap' : 'Click';
    showNotification(`${actionVerb} anywhere on the document or click "Create Signature" to sign`, 7000);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-red-400 mt-20 font-mono text-sm">Error: Could not read the document.</div>';
  }
};

// Keyboard Shortcuts: Delete selected signature, Escape to close modals or cancel placement
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (activeSignaturePng) {
      activeSignaturePng = null;
      cursorTooltip.classList.add('hidden');
      container.classList.remove('cursor-crosshair');
      hideNotification();
    }
    if (!successModal.classList.contains('hidden')) {
      successModal.classList.add('hidden');
    }
    setSelectedSignature(null);
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSigWrapper) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      selectedSigWrapper.remove();
      setSelectedSignature(null);
    }
  }
});

btnZoomIn.addEventListener('click', () => {
  if (currentScale < 2.5) renderPdfWithZoom(Math.min(2.5, currentScale + 0.15));
});

btnZoomOut.addEventListener('click', () => {
  if (currentScale > 0.4) renderPdfWithZoom(Math.max(0.4, currentScale - 0.15));
});

btnZoomFit.addEventListener('click', () => {
  renderPdfWithZoom();
});

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

btnHome.addEventListener('click', () => {
  if (rawPdfBuffer && !confirm('Are you sure you want to close this document and return home?')) {
    return;
  }
  resetToHome();
});

btnSignAnother.addEventListener('click', () => {
  resetToHome();
});

btnKeepEditing.addEventListener('click', () => {
  successModal.classList.add('hidden');
});

container.addEventListener('dragover', (e) => {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz?.classList.add('border-indigo-500', 'bg-slate-800');
});
container.addEventListener('dragleave', (e) => {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz?.classList.remove('border-indigo-500', 'bg-slate-800');
});

container.addEventListener('drop', (e) => {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz?.classList.remove('border-indigo-500', 'bg-slate-800');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

btnSign.addEventListener('click', async () => {
  btnSign.classList.remove('animate-pulse');
  
  const signatureData = await openSignaturePad();
  if (signatureData) {
    activeSignaturePng = signatureData;
    cursorTooltip.classList.remove('hidden');
    container.classList.add('cursor-crosshair');
    
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    showNotification(isTouch ? 'Tap document to place signature' : 'Click document to place signature');
  }
});

btnExport.addEventListener('click', async () => {
  if (!rawPdfBuffer) return;
  
  btnExport.classList.remove('animate-pulse', 'ring-2', 'ring-emerald-400');
  btnExport.textContent = 'Processing...';
  btnExport.classList.add('opacity-75', 'cursor-not-allowed');
  
  try {
    // Pass a fresh clone so buffer detachment never occurs
    await exportSignedPdf(rawPdfBuffer.slice(0));
    successModal.classList.remove('hidden');
  } catch (err) {
    console.error('Export failure diagnostic:', err);
    alert('Something went wrong while saving the PDF. Check console for details.');
  } finally {
    btnExport.textContent = 'Export PDF';
    btnExport.classList.remove('opacity-75', 'cursor-not-allowed');
  }
});

container.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('.sig-wrapper')) return;
  
  // Deselect signature if clicking canvas background
  setSelectedSignature(null);

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
    
    const sigWrapper = createSignatureElement(
      x - 75,
      y - 40,
      150,
      80,
      activeSignaturePng
    );
    
    pageWrapper.appendChild(sigWrapper);
    setSelectedSignature(sigWrapper);
    
    activeSignaturePng = null;
    cursorTooltip.classList.add('hidden');
    container.classList.remove('cursor-crosshair');
    
    btnExport.classList.add('animate-pulse', 'ring-2', 'ring-emerald-400');
    showNotification("Signature placed! Click 'Export PDF' when you're ready to download.", 6000);
  }
});
