// Bring in our styles and the tools we need to run the app
// @ts-ignore
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { renderDocument } from './renderer';
import { openSignaturePad } from './signature';
import { exportSignedPdf } from './export';

// Configure the background PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const app = document.querySelector<HTMLDivElement>('#app')!;

// Initial app shell with modern hero onboarding card
app.innerHTML = `
  <div class="min-h-screen bg-slate-900 text-slate-200 flex flex-col h-screen overflow-hidden">
    <header class="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <span class="text-base font-semibold tracking-tight text-white">PDF Signer Core</span>
      </div>

      <div class="flex items-center gap-3">
        <button id="btn-export" class="hidden bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm">
          Export PDF
        </button>
        <button id="btn-sign" class="hidden bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm">
          Create Signature
        </button>
        <label id="header-upload-label" class="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors border border-slate-600">
          Open Document
          <input type="file" id="file-upload" class="hidden" accept="application/pdf" />
        </label>
      </div>
    </header>
    
    <main id="document-container" class="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center justify-center cursor-default relative">
      <!-- Centered Onboarding Hero Card -->
      <div id="drop-zone" class="w-full max-w-xl bg-slate-900/90 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-10 text-center transition-all shadow-2xl flex flex-col items-center">
        
        <div class="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">Sign PDF Documents Safely</h2>
        <p class="text-slate-400 text-sm max-w-sm mb-6">Drag and drop your PDF here, or select a file from your device to begin signing immediately.</p>

        <!-- Big, unmistakable call-to-action button -->
        <label for="file-upload" class="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 mb-8">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Select PDF Document
        </label>

        <!-- 3-Step Mini Visual Flow -->
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

        <!-- Privacy Reassurance Badge -->
        <div class="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          100% Private: Documents never leave your browser
        </div>
      </div>
    </main>

    <!-- Disappearing toast guidance for touch/stylus and desktop placement -->
    <div id="placement-toast" class="opacity-0 pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 backdrop-blur text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 border border-indigo-400/30">
      <svg class="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
      <span id="placement-toast-text">Tap anywhere on the document to place your signature</span>
    </div>

    <!-- Mouse hover tooltip for desktop -->
    <div id="cursor-tooltip" class="hidden fixed pointer-events-none z-50 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap transition-opacity">
      Place Signature Here
    </div>
  </div>
`;

// Element references
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
const container = document.getElementById('document-container') as HTMLDivElement;
const btnSign = document.getElementById('btn-sign') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const cursorTooltip = document.getElementById('cursor-tooltip') as HTMLDivElement;
const placementToast = document.getElementById('placement-toast') as HTMLDivElement;
