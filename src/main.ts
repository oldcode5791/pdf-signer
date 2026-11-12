// @ts-ignore
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import {
  renderDocument,
  clearRendererDoc,
  createSignatureElement,
  selectedSigWrapper,
  setSelectedSignature,
} from './renderer';
import { openSignaturePad } from './signature';
import { exportSignedPdf } from './export';

// Point PDF.js to its bundled local Web Worker so PDF parsing runs off the main UI thread
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const app = document.querySelector<HTMLDivElement>('#app')!;

// Render application shell with dark-slate/cyan branding and plain-English tooltips on every control
app.innerHTML = `
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden relative">
    <!-- Top Sticky Navigation & Document Toolbar -->
    <header class="h-16 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 backdrop-blur">
      <div class="flex items-center gap-3">
        <button id="btn-home" title="Close current document and return to the start screen" class="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/25 transition-colors cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        </button>
        <div>
          <span class="text-base font-bold tracking-tight text-white flex items-center gap-2">
            Client-Side PDF Signer
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hidden md:inline" title="Your PDF stays strictly inside your browser memory and is never uploaded">Zero Upload</span>
          </span>
          <p class="text-xs text-slate-400 hidden lg:block">100% Private Browser Document Signing &amp; Flattening</p>
        </div>
      </div>

      <!-- Document Zoom Controls (Shown once a PDF is loaded) -->
      <div id="zoom-controls" class="hidden items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 shadow-inner">
        <button id="btn-zoom-out" title="Zoom out to see more of the page" class="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer">−</button>
        <span id="zoom-label" title="Current document zoom percentage" class="text-xs font-mono font-medium text-cyan-400 min-w-[3.2rem] text-center select-none">100%</span>
        <button id="btn-zoom-in" title="Zoom in for precise signature placement" class="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer">+</button>
        <div class="w-px h-4 bg-slate-800 mx-1"></div>
        <button id="btn-zoom-fit" title="Automatically scale PDF page to fit your screen" class="text-xs px-2 py-1 rounded-lg hover:bg-slate-800 text-cyan-300 font-medium transition-colors cursor-pointer">Fit</button>
      </div>

      <!-- Primary Document Actions -->
      <div class="flex items-center gap-3">
        <a href="https://apps.the-lal.net" title="Return to the full the-lal.net browser utility directory" class="text-xs text-slate-400 hover:text-cyan-400 transition-colors hidden xl:inline">
          &larr; App Showcase
        </a>
        <button id="btn-export" title="Embed all placed signatures permanently into the PDF and download signed_document.pdf" class="hidden bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold py-2 px-4 rounded-xl transition-all shadow-sm cursor-pointer">
          Export PDF
        </button>
        <button id="btn-sign" title="Open the signature pad to draw freehand or type your signature" class="hidden bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-bold py-2 px-4 rounded-xl transition-all shadow-sm ring-2 ring-cyan-400/50 cursor-pointer">
          Create Signature
        </button>
        <label id="header-upload-label" title="Choose a PDF file from your computer or phone" class="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium py-2 px-4 rounded-xl transition-colors border border-slate-700">
          Open PDF
          <input type="file" id="file-upload" class="hidden" accept="application/pdf" />
        </label>
      </div>
    </header>

    <!-- Scrollable PDF Canvas Stage / Initial Dropzone -->
    <main id="document-container" class="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center justify-center cursor-default relative">
      <div id="drop-zone" title="Drag and drop any PDF file here, or click Select PDF Document" class="w-full max-w-xl bg-slate-900/90 border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-3xl p-10 text-center transition-all shadow-2xl flex flex-col items-center">
        <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">Sign PDF Documents Safely</h2>
        <p class="text-slate-400 text-sm max-w-sm mb-6">Drag and drop your PDF here, or select a file from your device to begin signing immediately.</p>

        <label for="file-upload" title="Browse your device for a PDF document to sign" class="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base py-3 px-8 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 mb-8">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Select PDF Document
        </label>

        <div class="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-800 text-xs text-slate-400">
          <div class="flex flex-col items-center">
            <span class="font-semibold text-slate-200 mb-1">1. Choose</span>
            <span>Open your PDF</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="font-semibold text-slate-200 mb-1">2. Sign</span>
            <span>Draw or type</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="font-semibold text-slate-200 mb-1">3. Download</span>
            <span>Export clean copy</span>
          </div>
        </div>

        <div class="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          100% Private: Documents never leave your browser
        </div>
      </div>
    </main>

    <!-- Floating Step-by-Step Guidance Toast -->
    <div id="placement-toast" class="opacity-0 pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur text-cyan-200 text-sm font-medium px-5 py-2.5 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 border border-cyan-500/40">
      <svg class="w-4 h-4 text-cyan-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
      <span id="placement-toast-text"></span>
    </div>

    <!-- Desktop Cursor Follower Badge during Signature Placement -->
    <div id="cursor-tooltip" class="hidden fixed pointer-events-none z-50 bg-cyan-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap transition-opacity">
      Click to Stamp Signature
    </div>

    <!-- Post-Export Confirmation Modal -->
    <div id="success-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm transition-opacity">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>

        <h3 class="text-xl font-bold text-white mb-2">Signed PDF Downloaded!</h3>
        <p class="text-slate-400 text-sm mb-6">Your modified document has been downloaded directly to your device. No files were stored on any server.</p>

        <div class="flex flex-col gap-3 w-full">
          <button id="btn-sign-another" title="Clear the current document and load a new PDF file" class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Sign Another Document
          </button>
          <button id="btn-keep-editing" title="Return to the current PDF to add more signatures or adjust placement" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-6 rounded-xl border border-slate-700 transition-colors cursor-pointer">
            Keep Editing This File
          </button>
        </div>

        <div class="mt-6 pt-5 border-t border-slate-800/80 w-full flex flex-col items-center">
          <p class="text-xs text-slate-400 mb-3">Saved you a $20/month subscription?</p>
          <a href="https://buymeacoffee.com/curiouslyso" target="_blank" rel="noopener noreferrer" title="Support independent privacy-first browser utilities" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 text-sm font-semibold border border-amber-500/40 transition-all hover:scale-105 shadow-md">
            <span class="text-lg">☕</span>
            <span>Buy Me a Coffee</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Floating Developer Support Pill -->
    <a id="btn-support-pill" href="https://buymeacoffee.com/curiouslyso" target="_blank" rel="noopener noreferrer" class="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-amber-300 font-medium text-sm border border-amber-500/40 hover:border-amber-400 shadow-xl backdrop-blur transition-all duration-300 hover:scale-105" title="Support independent privacy-first browser tools on Buy Me a Coffee">
      <span class="text-lg leading-none">☕</span>
      <span>Support the dev</span>
    </a>
  </div>
`;

