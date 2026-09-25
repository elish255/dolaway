const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function hashPassword(password: string, saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: saltHex };
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
}
