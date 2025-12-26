import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordSetupEmail(
  email: string,
  name: string,
  token: string
) {
  const link = `${env.FRONT_URL}/primeiro-acesso?token=${token}`;

  await resend.emails.send({
    from: env.MAIL_FROM,
    to: email,
    subject: "Defina sua senha de acesso",
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Primeiro acesso</title>
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
                <!-- Header -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h1 style="
                      margin: 0;
                      font-size: 20px;
                      color: #111827;
                    ">
                      Bem-vindo(a)!
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="color: #374151; font-size: 14px; line-height: 1.6;">
                    <p style="margin: 0 0 16px;">
                      Olá, <strong>${name}</strong>,
                    </p>

                    <p style="margin: 0 0 16px;">
                      Seu acesso ao sistema do condomínio foi criado com sucesso.
                      Para continuar, você precisa definir sua senha de acesso.
                    </p>

                    <p style="margin: 0 0 24px;">
                      Clique no botão abaixo para criar sua senha:
                    </p>

                    <!-- Button -->
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a
                            href="${link}"
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
                            Criar senha
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
                      Este link é válido por <strong>1 hora</strong>.
                      Caso não tenha solicitado este acesso, ignore este e-mail.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
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
    `,
  });
}
