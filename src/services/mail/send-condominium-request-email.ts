import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

type EmailCTA = {
  label: string;
  url: string;
};

type EmailTemplateInput = {
  title: string;
  body: string;
  cta?: EmailCTA;
};

function renderEmailTemplate({ title, body, cta }: EmailTemplateInput) {
  const ctaBlock = cta
    ? `
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a
                href="${cta.url}"
                style="
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #2563eb;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                  font-size: 14px;
                "
              >
                ${cta.label}
              </a>
            </td>
          </tr>
        </table>
      `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${title}</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family: Arial, Helvetica, sans-serif;
    ">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            <table width="100%" max-width="480" cellpadding="0" cellspacing="0"
              style="
                max-width: 480px;
                background-color: #ffffff;
                border-radius: 8px;
                padding: 32px;
              "
            >
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <h1 style="
                    margin: 0;
                    font-size: 20px;
                    color: #111827;
                  ">
                    ${title}
                  </h1>
                </td>
              </tr>

              <tr>
                <td style="color: #374151; font-size: 14px; line-height: 1.6;">
                  ${body}
                  ${ctaBlock}
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-top: 32px;">
                  <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    © ${new Date().getFullYear()} nexus
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

type RequestEmailInput = {
  email: string;
  name: string;
  condominiumName: string;
  condominiumCode: string;
};

export async function sendCondominiumRequestSubmittedEmail({
  email,
  name,
  condominiumName,
  condominiumCode,
}: RequestEmailInput) {
  const body = `
    <p style="margin: 0 0 16px;">
      Olá, <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 16px;">
      Recebemos a sua solicitação de cadastro do condomínio
      <strong>${condominiumName}</strong> (código: ${condominiumCode}).
    </p>
    <p style="margin: 0 0 24px;">
      Em até <strong>1 dia</strong> você receberá um retorno por e-mail com a
      aprovação ou reprovação.
    </p>
  `;

  await resend.emails.send({
    from: env.MAIL_FROM,
    to: email,
    subject: "Solicitação de cadastro recebida",
    html: renderEmailTemplate({
      title: "Solicitação enviada com sucesso",
      body,
    }),
  });
}

export async function sendCondominiumRequestApprovedEmail({
  email,
  name,
  condominiumName,
  condominiumCode,
}: RequestEmailInput) {
  const loginUrl = `${env.FRONT_URL}/sign-in`;

  const body = `
    <p style="margin: 0 0 16px;">
      Olá, <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 16px;">
      Sua solicitação para o condomínio <strong>${condominiumName}</strong>
      (código: ${condominiumCode}) foi aprovada.
    </p>
    <p style="margin: 0 0 24px;">
      Seu cadastro foi confirmado e você já pode fazer login com o e-mail e a
      senha informados no momento do cadastro.
    </p>
  `;

  await resend.emails.send({
    from: env.MAIL_FROM,
    to: email,
    subject: "Solicitação aprovada",
    html: renderEmailTemplate({
      title: "Cadastro aprovado",
      body,
      cta: {
        label: "Fazer login",
        url: loginUrl,
      },
    }),
  });
}

type RejectionEmailInput = RequestEmailInput & {
  reason?: string | null;
};

export async function sendCondominiumRequestRejectedEmail({
  email,
  name,
  condominiumName,
  condominiumCode,
  reason,
}: RejectionEmailInput) {
  const rejectionReason = reason?.trim() ? reason.trim() : "Não informado";

  const body = `
    <p style="margin: 0 0 16px;">
      Olá, <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 16px;">
      Sua solicitação para o condomínio <strong>${condominiumName}</strong>
      (código: ${condominiumCode}) foi reprovada.
    </p>
    <p style="margin: 0 0 24px;">
      Motivo informado: <strong>${rejectionReason}</strong>
    </p>
  `;

  await resend.emails.send({
    from: env.MAIL_FROM,
    to: email,
    subject: "Solicitação reprovada",
    html: renderEmailTemplate({
      title: "Solicitação reprovada",
      body,
    }),
  });
}
