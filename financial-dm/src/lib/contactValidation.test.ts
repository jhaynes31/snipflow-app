import { describe, expect, test } from "bun:test";
import { checkEmail, checkName, checkPhone } from "./contactValidation";

describe("checkEmail", () => {
  test("accepts ordinary addresses and lowercases them", () => {
    expect(checkEmail("  Jen.Haynes+quiz@Yahoo.com ")).toEqual({ ok: true, value: "jen.haynes+quiz@yahoo.com" });
    expect(checkEmail("john@thefinancialdm.co.uk").ok).toBe(true);
  });
  test("rejects malformed addresses", () => {
    for (const bad of ["", "jen", "jen@", "@yahoo.com", "jen@yahoo", "jen@@yahoo.com", "jen..h@yahoo.com", "jen@yahoo..com", ".jen@yahoo.com", "jen@-yahoo.com", "jen h@yahoo.com"]) {
      expect(checkEmail(bad).ok).toBe(false);
    }
  });
  test("suggests fixes for common typos", () => {
    const r = checkEmail("jen@gmial.com");
    expect(r.ok).toBe(false);
    expect(r.suggestion).toBe("jen@gmail.com");
    expect(r.message).toContain("Did you mean");
  });
  test("rejects placeholder and throwaway addresses", () => {
    for (const bad of ["test@example.com", "a@test.com", "me@mailinator.com", "test@yahoo.com", "asdf@gmail.com", "fake123@gmail.com"]) {
      expect(checkEmail(bad).ok).toBe(false);
    }
  });
});

describe("checkPhone", () => {
  test("accepts real looking numbers in any format", () => {
    for (const good of ["(415) 867-5309", "415-867-5309", "415.867.5309", "4158675309", "1 415 867 5309", "+1 (415) 867-5309"]) {
      expect(checkPhone(good)).toEqual({ ok: true, value: "(415) 867-5309" });
    }
  });
  test("rejects wrong lengths", () => {
    for (const bad of ["", "12345", "415867530", "41586753091", "441234567890"]) {
      expect(checkPhone(bad).ok).toBe(false);
    }
  });
  test("rejects impossible area codes and exchanges", () => {
    for (const bad of ["015-867-5309", "115-867-5309", "495-867-5309", "415-067-5309", "415-167-5309"]) {
      expect(checkPhone(bad).ok).toBe(false);
    }
  });
  test("rejects movie numbers and lazy patterns", () => {
    for (const bad of ["555-010-0100", "415-555-1234", "1111111111", "2222222222", "1234567890", "9876543210", "415-777-7777"]) {
      expect(checkPhone(bad).ok).toBe(false);
    }
  });
});

describe("checkName", () => {
  test("accepts names and tidies spacing", () => {
    expect(checkName("  Jen   Haynes ")).toEqual({ ok: true, value: "Jen Haynes" });
    expect(checkName("Jo").ok).toBe(true);
  });
  test("rejects blanks and placeholders", () => {
    for (const bad of ["", " ", "J", "123", "test", "asdf", "n/a", "xxx"]) {
      expect(checkName(bad).ok).toBe(false);
    }
  });
});
