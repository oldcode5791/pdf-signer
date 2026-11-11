import { PDFDocument } from 'pdf-lib';

export async function exportSignedPdf(originalBuffer: ArrayBuffer) {
  // Load a fresh copy of the PDF into the editor tool
  const pdfDoc = await PDFDocument.load(originalBuffer.slice(0));
  const pages = pdfDoc.getPages();

  // Find all the pages shown on the screen
  const pageWrappers = document.querySelectorAll('.page-wrapper');

  // Loop through every page on the screen one by one
  for (let i = 0; i < pageWrappers.length; i++) {
    const wrapper = pageWrappers[i] as HTMLElement;
    
    // Find out which page number we are looking at
    const pageIndex = parseInt(wrapper.dataset.pageNumber || '1', 10) - 1;
    
    // Safety check to make sure the page exists
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const pdfPage = pages[pageIndex];
    
    // Get the size of the real PDF page
    const pdfWidth = pdfPage.getWidth();
    const pdfHeight = pdfPage.getHeight();
    
    // Get the size of the webpage box showing the PDF
    const domWidth = wrapper.offsetWidth;
    const domHeight = wrapper.offsetHeight;

    // Look for all the signatures that were dropped onto this specific page
    const signatures = wrapper.querySelectorAll('.sig-wrapper');
    
    // Loop through all the signatures on this page
    for (let j = 0; j < signatures.length; j++) {
      const sigWrap = signatures[j] as HTMLElement;
      const img = sigWrap.querySelector('img') as HTMLImageElement;
      
      // Take the picture from the screen and convert it into raw computer code so the PDF understands it
      const imgResponse = await fetch(img.src);
      const imgArrayBuffer = await imgResponse.arrayBuffer();
      const pngImage = await pdfDoc.embedPng(imgArrayBuffer);
      
      // Calculate the size difference between the small screen and the large PDF file
      const scaleX = pdfWidth / domWidth;
      const scaleY = pdfHeight / domHeight;
      
      // Multiply the screen size of the signature by the scale to get the real PDF size
      const pdfImgWidth = sigWrap.offsetWidth * scaleX;
      const pdfImgHeight = sigWrap.offsetHeight * scaleY;
      
      // Figure out the X (left to right) position
      const pdfImgX = sigWrap.offsetLeft * scaleX;
      
      // Figure out the Y (top to bottom) position.
      // Math Trick: Websites measure from the top down. PDFs measure from the bottom up!
      // So we have to flip the Y math backwards so it doesn't print upside down.
      const pdfImgY = pdfHeight - (sigWrap.offsetTop * scaleY) - pdfImgHeight;
      
      // Bake the signature into the actual PDF code permanently
      pdfPage.drawImage(pngImage, {
        x: pdfImgX,
        y: pdfImgY,
        width: pdfImgWidth,
        height: pdfImgHeight,
      });
    }
  }

  // Save all our changes and turn it back into a finished file
  const pdfBytes = await pdfDoc.save();

  // The rest of this code tricks the web browser into downloading the file to your computer
  // @ts-ignore
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'signed_document.pdf'; // This is what the downloaded file will be called
  document.body.appendChild(link);
  link.click();
  
  // Clean up the trick when finished
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
