const Z0 = "\u200b";
const Z1 = "\u200c";

export function hideText(cover: string, secret: string): string {
  const visible = cover.replaceAll(Z0, "").replaceAll(Z1, "");
  if (!visible.trim()) throw new Error("Write a cover line first. The note hides after it.");
  const bytes = new TextEncoder().encode(secret);
  if (!secret.trim()) throw new Error("Write the note you want to hide.");
  if (bytes.length > 200) throw new Error("Keep the note under 200 characters.");
  const bits: number[] = [];
  const len = bytes.length;
  for (let i = 15; i >= 0; i -= 1) bits.push((len >> i) & 1);
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1);
  }
  const tail = bits.map((bit) => (bit ? Z1 : Z0)).join("");
  return visible + tail;
}

export function revealText(packed: string): string {
  const bits: number[] = [];
  for (const ch of packed) {
    if (ch === Z0) bits.push(0);
    else if (ch === Z1) bits.push(1);
  }
  if (bits.length < 16) throw new Error("No hidden ink in that text.");
  let len = 0;
  for (let i = 0; i < 16; i += 1) len = (len << 1) | bits[i];
  if (len > 200 || 16 + len * 8 > bits.length) {
    throw new Error("That ink is damaged, or it did not come from this shed.");
  }
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    let byte = 0;
    for (let k = 0; k < 8; k += 1) byte = (byte << 1) | bits[16 + i * 8 + k];
    bytes[i] = byte;
  }
  return new TextDecoder().decode(bytes);
}

export function showInk(value: string): string {
  return value.replaceAll(Z0, "·").replaceAll(Z1, "×");
}

export function inkCount(value: string): number {
  let count = 0;
  for (const ch of value) if (ch === Z0 || ch === Z1) count += 1;
  return count;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that picture."));
    };
    img.src = url;
  });
}

function fitSize(width: number, height: number): { w: number; h: number } {
  if (width * height <= 1_500_000) return { w: width, h: height };
  const scale = Math.sqrt(1_500_000 / (width * height));
  return { w: Math.max(1, Math.floor(width * scale)), h: Math.max(1, Math.floor(height * scale)) };
}

export async function hideInImage(file: File, secret: string): Promise<{ url: string; used: number; capacity: number }> {
  if (!secret.trim()) throw new Error("Write the note you want to hide.");
  const payload = new TextEncoder().encode(secret);
  if (payload.length > 2000) throw new Error("That note is too long for a picture stamp.");
  const img = await loadImage(file);
  const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser could not open the picture.");
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const all = new Uint8Array(4 + payload.length);
  all[0] = 0x4d;
  all[1] = 0x58;
  all[2] = payload.length >> 8;
  all[3] = payload.length & 255;
  all.set(payload, 4);
  const capacityBits = Math.floor(image.data.length / 4);
  if (all.length * 8 > capacityBits) throw new Error("Picture is too small for that note.");
  let bit = 0;
  const total = all.length * 8;
  for (let i = 0; i < image.data.length && bit < total; i += 4) {
    const value = (all[bit >> 3] >> (7 - (bit & 7))) & 1;
    image.data[i] = (image.data[i] & 0xfe) | value;
    bit += 1;
  }
  ctx.putImageData(image, 0, 0);
  return {
    url: canvas.toDataURL("image/png"),
    used: payload.length,
    capacity: Math.floor(capacityBits / 8) - 4,
  };
}

export async function revealImage(file: File): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser could not open the picture.");
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const readBits = (count: number, offset: number) => {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const pixel = (offset + i) * 4;
      value = (value << 1) | (image.data[pixel] & 1);
    }
    return value;
  };
  const magicA = readBits(8, 0);
  const magicB = readBits(8, 8);
  if (magicA !== 0x4d || magicB !== 0x58) throw new Error("No MXHX ink in those pixels.");
  const len = readBits(16, 16);
  if (len < 1 || len > 2000) throw new Error("That picture's ink is damaged.");
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = readBits(8, 32 + i * 8);
  return new TextDecoder().decode(bytes);
}