// Cached DOM Element References
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const container = document.getElementById('document-container') as HTMLDivElement;
const btnHome = document.getElementById('btn-home') as HTMLButtonElement;
const btnSign = document.getElementById('btn-sign') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const cursorTooltip = document.getElementById('cursor-tooltip') as HTMLDivElement;
const placementToast = document.getElementById('placement-toast') as HTMLDivElement;
const placementToastText = document.getElementById('placement-toast-text') as HTMLSpanElement;
const btnSupportPill = document.getElementById('btn-support-pill') as HTMLAnchorElement;

// Zoom Toolbar References
const zoomControls = document.getElementById('zoom-controls') as HTMLDivElement;
const btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
const btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
const btnZoomFit = document.getElementById('btn-zoom-fit') as HTMLButtonElement;
const zoomLabel = document.getElementById('zoom-label') as HTMLSpanElement;

// Post-Export Modal References
const successModal = document.getElementById('success-modal') as HTMLDivElement;
const btnSignAnother = document.getElementById('btn-sign-another') as HTMLButtonElement;
const btnKeepEditing = document.getElementById('btn-keep-editing') as HTMLButtonElement;

// Active signature image awaiting click-placement & persistent PDF byte store
let activeSignaturePng: string | null = null;
export let storedPdfBytes: Uint8Array | null = null;
let currentScale = 1.0;
let toastTimer: number | null = null;

// Brief subtle highlight on initial load for the support pill
const flashSupportButton = () => {
  if (!btnSupportPill) return;
  btnSupportPill.classList.add('animate-pulse', 'ring-2', 'ring-amber-400/50', 'border-amber-400');
  setTimeout(() => {
    btnSupportPill.classList.remove('animate-pulse', 'ring-2', 'ring-amber-400/50');
  }, 4500);
};
flashSupportButton();

// Display a floating guidance banner at the top of the viewport
const showNotification = (message: string, durationMs = 6000) => {
  placementToastText.textContent = message;
  placementToast.classList.remove('opacity-0', '-translate-y-2');
  placementToast.classList.add('opacity-100', 'translate-y-0');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hideNotification(), durationMs);
};

// Dismiss the floating guidance banner
const hideNotification = () => {
  placementToast.classList.remove('opacity-100', 'translate-y-0');
  placementToast.classList.add('opacity-0', '-translate-y-2');
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
};

// Sync zoom percentage readout in the top toolbar
const updateZoomLabel = () => {
  zoomLabel.textContent = `${Math.round(currentScale * 100)}%`;
};

