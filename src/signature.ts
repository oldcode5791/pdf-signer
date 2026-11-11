import SignaturePad from 'signature_pad';

export function openSignaturePad(): Promise<string | null> {
  return new Promise((resolve) => {
    // Scaffold the modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm';
    
    const modal = document.createElement('div');
    modal.className = 'bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-4';
    
    modal.innerHTML = `
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-white">Create Signature</h2>
        <button id="sig-close" class="text-slate-400 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <div class="bg-white rounded-lg overflow-hidden border-2 border-slate-600">
        <canvas id="sig-canvas" class="w-full h-48 cursor-crosshair touch-none"></canvas>
      </div>
      <div class="flex justify-between mt-2">
        <button id="sig-clear" class="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Clear</button>
        <button id="sig-save" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Save Signature</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
    
    // Calibrate the canvas matrix for high-DPI displays
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    
    const signaturePad = new SignaturePad(canvas, {
      penColor: 'rgb(15, 23, 42)', 
      minWidth: 0.5, // Dialled down for finer strokes
      maxWidth: 1.5, // Dialled down for finer strokes
    });
    
    const cleanup = () => {
      document.body.removeChild(overlay);
    };
    
    document.getElementById('sig-close')?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    document.getElementById('sig-clear')?.addEventListener('click', () => {
      signaturePad.clear();
    });
    
    document.getElementById('sig-save')?.addEventListener('click', () => {
      if (signaturePad.isEmpty()) {
        alert('Please provide a signature first.');
        return;
      }
      const dataUrl = signaturePad.toDataURL('image/png');
      cleanup();
      resolve(dataUrl);
    });
  });
}
