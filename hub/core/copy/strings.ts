import { APP_DISPLAY_NAME } from "../config.ts";

/**
 * Shell copy in one place. Plain and literal: no idioms, no "soon", nothing
 * that grades. Modules keep their own copy files and follow the same rules.
 */
export const COPY = {
  appName: APP_DISPLAY_NAME,
  welcomeHome: (name: string) => `Welcome home, ${name}.`,
  welcomeBack: "Welcome back.",
  checkInButton: "How are you, really?",
  gentleDay: "Gentle day",
  gentleDayOn: "Gentle day is on.",
  gentleDayOff: "Gentle day is off.",
  partnerGentle: (name: string) => `${name} is having a gentle day.`,
  needHelpNow: "Need help now",
  headsUp: "Heads-up",
  sendHeadsUp: "Send a heads-up",
  noOpenHeadsUps: "No open heads-ups.",
  nothingToday: "Nothing needs you today.",
  goodEnough: "Good enough counts as done.",
  saved: "Saved.",
  signOut: "Sign out",
  help: {
    space: "Space",
    quietPresence: "Quiet presence",
    practicalHelp: "Practical help",
    words: "Words",
    dontFixIt: "Please don't fix it",
  },
  helpDescription: {
    space: "Some time alone, and no questions for now.",
    quietPresence: "Be nearby without needing to talk.",
    practicalHelp: "Take something off my plate.",
    words: "Say something kind, out loud or in a message.",
    dontFixIt: "Listen. No solutions right now.",
  },
  response: {
    onIt: "I'm on it",
    hug: "Send a hug",
    talkLater: "Can we talk later?",
  },
  responseSeen: {
    onIt: "said: I'm on it.",
    hug: "sent a hug.",
    talkLater: "asked: can we talk later?",
  },
} as const;

export type HelpKind = keyof typeof COPY.help;
export type ResponseKind = keyof typeof COPY.response;
