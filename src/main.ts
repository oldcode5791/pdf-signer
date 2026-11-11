import './style.css';
import * as pdfjsLib from 'pdfjs-dist';

// Point PDF.js worker to Vite's asset loader
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <main class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div class="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white mb-2">PDF Signer Core</h1>
        <p class="text-sm text-slate-400 mb-6">Phase 0 Scaffolding Initialised</p>
        
        <div class="text-left bg-slate-900/90 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300 space-y-2">
          <p><span class="text-emerald-400 font-bold">✓</span> Vite + TypeScript Active</p>
          <p><span class="text-emerald-400 font-bold">✓</span> Tailwind CSS Loaded</p>
          <p><span class="text-emerald-400 font-bold">✓</span> PDF.js Engine: <span class="text-indigo-400">v${pdfjsLib.version}</span></p>
        </div>
      </div>
    </main>
  `;
}
