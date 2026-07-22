/**
 * Helper utility to compress images in the browser using HTML5 Canvas.
 * Automatically resizes the image (max 1200px) and lowers quality to ensure it is under 1 Mo.
 */
export function compressImage(
  file: File,
  maxSizeMB: number = 1.0,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If the file is not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error("Le fichier fourni n'est pas une image."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and clamp to max dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // If 2d context fails, return original data URL
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Target size in bytes (1 Mo = 1024 * 1024 bytes)
        const maxBytes = maxSizeMB * 1024 * 1024;

        // Iteratively find the best quality that fits the size limit
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let approxSizeBytes = (dataUrl.length * 3) / 4;

        if (approxSizeBytes > maxBytes) {
          // Try a lower quality
          quality = 0.70;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          approxSizeBytes = (dataUrl.length * 3) / 4;
        }

        if (approxSizeBytes > maxBytes) {
          // Try even lower quality
          quality = 0.50;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          approxSizeBytes = (dataUrl.length * 3) / 4;
        }

        if (approxSizeBytes > maxBytes) {
          // Aggressive compression for very large canvases
          quality = 0.30;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
