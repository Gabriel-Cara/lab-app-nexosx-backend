# Porty Backend API

API em Node.js/Express para gestão de portaria de condomínios, abrangendo autenticação, cadastro de moradores e colaboradores, controle de visitantes, reservas de áreas comuns, eventos e registro de encomendas.

## Visão Geral da Arquitetura

O projeto segue princípios de Clean Architecture, separando responsabilidades em camadas claras:

```
src/
├─ app.ts                # Configuração do Express e middlewares globais
├─ server.ts             # Bootstrap do servidor HTTP
├─ configs/              # Configurações compartilhadas (JWT, Swagger)
├─ controllers/          # Regras de orquestração HTTP
├─ database/             # Cliente Prisma (ORM)
├─ middlewares/          # Middlewares de autenticação e tratamento de erros
├─ routes/               # Agrupamento das rotas por domínio
├─ services/             # Serviços de domínio (ex.: notificações)
├─ types/                # Tipos globais (ex.: extensão do Request do Express)
├─ utils/                # Utilitários puros reutilizáveis
├─ validators/           # Schemas de validação com Zod
└─ docs/                 # Especificação Swagger/OpenAPI
```

### Principais componentes

- **Validação**: Todos os payloads de entrada passam por schemas Zod, garantindo contratos explícitos e mensagens de erro consistentes.
- **Persistência**: Prisma Client com Postgres, incluindo enums para papeis de usuário e status de reservas.
- **Autenticação**: JWT com rotas protegidas via middlewares `authenticate` e `authorize`, suportando perfis `admin`, `staff` e `resident`.
- **Tratamento de erros**: Classe `AppError` para erros previsíveis e middleware centralizado que traduz exceções em respostas HTTP padronizadas.
- **Notificações**: Serviço em `services/notification-service.ts` preparado para expansão, enviando log no console por padrão.

## Tecnologias

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Prisma ORM](https://www.prisma.io/)
- [Zod](https://zod.dev/)
- [JSON Web Token](https://jwt.io/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/) para documentação interativa

## Requisitos

- Node.js 20+
- NPM 9+
- Docker (opcional, para subir o banco via `docker-compose`)
- Banco PostgreSQL configurado (local ou remoto)

## Configuração do Ambiente

1. Copie o arquivo `.env.example` (crie um se necessário) e defina as variáveis:

   ```bash
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/api-portaria"
   JWT_SECRET="uma-chave-bem-segura"
   NOTIFICATION_PROVIDER="console" # ou outro provedor quando implementado
   PORT=3333
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Gere o cliente Prisma e aplique as migrações:

   ```bash
   npx prisma generate
   npx prisma migrate deploy # ou migrate dev em ambiente local
   ```

### Banco de dados via Docker

Um container PostgreSQL pode ser iniciado com:

```bash
docker-compose up -d postgres
```

As credenciais padrão estão definidas em `docker-compose.yml` (`postgres`/`postgres`).

## Executando o projeto

```bash
npm run dev
```

O servidor iniciará por padrão em `http://localhost:3333`. As rotas protegidas exigem envio do header `Authorization: Bearer <token>`.

## Documentação Swagger

A documentação interativa está disponível após subir o servidor em:

```
GET http://localhost:3333/docs
```

A página carrega os assets do Swagger UI via CDN público, portanto é necessário acesso à internet para exibi-la. Ela descreve endpoints, schemas de entrada/saída e requisitos de autenticação para todos os domínios (`auth`, `areas`, `events`, `packages`, `reservations` e `visitors`).

## Casos de Uso Principais

- **Autenticação**: `POST /auth/login` gera token JWT. `GET /auth/me` retorna dados do usuário autenticado.
- **Gestão de usuários**: `POST /auth/users` e `GET /auth/users` (restritas a administradores/funcionários).
- **Áreas comuns**: CRUD completo em `/areas` para cadastro e manutenção.
- **Eventos**: criação/listagem de eventos e inscrição de moradores (`/events/book`).
- **Encomendas**: registro de chegada, listagem por perfil e confirmação de retirada com validação de código.
- **Reservas**: criação, listagem com filtros, aprovação, rejeição e cancelamento (`/reservations`).
- **Visitantes**: registro de entrada, listagem e saída (`/visitors`).

## Boas Práticas Implementadas

- **Clean Code**: nomenclatura clara, responsabilidades únicas por arquivo e uso extensivo de funções puras/utilitários.
- **Camadas explícitas**: controladores apenas orquestram serviços/ORM, mantendo baixo acoplamento.
- **Validação consistente**: Zod centraliza regras de negócio, evitando lógica duplicada em controladores.
- **Tratamento de erros uniforme**: `AppError` evita vazamento de detalhes internos e mantém respostas previsíveis.
- **Observabilidade**: Prisma é configurado para logar queries, ajudando na análise de performance.
- **Extensibilidade**: serviço de notificações preparado para implementação de provedores externos.

## Próximos passos sugeridos

- Criar testes automatizados (unitários e end-to-end) para cobrir fluxos críticos.
- Adicionar políticas de rate-limit e auditoria de acessos.
- Integrar provedores reais de notificação (ex.: Twilio, SMS) por meio do serviço existente.
- Configurar CI/CD com linting e análise estática (ESLint, Prettier, etc.).

---

Feito com ❤️ para tornar a portaria mais eficiente e segura.
