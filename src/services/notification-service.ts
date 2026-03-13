import { env } from "@/env";

type SupportedProvider = "console" | "twilio_sms" | "twilio_whatsapp";
export type ExternalNotificationProvider = Exclude<
  SupportedProvider,
  "console"
>;

export interface NotificationTemplatePayload {
  contentSid: string;
  contentVariables?: Record<string | number, string | number | boolean>;
}

export interface NotificationPayload {
  phone?: string;
  message: string;
  whatsappTemplate?: NotificationTemplatePayload;
}

export type NotificationStatus = "sent" | "skipped" | "failed";
export type NotificationFailureReason =
  | "missing_phone"
  | "no_external_provider"
  | "twilio_not_configured"
  | "twilio_from_missing"
  | "twilio_error";

export type NotificationDeliveryResult = {
  provider: ExternalNotificationProvider;
  status: NotificationStatus;
  sid?: string;
  errorCode?: string;
  errorMessage?: string;
  message?: string;
};

export type NotificationResult = {
  status: NotificationStatus;
  reason?: NotificationFailureReason;
  message?: string;
  deliveries: NotificationDeliveryResult[];
};

const parseProviders = (raw?: string | null): SupportedProvider[] => {
  const tokens = (raw ?? "console")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const providers = new Set<SupportedProvider>();

  for (const token of tokens) {
    if (
      token === "console" ||
      token === "twilio_sms" ||
      token === "twilio_whatsapp"
    ) {
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

type TwilioErrorLike = {
  code?: number | string;
  message?: string;
};

const getProviderLabel = (provider: ExternalNotificationProvider) =>
  provider === "twilio_sms" ? "SMS" : "WhatsApp";

/**
 * This service encapsulates the logic to notify residents. It can be extended to integrate with
 * providers such as Twilio or AWS SNS. For this demo the provider simply logs in the console.
 */
export const notifyResident = async ({
  phone,
  message,
  whatsappTemplate,
}: NotificationPayload): Promise<NotificationResult> => {
  const providers = parseProviders(env.NOTIFICATION_PROVIDER);

  if (!phone) {
    console.warn("[notification] Telefone ausente, mensagem não enviada");
    return {
      status: "skipped",
      reason: "missing_phone",
      message: "Morador sem telefone cadastrado.",
      deliveries: [],
    };
  }

  if (providers.includes("console")) {
    console.info(`[notification] Enviando mensagem para ${phone}: ${message}`);
  }

  const twilioProviders = providers.filter(
    (provider): provider is ExternalNotificationProvider =>
      provider === "twilio_sms" || provider === "twilio_whatsapp",
  );

  if (twilioProviders.length === 0) {
    console.warn(
      "[notification] Provider não configurado/suportado, mensagem não enviada",
    );
    return {
      status: "skipped",
      reason: "no_external_provider",
      message: "Envio de notificações não configurado.",
      deliveries: [],
    };
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn(
      "[notification] Twilio não configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)",
    );
    return {
      status: "failed",
      reason: "twilio_not_configured",
      message: "Twilio não configurado.",
      deliveries: [],
    };
  }

  type TwilioMessageCreateParams =
    | {
        body: string;
        from: string;
        to: string;
      }
    | {
        from: string;
        to: string;
        contentSid: string;
        contentVariables?: string;
      };

  type TwilioMessageResponse = {
    sid?: string;
    status?: string;
  };

  type TwilioClient = {
    messages: {
      create: (
        params: TwilioMessageCreateParams,
      ) => Promise<TwilioMessageResponse>;
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
      deliveries: [],
    };
  }

  let sentCount = 0;
  let missingFrom = false;
  const deliveries: NotificationDeliveryResult[] = [];

  for (const provider of twilioProviders) {
    const from =
      provider === "twilio_sms"
        ? env.TWILIO_FROM_SMS
        : env.TWILIO_FROM_WHATSAPP;

    if (!from) {
      missingFrom = true;
      console.warn(
        `[notification] Twilio 'from' não configurado (${provider === "twilio_sms" ? "TWILIO_FROM_SMS" : "TWILIO_FROM_WHATSAPP"})`,
      );
      deliveries.push({
        provider,
        status: "failed",
        message: "Número de origem do Twilio não configurado.",
      });
      continue;
    }

    const to = provider === "twilio_whatsapp" ? `whatsapp:${phone}` : phone;
    const fromFinal =
      provider === "twilio_whatsapp"
        ? from.startsWith("whatsapp:")
          ? from
          : `whatsapp:${from}`
        : from;

    let params: TwilioMessageCreateParams;

    if (provider === "twilio_whatsapp" && whatsappTemplate?.contentSid) {
      const otpRaw =
        whatsappTemplate.contentVariables?.[1] ??
        whatsappTemplate.contentVariables?.["1"];

      const normalizedOtp =
        otpRaw === undefined || otpRaw === null ? "" : String(otpRaw).trim();

      if (!normalizedOtp) {
        deliveries.push({
          provider,
          status: "failed",
          message:
            "Template do WhatsApp exige a variável 1 com um código válido.",
        });
        continue;
      }

      if (normalizedOtp.length > 15) {
        deliveries.push({
          provider,
          status: "failed",
          message:
            "O código do template WhatsApp deve ter no máximo 15 caracteres.",
        });
        continue;
      }

      if (/[\n\r\t]/.test(normalizedOtp) || / {4,}/.test(normalizedOtp)) {
        deliveries.push({
          provider,
          status: "failed",
          message: "O código do template WhatsApp contém formatação inválida.",
        });
        continue;
      }

      params = {
        from: fromFinal,
        to,
        contentSid: whatsappTemplate.contentSid,
        contentVariables: JSON.stringify({ 1: normalizedOtp }),
      };
    } else {
      params = {
        body: message,
        from: fromFinal,
        to,
      };
    }

    try {
      if (provider === "twilio_whatsapp" && "contentSid" in params) {
        console.log("[notification][whatsapp] payload", {
          from: params.from,
          to: params.to,
          contentSid: params.contentSid,
          contentVariables: params.contentVariables,
        });
      }

      const result = await client.messages.create(params);
      sentCount += 1;
      deliveries.push({
        provider,
        status: "sent",
        sid: result?.sid,
        message: `${getProviderLabel(provider)} enviado com sucesso.`,
      });
    } catch (error) {
      const twilioError = error as TwilioErrorLike;
      console.error(
        "[notification] Falha ao enviar mensagem via Twilio",
        error,
      );
      deliveries.push({
        provider,
        status: "failed",
        errorCode: twilioError.code ? String(twilioError.code) : undefined,
        errorMessage: twilioError.message,
        message: `Falha ao enviar via ${getProviderLabel(provider)}.`,
      });
    }
  }

  if (sentCount > 0) {
    const failedCount = deliveries.filter(
      (delivery) => delivery.status === "failed",
    ).length;
    return {
      status: "sent",
      message:
        failedCount > 0
          ? "Notificação enviada com falhas parciais."
          : "Notificação enviada com sucesso.",
      deliveries,
    };
  }

  if (missingFrom) {
    return {
      status: "failed",
      reason: "twilio_from_missing",
      message: "Número de origem do Twilio não configurado.",
      deliveries,
    };
  }

  return {
    status: "failed",
    reason: "twilio_error",
    message: "Falha ao enviar via Twilio.",
    deliveries,
  };
};