// Re-render all PDF pages at a target zoom level using a fresh slice of storedPdfBytes
const renderPdfWithZoom = async (targetScale?: number) => {
  if (!storedPdfBytes) return;
  currentScale = await renderDocument(storedPdfBytes.slice().buffer, container, targetScale);
  updateZoomLabel();
};

// Reset application state and restore the initial drag-and-drop welcome card
const resetToHome = () => {
  storedPdfBytes = null;
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
    <div id="drop-zone" title="Drag and drop any PDF file here, or click Select PDF Document" class="w-full max-w-xl bg-slate-900/90 border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-3xl p-10 text-center transition-all shadow-2xl flex flex-col items-center">
      <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
      </div>

      <h2 class="text-2xl font-bold text-white mb-2">Sign PDF Documents Safely</h2>
      <p class="text-slate-400 text-sm max-w-sm mb-6">Drag and drop your PDF here, or select a file from your device to begin signing immediately.</p>

      <label for="file-upload" title="Browse your device for a PDF document to sign" class="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base py-3 px-8 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 mb-8">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Select PDF Document
      </label>

      <div class="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-800 text-xs text-slate-400">
        <div class="flex flex-col items-center">
          <span class="font-semibold text-slate-200 mb-1">1. Choose</span>
          <span>Open your PDF</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="font-semibold text-slate-200 mb-1">2. Sign</span>
          <span>Draw or type</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="font-semibold text-slate-200 mb-1">3. Download</span>
          <span>Export clean copy</span>
        </div>
      </div>

      <div class="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        100% Private: Documents never leave your browser
      </div>
    </div>
  `;
};

// Ingest a local PDF File object into memory and render all pages
const handleFile = async (file: File) => {
  if (file.type !== 'application/pdf') {
    alert('Invalid format. Please supply a standard PDF document.');
    return;
  }

  clearRendererDoc();
  container.classList.remove('justify-center');
  container.innerHTML = '<div class="text-cyan-400 mt-20 animate-pulse font-mono text-sm">Loading document...</div>';

  try {
    const rawBuffer = await file.arrayBuffer();
    storedPdfBytes = new Uint8Array(rawBuffer);

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
    container.innerHTML = '<div class="text-rose-400 mt-20 font-mono text-sm">Error: Could not read the document.</div>';
  }
};

// Keyboard shortcuts: Escape cancels placement/selection; Delete/Backspace removes selected signature
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

// Toolbar Zoom Controls
btnZoomIn.addEventListener('click', () => {
  if (currentScale < 2.5) renderPdfWithZoom(Math.min(2.5, currentScale + 0.15));
});

btnZoomOut.addEventListener('click', () => {
  if (currentScale > 0.4) renderPdfWithZoom(Math.max(0.4, currentScale - 0.15));
});

btnZoomFit.addEventListener('click', () => {
  renderPdfWithZoom();
});

// Prevent browser from opening dropped PDFs outside the dropzone
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Update floating placement pill coordinates on desktop mouse move
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
  if (storedPdfBytes && !confirm('Are you sure you want to close this document and return home?')) {
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

// Dropzone drag-and-drop highlight & file ingestion
container.addEventListener('dragover', (e) => {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz?.classList.add('border-cyan-500', 'bg-slate-900');
});
container.addEventListener('dragleave', (e) => {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz?.classList.remove('border-cyan-500', 'bg-slate-900');
});

container.addEventListener('drop', (e) => {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz?.classList.remove('border-cyan-500', 'bg-slate-900');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

// Open signature creation modal and arm click-to-stamp placement mode
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

// Flatten all placed signatures into the PDF and download locally
btnExport.addEventListener('click', async () => {
  if (!storedPdfBytes) return;

  btnExport.classList.remove('animate-pulse', 'ring-2', 'ring-emerald-400');
  btnExport.textContent = 'Processing...';
  btnExport.classList.add('opacity-75', 'cursor-not-allowed');

  try {
    await exportSignedPdf(storedPdfBytes.slice());
    successModal.classList.remove('hidden');
  } catch (err: any) {
    console.error('Export error diagnostic:', err);
    alert(`Could not export PDF: ${err?.message || err}`);
  } finally {
    btnExport.textContent = 'Export PDF';
    btnExport.classList.remove('opacity-75', 'cursor-not-allowed');
  }
});

// Stamp armed signature onto clicked PDF page coordinates (or open signature pad if none armed)
container.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('.sig-wrapper')) return;

  setSelectedSignature(null);

  const pageWrapper = target.closest('.page-wrapper') as HTMLElement;

  if (!activeSignaturePng) {
    if (pageWrapper && storedPdfBytes) {
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
