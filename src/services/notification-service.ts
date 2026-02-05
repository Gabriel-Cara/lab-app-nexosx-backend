import { env } from "@/env";

type SupportedProvider = "console" | "twilio_sms" | "twilio_whatsapp";

export interface NotificationPayload {
  phone?: string;
  message: string;
}

const parseProviders = (raw?: string | null): SupportedProvider[] => {
  const tokens = (raw ?? "console")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const providers = new Set<SupportedProvider>();

  for (const token of tokens) {
    if (token === "console" || token === "twilio_sms" || token === "twilio_whatsapp") {
      providers.add(token);
    } else {
      console.warn(`[notification] Provider desconhecido: ${token}`);
    }
  }

  if (providers.size === 0) {
    providers.add("console");
  }

  return Array.from(providers);
};

/**
 * This service encapsulates the logic to notify residents. It can be extended to integrate with
 * providers such as Twilio or AWS SNS. For this demo the provider simply logs in the console.
 */
export const notifyResident = async ({ phone, message }: NotificationPayload) => {
  const providers = parseProviders(env.NOTIFICATION_PROVIDER);

  if (providers.includes("console")) {
    console.info(`[notification] Enviando mensagem para ${phone ?? "desconhecido"}: ${message}`);
  }

  if (!phone) {
    console.warn("[notification] Telefone ausente, mensagem não enviada");
    return;
  }

  const twilioProviders = providers.filter(
    (provider) => provider === "twilio_sms" || provider === "twilio_whatsapp"
  );

  if (twilioProviders.length > 0) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("[notification] Twilio não configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)");
      return;
    }

    // Lazy import so you don't need Twilio installed when using console provider.
    const { default: twilio } = await import("twilio");
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    for (const provider of twilioProviders) {
      const from =
        provider === "twilio_sms" ? env.TWILIO_FROM_SMS : env.TWILIO_FROM_WHATSAPP;

      if (!from) {
        console.warn(
          `[notification] Twilio 'from' não configurado (${provider === "twilio_sms" ? "TWILIO_FROM_SMS" : "TWILIO_FROM_WHATSAPP"})`
        );
        continue;
      }

      const to = provider === "twilio_whatsapp" ? `whatsapp:${phone}` : phone;
      const fromFinal =
        provider === "twilio_whatsapp"
          ? from.startsWith("whatsapp:")
            ? from
            : `whatsapp:${from}`
          : from;

      await client.messages.create({
        body: message,
        from: fromFinal,
        to,
      });
    }

    return;
  }

  console.warn("[notification] Provider não configurado/suportado, mensagem não enviada");
};
