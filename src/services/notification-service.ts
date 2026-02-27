import { env } from "@/env";

type SupportedProvider = "console" | "twilio_sms" | "twilio_whatsapp";

export interface NotificationPayload {
  phone?: string;
  message: string;
}

export type NotificationStatus = "sent" | "skipped" | "failed";
export type NotificationFailureReason =
  | "missing_phone"
  | "no_external_provider"
  | "twilio_not_configured"
  | "twilio_from_missing"
  | "twilio_error";

export type NotificationResult = {
  status: NotificationStatus;
  reason?: NotificationFailureReason;
  message?: string;
};

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
export const notifyResident = async ({
  phone,
  message,
}: NotificationPayload): Promise<NotificationResult> => {
  const providers = parseProviders(env.NOTIFICATION_PROVIDER);

  if (!phone) {
    console.warn("[notification] Telefone ausente, mensagem não enviada");
    return {
      status: "skipped",
      reason: "missing_phone",
      message: "Morador sem telefone cadastrado.",
    };
  }

  if (providers.includes("console")) {
    console.info(`[notification] Enviando mensagem para ${phone}: ${message}`);
  }

  const twilioProviders = providers.filter(
    (provider) => provider === "twilio_sms" || provider === "twilio_whatsapp"
  );

  if (twilioProviders.length === 0) {
    console.warn("[notification] Provider não configurado/suportado, mensagem não enviada");
    return {
      status: "skipped",
      reason: "no_external_provider",
      message: "Envio de notificações não configurado.",
    };
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn("[notification] Twilio não configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)");
    return {
      status: "failed",
      reason: "twilio_not_configured",
      message: "Twilio não configurado.",
    };
  }

  type TwilioClient = {
    messages: {
      create: (params: { body: string; from: string; to: string }) => Promise<unknown>;
    };
  };
  let client: TwilioClient | null = null;
  try {
    // Lazy import so you don't need Twilio installed when using console provider.
    const { default: twilio } = await import("twilio");
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error("[notification] Falha ao inicializar Twilio", error);
    return {
      status: "failed",
      reason: "twilio_error",
      message: "Falha ao enviar via Twilio.",
    };
  }

  let sentCount = 0;
  let hadError = false;
  let missingFrom = false;

  for (const provider of twilioProviders) {
    const from =
      provider === "twilio_sms" ? env.TWILIO_FROM_SMS : env.TWILIO_FROM_WHATSAPP;

    if (!from) {
      missingFrom = true;
      hadError = true;
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

    try {
      await client.messages.create({
        body: message,
        from: fromFinal,
        to,
      });
      sentCount += 1;
    } catch (error) {
      hadError = true;
      console.error("[notification] Falha ao enviar mensagem via Twilio", error);
    }
  }

  if (sentCount > 0) {
    if (hadError) {
      console.warn("[notification] Mensagem enviada com falhas parciais");
    }
    return { status: "sent" };
  }

  if (missingFrom) {
    return {
      status: "failed",
      reason: "twilio_from_missing",
      message: "Número de origem do Twilio não configurado.",
    };
  }

  return {
    status: "failed",
    reason: "twilio_error",
    message: "Falha ao enviar via Twilio.",
  };
};
