const enc = new TextEncoder()

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export function makeSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

export async function hashPasscode(pin: string, salt: string): Promise<string> {
  // A few thousand SHA-256 rounds. This is a local-only convenience lock, not
  // encryption; it keeps a casual glance from reading the entries.
  let data: ArrayBuffer = enc.encode(`${salt}:${pin}`).buffer as ArrayBuffer
  for (let i = 0; i < 5000; i++) data = await crypto.subtle.digest('SHA-256', data)
  return toHex(data)
}

const UNLOCK_KEY = 'lr:unlocked'
export const isUnlocked = () => sessionStorage.getItem(UNLOCK_KEY) === '1'
export const setUnlocked = (v: boolean) => (v ? sessionStorage.setItem(UNLOCK_KEY, '1') : sessionStorage.removeItem(UNLOCK_KEY))
