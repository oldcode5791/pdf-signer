import * as pdfjsLib from 'pdfjs-dist';

export interface RenderOptions {
  scale?: number;
  fitToWidth?: boolean;
}

let currentPdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
export let selectedSigWrapper: HTMLElement | null = null;

export const setSelectedSignature = (el: HTMLElement | null) => {
  if (selectedSigWrapper && selectedSigWrapper !== el) {
    selectedSigWrapper.classList.remove('ring-2', 'ring-indigo-400');
  }
  selectedSigWrapper = el;
  if (selectedSigWrapper) {
    selectedSigWrapper.classList.add('ring-2', 'ring-indigo-400');
  }
};

export const renderDocument = async (
  pdfData: ArrayBuffer,
  container: HTMLDivElement,
  targetScale?: number
): Promise<number> => {
  if (!currentPdfDoc) {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    currentPdfDoc = await loadingTask.promise;
  }

  // Preserve signatures if re-rendering at a new scale
  const existingSignatures: { pageIndex: number; leftPct: number; topPct: number; widthPct: number; heightPct: number; imgSrc: string }[] = [];
  const existingWrappers = container.querySelectorAll('.page-wrapper');
  
  existingWrappers.forEach((pw, pIdx) => {
    const sigs = pw.querySelectorAll('.sig-wrapper');
    const pwRect = pw.getBoundingClientRect();
    if (pwRect.width > 0 && pwRect.height > 0) {
      sigs.forEach((sig) => {
        const sigEl = sig as HTMLElement;
        const img = sigEl.querySelector('img');
        if (img) {
          const l = parseFloat(sigEl.style.left || '0');
          const t = parseFloat(sigEl.style.top || '0');
          const w = parseFloat(sigEl.style.width || '150');
          const h = parseFloat(sigEl.style.height || '80');
          existingSignatures.push({
            pageIndex: pIdx,
            leftPct: l / pwRect.width,
            topPct: t / pwRect.height,
            widthPct: w / pwRect.width,
            heightPct: h / pwRect.height,
            imgSrc: img.src
          });
        }
      });
    }
  });

  // Calculate default 'Fit to Page' scale if targetScale is not specified
  let scale = targetScale;
  if (!scale) {
    const firstPage = await currentPdfDoc.getPage(1);
    const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
    const availableWidth = container.clientWidth - 64;
    const availableHeight = container.clientHeight - 64;

    const scaleW = availableWidth / unscaledViewport.width;
    const scaleH = availableHeight / unscaledViewport.height;

    scale = Math.min(scaleW, scaleH, 1.5); 
    if (scale < 0.35) scale = 0.35;
  }

  container.innerHTML = '';

  for (let pageNum = 1; pageNum <= currentPdfDoc.numPages; pageNum++) {
    const page = await currentPdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'page-wrapper relative mb-8 shadow-2xl bg-white transition-all select-none';
    pageWrapper.dataset.pageNumber = pageNum.toString();
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'block';

    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    pageWrapper.appendChild(canvas);

    // Reattach any saved signatures scaled proportionally
    const pageSigs = existingSignatures.filter(s => s.pageIndex === pageNum - 1);
    pageSigs.forEach(sig => {
      const sigWrapper = createSignatureElement(
        sig.leftPct * viewport.width,
        sig.topPct * viewport.height,
        sig.widthPct * viewport.width,
        sig.heightPct * viewport.height,
        sig.imgSrc
      );
      pageWrapper.appendChild(sigWrapper);
    });

    container.appendChild(pageWrapper);
  }

  return scale;
};

export const clearRendererDoc = () => {
  currentPdfDoc = null;
  selectedSigWrapper = null;
};

// Builder function for signature boxes with drag, mobile resize grip, and selection state
export const createSignatureElement = (
  leftPx: number,
  topPx: number,
  widthPx: number,
  heightPx: number,
  imgSrc: string
): HTMLElement => {
  const sigWrapper = document.createElement('div');
  sigWrapper.className = 'absolute cursor-move border-2 border-indigo-400/40 hover:border-indigo-500 rounded-lg transition-colors z-20 sig-wrapper touch-none select-none group';
  
  sigWrapper.style.left = `${leftPx}px`; 
  sigWrapper.style.top = `${topPx}px`;
  sigWrapper.style.width = `${Math.max(60, widthPx)}px`; 
  sigWrapper.style.height = `${Math.max(30, heightPx)}px`;
  sigWrapper.tabIndex = 0;

  const sigImg = document.createElement('img');
  sigImg.src = imgSrc;
  sigImg.className = 'w-full h-full object-contain pointer-events-none select-none';
  sigImg.draggable = false;
  sigWrapper.appendChild(sigImg);

  // Dedicated touch/mouse resize corner grip
  const resizeGrip = document.createElement('div');
  resizeGrip.className = 'absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-nwse-resize text-indigo-400 hover:text-white bg-slate-900/60 rounded-tl-md border-t border-l border-indigo-400/30 touch-none';
  resizeGrip.innerHTML = `
    <svg class="w-3 h-3 pointer-events-none" fill="currentColor" viewBox="0 0 10 10">
      <path d="M8 2 L8 8 L2 8" fill="none" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `;
  sigWrapper.appendChild(resizeGrip);

  // Pointer drag for repositioning
  let isDragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  sigWrapper.addEventListener('pointerdown', (dragEvent: PointerEvent) => {
    if (dragEvent.target === resizeGrip) return;
    dragEvent.preventDefault();
    dragEvent.stopPropagation();

    setSelectedSignature(sigWrapper);

    isDragging = true;
    startX = dragEvent.clientX;
    startY = dragEvent.clientY;
    startLeft = parseFloat(sigWrapper.style.left || '0');
    startTop = parseFloat(sigWrapper.style.top || '0');

    sigWrapper.setPointerCapture(dragEvent.pointerId);
  });

  sigWrapper.addEventListener('pointermove', (moveEvent: PointerEvent) => {
    if (!isDragging) return;
    moveEvent.preventDefault();
    sigWrapper.style.left = `${startLeft + (moveEvent.clientX - startX)}px`;
    sigWrapper.style.top = `${startTop + (moveEvent.clientY - startY)}px`;
  });

  const stopDragging = (endEvent: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      sigWrapper.releasePointerCapture(endEvent.pointerId);
    } catch {}
  };

  sigWrapper.addEventListener('pointerup', stopDragging);
  sigWrapper.addEventListener('pointercancel', stopDragging);

  // Pointer resize for mobile touch and desktop drag
  let isResizing = false;
  let initialW = 0, initialH = 0, rStartX = 0, rStartY = 0;

  resizeGrip.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedSignature(sigWrapper);

    isResizing = true;
    rStartX = e.clientX;
    rStartY = e.clientY;
    initialW = sigWrapper.offsetWidth;
    initialH = sigWrapper.offsetHeight;

    resizeGrip.setPointerCapture(e.pointerId);
  });

  resizeGrip.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isResizing) return;
    e.preventDefault();
    const newW = Math.max(50, initialW + (e.clientX - rStartX));
    const newH = Math.max(25, initialH + (e.clientY - rStartY));
    sigWrapper.style.width = `${newW}px`;
    sigWrapper.style.height = `${newH}px`;
  });

  const stopResizing = (e: PointerEvent) => {
    if (!isResizing) return;
    isResizing = false;
    try {
      resizeGrip.releasePointerCapture(e.pointerId);
    } catch {}
  };

  resizeGrip.addEventListener('pointerup', stopResizing);
  resizeGrip.addEventListener('pointercancel', stopResizing);

  return sigWrapper;
};
