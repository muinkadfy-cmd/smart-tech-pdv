const MAX_DIMENSION = 960;
const OUTPUT_QUALITY = 0.88;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel processar a imagem selecionada."));
    image.src = dataUrl;
  });
}

export async function buildProductImageDataUrl(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem para uso offline.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const result = canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
  if (!result.startsWith("data:image/")) {
    throw new Error("A imagem selecionada não gerou uma miniatura válida.");
  }

  return result;
}

export function isProductImageDataUrl(value?: string) {
  return Boolean(value && value.startsWith("data:image/"));
}
