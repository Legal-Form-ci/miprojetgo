import { supabase } from "@/integrations/supabase/client";

export async function avatarSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Compresse + recadre carré (jpeg).
 * Utilise l'API `FaceDetector` (Chrome/Android) pour centrer le visage
 * automatiquement quand elle est disponible ; fallback = recadrage centré.
 */
export async function cropSquareAndCompress(file: File, size = 512, quality = 0.85): Promise<Blob> {
  const img = await fileToImage(file);
  const box = await detectFaceBox(img);
  const side = box ? box.side : Math.min(img.width, img.height);
  const sx = box ? box.sx : (img.width - side) / 2;
  const sy = box ? box.sy : (img.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) throw new Error("Compression impossible");
  return blob;
}

type FaceBox = { sx: number; sy: number; side: number };

async function detectFaceBox(img: HTMLImageElement): Promise<FaceBox | null> {
  try {
    const w = window as unknown as {
      FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
        detect: (src: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
      };
    };
    if (!w.FaceDetector) return null;
    const det = new w.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await det.detect(img);
    if (!faces.length) return null;
    const f = faces[0].boundingBox;
    // agrandit la boîte pour inclure cheveux + menton (visage centré, ~1.8×)
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    const target = Math.max(f.width, f.height) * 1.8;
    const side = Math.min(target, img.width, img.height);
    let sx = cx - side / 2;
    let sy = cy - side / 2;
    sx = Math.max(0, Math.min(sx, img.width - side));
    sy = Math.max(0, Math.min(sy, img.height - side));
    return { sx, sy, side };
  } catch {
    return null;
  }
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}