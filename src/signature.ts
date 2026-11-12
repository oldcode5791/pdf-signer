import SignaturePad from 'signature_pad';

/**
 * Opens an accessible modal dialog allowing the user to either draw a freehand vector signature
 * or type their name in a calligraphic script font, returning a transparent PNG Data URL.
 */
export function openSignaturePad(): Promise<string | null> {
  return new Promise((resolve) => {
    // Backdrop blur overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4';

    // Modal dialog container
    const modal = document.createElement('div');
    modal.className = 'bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-4';

    modal.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-bold text-white">Create Signature</h2>
          <p class="text-xs text-slate-400">Draw freehand or type your name—rendered locally in your browser.</p>
        </div>
        <button id="sig-close" title="Close signature pad without placing" class="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Mode Switcher Tabs: Freehand Draw vs. Calligraphic Type -->
      <div class="flex border-b border-slate-800 mb-1">
        <button id="tab-draw" title="Sketch your signature using a mouse, trackpad, stylus, or finger" class="flex-1 py-2 text-sm font-semibold text-cyan-300 border-b-2 border-cyan-500 transition-colors cursor-pointer">Draw</button>
        <button id="tab-type" title="Type your name on your keyboard and choose a handwriting font style" class="flex-1 py-2 text-sm font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors cursor-pointer">Type</button>
      </div>

      <!-- Freehand Canvas Drawing Area -->
      <div id="area-draw" class="block">
        <div class="bg-white rounded-xl overflow-hidden border-2 border-slate-700 shadow-inner">
          <canvas id="sig-canvas" title="Draw your signature inside this white box" class="w-full h-48 cursor-crosshair touch-none"></canvas>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-[11px] text-slate-400">Tip: Use a trackpad, mouse, or touchscreen</span>
          <button id="sig-clear" title="Erase the drawing canvas and start over" class="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer">Clear Pad</button>
        </div>
      </div>

      <!-- Keyboard Typed Signature Area -->
      <div id="area-type" class="hidden flex-col gap-4">
        <input type="text" id="type-input" placeholder="Type your full name..." autocomplete="off" title="Type your name to preview it in four signature styles" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500 text-lg" />

        <div class="grid grid-cols-2 gap-3" id="font-selector">
          <button data-font="'Dancing Script', cursive" title="Use classic flowing script style" class="font-selector-btn border-2 border-cyan-500 bg-slate-800 rounded-xl p-3 text-2xl text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer" style="font-family: 'Dancing Script', cursive; height: 60px;">Script</button>
          <button data-font="'Caveat', cursive" title="Use natural casual pen style" class="font-selector-btn border-2 border-transparent bg-slate-800 rounded-xl p-3 text-2xl text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer" style="font-family: 'Caveat', cursive; height: 60px;">Caveat</button>
          <button data-font="'Pacifico', cursive" title="Use bold rounded brush style" class="font-selector-btn border-2 border-transparent bg-slate-800 rounded-xl p-3 text-xl text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer" style="font-family: 'Pacifico', cursive; height: 60px;">Pacifico</button>
          <button data-font="'Homemade Apple', cursive" title="Use fine cursive fountain-pen style" class="font-selector-btn border-2 border-transparent bg-slate-800 rounded-xl p-3 text-sm text-white text-center flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer" style="font-family: 'Homemade Apple', cursive; height: 60px;">Apple</button>
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div class="flex justify-between items-center mt-2 pt-3 border-t border-slate-800">
        <button id="sig-cancel" title="Cancel and return to the PDF viewer" class="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
        <button id="sig-save" title="Confirm signature and click anywhere on your PDF page to stamp it" class="px-5 py-2 text-sm font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer">Place Signature</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let activeMode: 'draw' | 'type' = 'draw';
    let selectedFont = "'Dancing Script', cursive";

    const tabDraw = document.getElementById('tab-draw')!;
    const tabType = document.getElementById('tab-type')!;
    const areaDraw = document.getElementById('area-draw')!;
    const areaType = document.getElementById('area-type')!;

    // Switch to Freehand Draw mode
    tabDraw.addEventListener('click', () => {
      activeMode = 'draw';
      tabDraw.className = 'flex-1 py-2 text-sm font-semibold text-cyan-300 border-b-2 border-cyan-500 transition-colors cursor-pointer';
      tabType.className = 'flex-1 py-2 text-sm font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors cursor-pointer';
      areaDraw.classList.replace('hidden', 'block');
      areaType.classList.replace('flex', 'hidden');
    });

    // Switch to Keyboard Type mode
    tabType.addEventListener('click', () => {
      activeMode = 'type';
      tabType.className = 'flex-1 py-2 text-sm font-semibold text-cyan-300 border-b-2 border-cyan-500 transition-colors cursor-pointer';
      tabDraw.className = 'flex-1 py-2 text-sm font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition-colors cursor-pointer';
      areaType.classList.replace('hidden', 'flex');
      areaDraw.classList.replace('block', 'hidden');
      document.getElementById('type-input')?.focus();
    });

    // Font swatch selection & live typing preview handlers
    const fontButtons = document.querySelectorAll('.font-selector-btn');
    const typeInput = document.getElementById('type-input') as HTMLInputElement;

    fontButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        selectedFont = target.getAttribute('data-font') || selectedFont;

        fontButtons.forEach((b) => {
          b.classList.remove('border-cyan-500');
          b.classList.add('border-transparent');
        });
        target.classList.remove('border-transparent');
        target.classList.add('border-cyan-500');

        typeInput.style.fontFamily = selectedFont;
      });
    });

    typeInput.addEventListener('input', () => {
      const text = typeInput.value.trim() || 'Preview';
      fontButtons.forEach((btn) => {
        btn.textContent = text;
      });
    });

    // High-DPI Retina canvas initialization for crisp vector ink strokes
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    const signaturePad = new SignaturePad(canvas, {
      penColor: 'rgb(15, 23, 42)',
      minWidth: 0.6,
      maxWidth: 1.8,
    });

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    document.getElementById('sig-close')?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    document.getElementById('sig-cancel')?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    document.getElementById('sig-clear')?.addEventListener('click', () => signaturePad.clear());

    // Rasterize either the drawn pad or typed script text into a transparent PNG Data URI
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

        // Render high-resolution typed signature onto an offscreen transparent canvas
        const offscreen = document.createElement('canvas');
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        const fontSize = 100;
        ctx.font = `${fontSize}px ${selectedFont}`;
        const metrics = ctx.measureText(text);
        offscreen.width = metrics.width + 40;
        offscreen.height = fontSize * 1.5;

        ctx.font = `${fontSize}px ${selectedFont}`;
        ctx.fillStyle = 'rgb(15, 23, 42)';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 20, offscreen.height / 2);

        resolve(offscreen.toDataURL('image/png'));
        cleanup();
      }
    });
  });
}
