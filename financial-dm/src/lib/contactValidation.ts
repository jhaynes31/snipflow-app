/**
 * Contact checks shared by the lead form (friendly, immediate) and the
 * server (authoritative). Format rules, obvious fakes, common typos, and
 * North American phone rules. The server adds a live mail domain lookup.
 */

export interface CheckResult {
  ok: boolean;
  /** Plain language reason when not ok. */
  message?: string;
  /** Cleaned value to store when ok. */
  value?: string;
  /** A likely correction, for example gmail.com for gmial.com. */
  suggestion?: string;
}

// Placeholder, throwaway, and test domains that never reach a real person.
const BLOCKED_DOMAINS = new Set([
  "example.com", "example.net", "example.org", "test.com", "test.net", "email.com", "mail.com", "fake.com", "none.com", "no.com", "abc.com", "asdf.com", "aaa.com", "domain.com", "website.com", "company.com", "temp.com",
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "throwawaymail.com", "yopmail.com", "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc", "sharklasers.com", "spamgourmet.com", "mohmal.com", "fakeinbox.com", "mintemail.com", "emailondeck.com", "tempr.email", "burnermail.io", "moakt.com",
]);

const TYPO_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmai.com": "gmail.com", "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com", "ymail.co": "ymail.com",
  "hotmal.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com", "hotnail.com": "hotmail.com",
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com", "aol.co": "aol.com", "comcast.ent": "comcast.net",
};

const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function checkEmail(raw: string): CheckResult {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return { ok: false, message: "We need thy email!" };
  if (!value.includes("@")) return { ok: false, message: "An email needs an @ in it, adventurer." };
  if (!EMAIL_RE.test(value) || value.includes("..")) return { ok: false, message: "That doesn't look like a real email address. Check for typos." };
  const domain = value.split("@")[1];
  const fix = TYPO_FIXES[domain];
  if (fix) return { ok: false, message: `Did you mean ${value.split("@")[0]}@${fix}?`, suggestion: `${value.split("@")[0]}@${fix}` };
  if (BLOCKED_DOMAINS.has(domain) || /^(test|fake|none|asdf|abc|qwerty|noemail|na|no)\d*@/.test(value)) {
    return { ok: false, message: "We need a real inbox so John can send your loot. Throwaway and placeholder addresses don't count." };
  }
  return { ok: true, value };
}

/** North American numbers: 10 digits, optional leading 1, real area code and exchange. */
export function checkPhone(raw: string): CheckResult {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return { ok: false, message: "Thy phone number, please!" };
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return { ok: false, message: "Please enter a 10 digit phone number, like (555) 123-4567 but real." };
  if (/^(\d)\1{9}$/.test(digits)) return { ok: false, message: "A phone number can't be the same digit ten times." };
  if ("0123456789012".includes(digits) || "9876543210987".includes(digits)) return { ok: false, message: "That's a counting pattern, not a phone number." };
  const area = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  const line = digits.slice(6);
  if (area[0] === "0" || area[0] === "1" || exchange[0] === "0" || exchange[0] === "1") return { ok: false, message: "That area code or exchange isn't a real one. Check the number." };
  if (area[1] === "9") return { ok: false, message: "That area code isn't a real one. Check the number." };
  if (area === "555" || exchange === "555") return { ok: false, message: "Nice try, that's a movie number. We need one that actually rings." };
  if (/^(\d)\1{6}$/.test(exchange + line)) return { ok: false, message: "That doesn't look like a real phone number." };
  const value = `(${area}) ${exchange}-${line}`;
  return { ok: true, value };
}

export function checkName(raw: string): CheckResult {
  const value = (raw || "").trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, message: "Thy name is required!" };
  if (value.length < 2 || !/[a-z]/i.test(value)) return { ok: false, message: "Please enter your name, adventurer." };
  if (/^(test|asdf|qwerty|none|na|n\/a|abc|xxx+|aaa+)$/i.test(value)) return { ok: false, message: "A real name, please. John likes to know who's at the bar." };
  return { ok: true, value };
}
