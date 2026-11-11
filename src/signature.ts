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
      
      <!-- Deflector Array: Mode Tabs -->
      <div class="flex border-b border-slate-700 mb-2">
        <button id="tab-draw" class="flex-1 py-2 text-sm font-medium text-white border-b-2 border-indigo-500 transition-colors">Draw</button>
        <button id="tab-type" class="flex-1 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors">Type</button>
      </div>

      <!-- Mode 1: Manual Draw Canvas -->
      <div id="area-draw" class="block">
        <div class="bg-white rounded-lg overflow-hidden border-2 border-slate-600">
          <canvas id="sig-canvas" class="w-full h-48 cursor-crosshair touch-none"></canvas>
        </div>
        <div class="flex justify-end mt-2">
          <button id="sig-clear" class="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors">Clear</button>
        </div>
      </div>

      <!-- Mode 2: Typography Generator -->
      <div id="area-type" class="hidden flex-col gap-4">
        <input type="text" id="type-input" placeholder="Type your name..." autocomplete="off" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500 text-lg" />
        
        <div class="grid grid-cols-2 gap-3" id="font-selector">
          <button data-font="'Dancing Script', cursive" class="font-selector-btn border-2 border-indigo-500 bg-slate-700 rounded-lg p-3 text-2xl text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap" style="font-family: 'Dancing Script', cursive; height: 60px;">Script</button>
          <button data-font="'Caveat', cursive" class="font-selector-btn border-2 border-transparent bg-slate-700 rounded-lg p-3 text-2xl text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap" style="font-family: 'Caveat', cursive; height: 60px;">Caveat</button>
          <button data-font="'Pacifico', cursive" class="font-selector-btn border-2 border-transparent bg-slate-700 rounded-lg p-3 text-xl text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap" style="font-family: 'Pacifico', cursive; height: 60px;">Pacifico</button>
          <button data-font="'Homemade Apple', cursive" class="font-selector-btn border-2 border-transparent bg-slate-700 rounded-lg p-3 text-sm text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap" style="font-family: 'Homemade Apple', cursive; height: 60px;">Apple</button>
        </div>
      </div>

      <div class="flex justify-between mt-4">
        <button id="sig-cancel" class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Cancel</button>
        <button id="sig-save" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-md">Place Signature</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    let activeMode = 'draw';
    let selectedFont = "'Dancing Script', cursive";

    // --- Tab Switching Logic ---
    const tabDraw = document.getElementById('tab-draw')!;
    const tabType = document.getElementById('tab-type')!;
    const areaDraw = document.getElementById('area-draw')!;
    const areaType = document.getElementById('area-type')!;
    
    tabDraw.addEventListener('click', () => {
      activeMode = 'draw';
      tabDraw.className = 'flex-1 py-2 text-sm font-medium text-white border-b-2 border-indigo-500 transition-colors';
      tabType.className = 'flex-1 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors';
      areaDraw.classList.replace('hidden', 'block');
      areaType.classList.replace('flex', 'hidden');
    });

    tabType.addEventListener('click', () => {
      activeMode = 'type';
      tabType.className = 'flex-1 py-2 text-sm font-medium text-white border-b-2 border-indigo-500 transition-colors';
      tabDraw.className = 'flex-1 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors';
      areaType.classList.replace('hidden', 'flex');
      areaDraw.classList.replace('block', 'hidden');
      document.getElementById('type-input')?.focus();
    });

    // --- Typography Preview Logic ---
    const fontButtons = document.querySelectorAll('.font-selector-btn');
    const typeInput = document.getElementById('type-input') as HTMLInputElement;

    fontButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        selectedFont = target.getAttribute('data-font') || selectedFont;
        
        fontButtons.forEach(b => {
          b.classList.remove('border-indigo-500');
          b.classList.add('border-transparent');
        });
        target.classList.remove('border-transparent');
        target.classList.add('border-indigo-500');
        
        typeInput.style.fontFamily = selectedFont;
      });
    });

    typeInput.addEventListener('input', () => {
      const text = typeInput.value.trim() || 'Preview';
      fontButtons.forEach(btn => {
        btn.textContent = text;
      });
    });
    
    // --- Manual Draw Matrix ---
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    
    const signaturePad = new SignaturePad(canvas, {
      penColor: 'rgb(15, 23, 42)',
      minWidth: 0.5,
      maxWidth: 1.5,
    });
    
    const cleanup = () => {
      document.body.removeChild(overlay);
    };
    
    document.getElementById('sig-close')?.addEventListener('click', () => { cleanup(); resolve(null); });
    document.getElementById('sig-cancel')?.addEventListener('click', () => { cleanup(); resolve(null); });
    document.getElementById('sig-clear')?.addEventListener('click', () => signaturePad.clear());
    
    // --- Data Export & Resolution ---
    document.getElementById('sig-save')?.addEventListener('click', () => {
      if (activeMode === 'draw') {
        if (signaturePad.isEmpty()) {
          alert('Please draw a signature first.');
          return;
        }
        resolve(signaturePad.toDataURL('image/png'));
        cleanup();
      } else {
        const text = typeInput.value.trim();
        if (!text) {
          alert('Please type your name.');
          return;
        }
        
        // Spin up an offscreen canvas to render the text as a high-res graphic
        const offscreen = document.createElement('canvas');
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;
        
        const fontSize = 100; // High internal resolution for crisp scaling
        ctx.font = `${fontSize}px ${selectedFont}`;
        
        // Measure text payload to define canvas boundaries safely
        const metrics = ctx.measureText(text);
        offscreen.width = metrics.width + 40;
        offscreen.height = fontSize * 1.5; 
        
        // Re-apply context styles after canvas resize
        ctx.font = `${fontSize}px ${selectedFont}`;
        ctx.fillStyle = 'rgb(15, 23, 42)'; // Exact Slate 900 match
        ctx.textBaseline = 'middle';
        
        ctx.fillText(text, 20, offscreen.height / 2);
        
        resolve(offscreen.toDataURL('image/png'));
        cleanup();
      }
    });
  });
}
