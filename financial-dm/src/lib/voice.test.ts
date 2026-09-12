import { describe, expect, test } from "bun:test";
import { chunkForSpeech, parseVoicePrefs, pickDefaultVoice, rankVoices, tidyDictation } from "./voice";

describe("voice helpers", () => {
  test("prefs parse defensively and default to off with auto-send on", () => {
    expect(parseVoicePrefs(null).enabled).toBe(false);
    expect(parseVoicePrefs("nope").autoSend).toBe(true);
    expect(parseVoicePrefs(JSON.stringify({ enabled: true, voiceName: "Samantha", rate: 5 }))).toEqual({ enabled: true, voiceName: "Samantha", autoSend: true, readHints: true, rate: 1 });
  });

  test("English, natural voices rank first; novelty voices sink", () => {
    const voices = [
      { name: "Bubbles", lang: "en-US", localService: true, default: false },
      { name: "Google UK English Male", lang: "en-GB", localService: false, default: false },
      { name: "Samantha", lang: "en-US", localService: true, default: true },
      { name: "Amelie", lang: "fr-FR", localService: true, default: false },
    ];
    expect(rankVoices(voices).map((v) => v.name)).toEqual(["Samantha", "Google UK English Male", "Bubbles", "Amelie"]);
    expect(pickDefaultVoice(voices)?.name).toBe("Samantha");
    expect(pickDefaultVoice(voices, "Amelie")?.name).toBe("Amelie");
    expect(pickDefaultVoice([])).toBeNull();
  });

  test("speech is chunked by sentence and dictation is tidied", () => {
    expect(chunkForSpeech("I've been burned before. So I'm not promising anything! Okay?")).toEqual(["I've been burned before. So I'm not promising anything! Okay?"]);
    const long = chunkForSpeech(("This is a sentence that goes on for a while. ").repeat(12));
    expect(long.length).toBeGreaterThan(1);
    for (const c of long) expect(c.length).toBeLessThanOrEqual(230);
    expect(tidyDictation("it's life insurance and the interview is free")).toBe("It's life insurance and the interview is free.");
    expect(tidyDictation("  ")).toBe("");
  });
});
