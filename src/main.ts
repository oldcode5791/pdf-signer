import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { renderDocument } from './renderer';

// Hook the worker to the Vite asset pipeline
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const app = document.querySelector<HTMLDivElement>('#app')!;

// Scaffold the primary UI matrix
app.innerHTML = `
  <div class="min-h-screen bg-slate-900 text-slate-200 flex flex-col h-screen overflow-hidden">
    <header class="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
      <h1 class="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
        <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        PDF Signer Core
      </h1>
      <div>
        <label class="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
          Load PDF
          <input type="file" id="file-upload" class="hidden" accept="application/pdf" />
        </label>
      </div>
    </header>
    
    <main id="document-container" class="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center">
      <div id="drop-zone" class="w-full max-w-2xl border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-400 mt-20 flex flex-col items-center justify-center transition-colors">
        <svg class="w-12 h-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p class="text-lg font-medium text-slate-300">Drag and drop a PDF here</p>
        <p class="text-sm mt-1">or click "Load PDF" to browse</p>
      </div>
    </main>
  </div>
`;

// Map interface elements
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
const container = document.getElementById('document-container') as HTMLDivElement;

// Core ingestion diagnostic
const handleFile = async (file: File) => {
  if (file.type !== 'application/pdf') {
    alert('Invalid format. Please supply a standard PDF.');
    return;
  }
  
  // Wipe container and show loading state
  container.innerHTML = '<div class="text-indigo-400 mt-20 animate-pulse font-mono text-sm">Initializing document matrix...</div>';
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    await renderDocument(arrayBuffer, container);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="text-red-400 mt-20 font-mono text-sm">Diagnostic failure: Unable to parse document stream.</div>';
  }
};

// Wire up event listeners
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
