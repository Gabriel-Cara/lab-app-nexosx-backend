import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

type ConfirmationEmailInput = {
  email: string;
  name: string;
  condominiumName?: string | null;
  condominiumCode?: string | null;
};

export async function sendAccountConfirmationEmail({
  email,
  name,
  condominiumName,
  condominiumCode,
}: ConfirmationEmailInput) {
  const loginUrl = `${env.FRONT_URL}/sign-in`;
  const condominiumLabel = condominiumName
    ? `${condominiumName}${condominiumCode ? ` (${condominiumCode})` : ""}`
    : null;

  const condominiumLine = condominiumLabel
    ? `<p style="margin: 0 0 16px;">
        Seu cadastro como portaria no condomínio <strong>${condominiumLabel}</strong> foi confirmado.
      </p>`
    : `<p style="margin: 0 0 16px;">
        Seu cadastro como portaria foi confirmado.
      </p>`;

  await resend.emails.send({
    from: env.MAIL_FROM,
    to: email,
    subject: "Cadastro confirmado",
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Cadastro confirmado</title>
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
                      Cadastro confirmado
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="color: #374151; font-size: 14px; line-height: 1.6;">
                    <p style="margin: 0 0 16px;">
                      Olá, <strong>${name}</strong>,
                    </p>
                    ${condominiumLine}
                    <p style="margin: 0 0 24px;">
                      Você já pode acessar a plataforma com seu e-mail e senha.
                    </p>

                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a
                            href="${loginUrl}"
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
                            Fazer login
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-top: 32px;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                      © ${new Date().getFullYear()} nexosx
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
