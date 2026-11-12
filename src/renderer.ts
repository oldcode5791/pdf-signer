import * as pdfjsLib from 'pdfjs-dist';

export interface RenderOptions {
  scale?: number;
  fitToWidth?: boolean;
}

let currentPdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

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
    const availableWidth = container.clientWidth - 64; // account for container padding
    const availableHeight = container.clientHeight - 64;

    const scaleW = availableWidth / unscaledViewport.width;
    const scaleH = availableHeight / unscaledViewport.height;

    // Pick the smaller ratio so the entire page fits comfortably without scrolling
    scale = Math.min(scaleW, scaleH, 1.5); 
    // Guard against excessively tiny scales on small viewports
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
      const sigWrapper = document.createElement('div');
      sigWrapper.className = 'absolute cursor-move border-2 border-transparent hover:border-indigo-500/50 rounded transition-colors z-20 sig-wrapper touch-none select-none';
      
      sigWrapper.style.left = `${sig.leftPct * viewport.width}px`;
      sigWrapper.style.top = `${sig.topPct * viewport.height}px`;
      sigWrapper.style.width = `${sig.widthPct * viewport.width}px`;
      sigWrapper.style.height = `${sig.heightPct * viewport.height}px`;
      sigWrapper.style.resize = 'both';
      sigWrapper.style.overflow = 'hidden';
      sigWrapper.style.minWidth = '50px';
      sigWrapper.style.minHeight = '30px';

      const sigImg = document.createElement('img');
      sigImg.src = sig.imgSrc;
      sigImg.className = 'w-full h-full object-contain pointer-events-none select-none';
      sigImg.draggable = false;

      sigWrapper.appendChild(sigImg);
      attachPointerDrag(sigWrapper);
      pageWrapper.appendChild(sigWrapper);
    });

    container.appendChild(pageWrapper);
  }

  return scale;
};

export const clearRendererDoc = () => {
  currentPdfDoc = null;
};

// Reusable pointer drag handler for signatures
export const attachPointerDrag = (sigWrapper: HTMLElement) => {
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
};
