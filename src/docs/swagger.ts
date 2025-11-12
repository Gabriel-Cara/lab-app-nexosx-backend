const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Porty Backend API",
    description:
      "API responsável pela gestão de portaria, visitantes, encomendas e reservas de áreas comuns.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:3333",
      description: "Ambiente local",
    },
  ],
  tags: [
    { name: "Auth", description: "Autenticação e gestão de usuários" },
    { name: "Áreas", description: "Gestão das áreas comuns" },
    { name: "Eventos", description: "Eventos em áreas comuns" },
    { name: "Encomendas", description: "Registro e retirada de encomendas" },
    { name: "Reservas", description: "Reservas de áreas comuns" },
    { name: "Visitantes", description: "Controle de visitantes" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Descrição do erro retornado pela API.",
          },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      AuthenticatedUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin", "staff", "resident"] },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/AuthenticatedUser" },
        },
      },
      UserInput: {
        type: "object",
        required: ["name", "email", "role", "password"],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string", nullable: true },
          role: { type: "string", enum: ["admin", "staff", "resident"] },
          apartment: { type: "string", nullable: true },
          password: { type: "string", minLength: 6 },
          building: { type: "string", nullable: true },
          vehicle: { type: "string", nullable: true },
          emergencyContact: { type: "string", nullable: true },
        },
      },
      Area: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          capacity: { type: "integer", nullable: true },
          available: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AreaInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string", nullable: true },
          capacity: { type: "integer", nullable: true },
          available: { type: "boolean" },
        },
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          commonAreaId: { type: "string", format: "uuid" },
          capacity: { type: "integer" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
        },
      },
      EventInput: {
        type: "object",
        required: ["title", "commonAreaId", "capacity", "startDate", "endDate"],
        properties: {
          title: { type: "string" },
          description: { type: "string", nullable: true },
          commonAreaId: { type: "string", format: "uuid" },
          capacity: { type: "integer" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
        },
      },
      EventBookingInput: {
        type: "object",
        required: ["eventId"],
        properties: {
          eventId: { type: "string", format: "uuid" },
          notes: { type: "string", nullable: true },
        },
      },
      Package: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string" },
          description: { type: "string" },
          carrier: { type: "string", nullable: true },
          residentId: { type: "string", format: "uuid" },
          createdById: { type: "string", format: "uuid" },
          receivedAt: { type: "string", format: "date-time" },
          retrievedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      PackageInput: {
        type: "object",
        required: ["residentId", "description", "carrier"],
        properties: {
          residentId: { type: "string", format: "uuid" },
          description: { type: "string" },
          carrier: { type: "string" },
        },
      },
      PackageRetrieveInput: {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string" },
        },
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          areaId: { type: "string", format: "uuid" },
          residentId: { type: "string", format: "uuid" },
          date: { type: "string", format: "date-time" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          purpose: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "cancelled"],
          },
        },
      },
      ReservationInput: {
        type: "object",
        required: ["areaId", "date", "startTime", "endTime"],
        properties: {
          areaId: { type: "string", format: "uuid" },
          date: { type: "string", format: "date-time" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          purpose: { type: "string", nullable: true },
        },
      },
      VisitorInput: {
        type: "object",
        required: ["name", "document", "hostId"],
        properties: {
          name: { type: "string" },
          document: { type: "string" },
          phone: { type: "string", nullable: true },
          visitReason: { type: "string", nullable: true },
          hostId: { type: "string", format: "uuid" },
        },
      },
      VisitorExitInput: {
        type: "object",
        properties: {
          notes: { type: "string", nullable: true },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autentica um usuário e retorna o token JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Autenticação realizada com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "401": {
            description: "Credenciais inválidas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
        security: [],
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Retorna os dados do usuário autenticado",
        responses: {
          "200": {
            description: "Usuário autenticado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthenticatedUser" },
              },
            },
          },
          "401": {
            description: "Token inválido ou ausente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/users": {
      post: {
        tags: ["Auth"],
        summary: "Cria um novo usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Usuário criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthenticatedUser" },
              },
            },
          },
          "400": {
            description: "Erro de validação ou usuário existente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Auth"],
        summary: "Lista usuários cadastrados",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Página atual da paginação",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            description: "Quantidade de registros por página",
          },
          {
            in: "query",
            name: "search",
            schema: { type: "string" },
            description:
              "Texto livre para buscar por nome, email, telefone ou apartamento",
          },
          {
            in: "query",
            name: "role",
            schema: {
              type: "string",
              enum: ["admin", "resident", "staff"],
            },
            description: "Filtra por perfil de usuário",
          },
        ],
        responses: {
          "200": {
            description: "Lista de usuários",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/AuthenticatedUser" },
                },
              },
            },
            headers: {
              "x-total-count": {
                description: "Total de registros encontrados para os filtros",
                schema: { type: "integer" },
              },
              "x-total-pages": {
                description: "Total de páginas disponíveis",
                schema: { type: "integer" },
              },
              "x-page": {
                description: "Página retornada",
                schema: { type: "integer" },
              },
              "x-limit": {
                description: "Limite utilizado na consulta",
                schema: { type: "integer" },
              },
            },
          },
        },
      },
    },
    "/areas": {
      get: {
        tags: ["Áreas"],
        summary: "Lista todas as áreas comuns",
        responses: {
          "200": {
            description: "Áreas cadastradas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Area" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Áreas"],
        summary: "Cria uma nova área comum",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AreaInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Área criada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Area" },
              },
            },
          },
        },
      },
    },
    "/areas/{id}": {
      put: {
        tags: ["Áreas"],
        summary: "Atualiza uma área comum",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AreaInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Área atualizada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Area" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Áreas"],
        summary: "Remove uma área comum",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "204": {
            description: "Área removida",
          },
        },
      },
    },
    "/events": {
      get: {
        tags: ["Eventos"],
        summary: "Lista eventos cadastrados",
        responses: {
          "200": {
            description: "Eventos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Event" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Eventos"],
        summary: "Cria um novo evento",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EventInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Evento criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Event" },
              },
            },
          },
        },
      },
    },
    "/events/book": {
      post: {
        tags: ["Eventos"],
        summary: "Confirma presença em um evento",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EventBookingInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Reserva confirmada",
          },
          "400": {
            description: "Evento lotado ou dados inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/packages": {
      get: {
        tags: ["Encomendas"],
        summary: "Lista encomendas registradas",
        responses: {
          "200": {
            description: "Encomendas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Package" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Encomendas"],
        summary: "Registra a chegada de uma nova encomenda",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PackageInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Encomenda registrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Package" },
              },
            },
          },
        },
      },
    },
    "/packages/{id}/retrieve": {
      post: {
        tags: ["Encomendas"],
        summary: "Confirma a retirada de uma encomenda",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PackageRetrieveInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Encomenda atualizada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Package" },
              },
            },
          },
          "400": {
            description: "Código inválido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/reservations": {
      get: {
        tags: ["Reservas"],
        summary: "Lista reservas de áreas",
        parameters: [
          {
            name: "areaId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            required: false,
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pending", "approved", "rejected", "cancelled"],
            },
            required: false,
          },
        ],
        responses: {
          "200": {
            description: "Reservas filtradas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reservations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Reservation" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Reservas"],
        summary: "Cria uma reserva de área",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReservationInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Reserva criada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Reservation" },
              },
            },
          },
          "409": {
            description: "Conflito de horário",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/reservations/{id}/approve": {
      patch: {
        tags: ["Reservas"],
        summary: "Aprova uma reserva",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Reserva aprovada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Reservation" },
              },
            },
          },
        },
      },
    },
    "/reservations/{id}/reject": {
      patch: {
        tags: ["Reservas"],
        summary: "Rejeita uma reserva",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Reserva rejeitada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Reservation" },
              },
            },
          },
        },
      },
    },
    "/reservations/{id}/cancel": {
      patch: {
        tags: ["Reservas"],
        summary: "Cancela uma reserva",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Reserva cancelada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Reservation" },
              },
            },
          },
        },
      },
    },
    "/visitors": {
      get: {
        tags: ["Visitantes"],
        summary: "Lista os últimos visitantes",
        responses: {
          "200": {
            description: "Visitas registradas",
          },
        },
      },
      post: {
        tags: ["Visitantes"],
        summary: "Registra a entrada de um visitante",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VisitorInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Visita registrada",
          },
        },
      },
    },
    "/visitors/{id}/exit": {
      post: {
        tags: ["Visitantes"],
        summary: "Registra a saída de um visitante",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VisitorExitInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Saída registrada",
          },
        },
      },
    },
  },
} as const;

export { swaggerDocument };
