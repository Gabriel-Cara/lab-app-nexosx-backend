import { env } from "@/env";

export interface NotificationPayload {
  phone?: string;
  message: string;
}

/**
 * This service encapsulates the logic to notify residents. It can be extended to integrate with
 * providers such as Twilio or AWS SNS. For this demo the provider simply logs in the console.
 */
export const notifyResident = async ({ phone, message }: NotificationPayload) => {
  if (env.NOTIFICATION_PROVIDER === "console") {
    console.info(`[notification] Enviando mensagem para ${phone ?? "desconhecido"}: ${message}`);
    return;
  }

  // Placeholder for real providers.
  console.warn("Provider não configurado, mensagem não enviada");
};
