// Password hashing helpers used by the admin/auth server functions.
//
// node:crypto is imported lazily (inside the functions) so this module has no
// top-level Node dependency and stays safe to include in client bundles. These
// functions only ever run inside server function handlers. The password itself
// is never stored or logged, only the salt plus a pbkdf2 derived hash.
//
// Uses pbkdf2 (sha256, 100k iterations, 32 byte key) with a random per-row
// salt. 100k iterations is a solid, portable default for server-side checks.
export async function newSalt(): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(16).toString("hex");
}

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const { pbkdf2 } = await import("node:crypto");
  return new Promise<string>((resolve, reject) => {
    pbkdf2(password, salt, 100_000, 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}
