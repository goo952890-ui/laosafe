"use client";

import jsQR from "jsqr";

type ScanRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const REGIONS: ScanRegion[] = [
  { x: 0, y: 0, w: 1, h: 1 },
  { x: 0.08, y: 0.06, w: 0.84, h: 0.88 },
  { x: 0.04, y: 0.08, w: 0.92, h: 0.84 },
  { x: 0.1, y: 0.16, w: 0.8, h: 0.72 },
  { x: 0.12, y: 0.12, w: 0.76, h: 0.76 },
  { x: 0.16, y: 0.16, w: 0.68, h: 0.68 },
];

const SCALES = [1, 1.4, 1.8, 2.2];
const THRESHOLDS = [null, 112, 136, 160, 184];
const SCAN_TIME_BUDGET_MS = 1500;

export async function scanQrPayloadFromFile(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    return scanQrPayloadFromImage(image);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function scanQrPayloadFromImage(image: HTMLImageElement) {
  const baseCanvas = document.createElement("canvas");
  const maxWidth = 1400;
  const scale = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;

  baseCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  baseCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const baseContext = baseCanvas.getContext("2d", { willReadFrequently: true });

  if (!baseContext) {
    throw new Error("Canvas unavailable");
  }

  baseContext.drawImage(image, 0, 0, baseCanvas.width, baseCanvas.height);

  const nativeResult = await tryBarcodeDetector(baseCanvas);
  if (nativeResult) return nativeResult;

  const startedAt = Date.now();

  for (const region of REGIONS) {
    for (const scaleFactor of SCALES) {
      if (Date.now() - startedAt > SCAN_TIME_BUDGET_MS) {
        return null;
      }

      const result = tryScanRegion(baseCanvas, region, scaleFactor);
      if (result) return result;
    }
  }

  return null;
}

function tryScanRegion(
  sourceCanvas: HTMLCanvasElement,
  region: ScanRegion,
  scaleFactor: number,
) {
  const sx = Math.max(0, Math.floor(sourceCanvas.width * region.x));
  const sy = Math.max(0, Math.floor(sourceCanvas.height * region.y));
  const sw = Math.max(1, Math.floor(sourceCanvas.width * region.w));
  const sh = Math.max(1, Math.floor(sourceCanvas.height * region.h));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(sw * scaleFactor));
  canvas.height = Math.max(1, Math.floor(sh * scaleFactor));

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) return null;

  context.imageSmoothingEnabled = false;
  context.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const direct = tryDecode(imageData);
  if (direct) return direct;

  const masked = maskCenterLogo(
    new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height),
  );
  const maskedResult = tryDecode(masked);
  if (maskedResult) return maskedResult;

  for (const threshold of THRESHOLDS) {
    const workingData =
      threshold === null
        ? new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
        : applyThreshold(
            new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height),
            threshold,
          );
    const result = tryDecode(workingData);
    if (result) return result;
  }

  return null;
}

function tryDecode(imageData: ImageData) {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  return result?.data ?? null;
}

function applyThreshold(imageData: ImageData, threshold: number) {
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const nextValue = gray >= threshold ? 255 : 0;
    data[index] = nextValue;
    data[index + 1] = nextValue;
    data[index + 2] = nextValue;
  }

  return imageData;
}

function softenAndThreshold(imageData: ImageData, threshold: number) {
  const { data, width, height } = imageData;
  const source = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let sum = 0;

      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const index = ((y + oy) * width + (x + ox)) * 4;
          sum += source[index] * 0.299 + source[index + 1] * 0.587 + source[index + 2] * 0.114;
        }
      }

      const average = sum / 9;
      const nextValue = average >= threshold ? 255 : 0;
      const index = (y * width + x) * 4;
      data[index] = nextValue;
      data[index + 1] = nextValue;
      data[index + 2] = nextValue;
    }
  }

  return imageData;
}

async function tryBarcodeDetector(canvas: HTMLCanvasElement) {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }

  try {
    const Detector = (window as Window & {
      BarcodeDetector: new (options: { formats: string[] }) => {
        detect(input: HTMLCanvasElement): Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;

    const detector = new Detector({ formats: ["qr_code"] });
    const results = await Promise.race([
      detector.detect(canvas),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 500)),
    ]);

    if (!results) return null;
    return results[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

function maskCenterLogo(imageData: ImageData) {
  const { data, width, height } = imageData;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const maskWidth = Math.floor(width * 0.22);
  const maskHeight = Math.floor(height * 0.22);
  const startX = Math.max(0, centerX - Math.floor(maskWidth / 2));
  const startY = Math.max(0, centerY - Math.floor(maskHeight / 2));
  const endX = Math.min(width, startX + maskWidth);
  const endY = Math.min(height, startY + maskHeight);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = 255;
    }
  }

  return imageData;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
