import { env } from "@/env";

type SupportedProvider = "console" | "twilio_sms" | "twilio_whatsapp";

export interface NotificationPayload {
  phone?: string;
  message: string;
}

/**
 * This service encapsulates the logic to notify residents. It can be extended to integrate with
 * providers such as Twilio or AWS SNS. For this demo the provider simply logs in the console.
 */
export const notifyResident = async ({ phone, message }: NotificationPayload) => {
  const provider = (env.NOTIFICATION_PROVIDER ?? "console") as SupportedProvider;

  if (provider === "console") {
    console.info(`[notification] Enviando mensagem para ${phone ?? "desconhecido"}: ${message}`);
    return;
  }

  if (!phone) {
    console.warn("[notification] Telefone ausente, mensagem não enviada");
    return;
  }

  if (provider === "twilio_sms" || provider === "twilio_whatsapp") {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("[notification] Twilio não configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)");
      return;
    }

    // Lazy import so you don't need Twilio installed when using console provider.
    const { default: twilio } = await import("twilio");
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const from =
      provider === "twilio_sms" ? env.TWILIO_FROM_SMS : env.TWILIO_FROM_WHATSAPP;

    if (!from) {
      console.warn(
        `[notification] Twilio 'from' não configurado (${provider === "twilio_sms" ? "TWILIO_FROM_SMS" : "TWILIO_FROM_WHATSAPP"})`
      );
      return;
    }

    const to = provider === "twilio_whatsapp" ? `whatsapp:${phone}` : phone;
    const fromFinal = provider === "twilio_whatsapp" ? (from.startsWith("whatsapp:") ? from : `whatsapp:${from}`) : from;

    await client.messages.create({
      body: message,
      from: fromFinal,
      to,
    });
    return;
  }

  console.warn("[notification] Provider não configurado/suportado, mensagem não enviada");
};
