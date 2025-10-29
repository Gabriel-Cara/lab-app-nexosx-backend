import express from "express";
import "express-async-errors";

import { swaggerDocument } from "./docs/swagger";
import { errorHandling } from "./middlewares/error-handling";
import { routes } from "./routes";

const app = express();

app.use(express.json());

app.get("/docs", (_request, response) => {
  response.type("html").send(`<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Porty API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
      <script>
        window.onload = () => {
          SwaggerUIBundle({
            url: '/docs/openapi.json',
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis],
          });
        };
      </script>
    </body>
  </html>`);
});

app.get("/docs/openapi.json", (_request, response) => {
  response.json(swaggerDocument);
});

app.use(routes);

app.use(errorHandling);

export { app };
