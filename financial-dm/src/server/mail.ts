import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "~/server/auth";
import { mailStatus, type MailStatus } from "~/server/mail.server";

/** For Settings: is email set up, from where, to whom, and what is missing. */
export const getMailStatus = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<MailStatus> => mailStatus());
