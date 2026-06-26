# Escopo e Status — Plataforma MMC Incidências

> Documento de escopo do projeto e registro do que está **concluído**.
> Setor: **Tecnologia e Inovação · MMC**. Última atualização: 26/06/2026.

---

## 1. Visão geral

Plataforma interna onde colaboradores registram **incidências** (problemas/bugs) e
**pedidos de melhoria/desenvolvimento** nos vários sistemas da MMC. A equipe de
suporte resolve, registra a solução, e uma **IA (OpenAI)** reaproveita soluções de
chamados anteriores parecidos e analisa imagens anexadas. Chamados podem ser
direcionados a **empresas parceiras** (ex.: Onasys), que recebem notificação por
e-mail formatada. Segurança é prioridade de ponta a ponta.

Visual inspirado em mmcturismo.com.br: **navy + laranja**, moderno, baseado em cards.

### Objetivos
- Centralizar problemas e solicitações de todos os sistemas num só lugar.
- Não resolver o mesmo problema duas vezes (IA + base de conhecimento).
- Acelerar a triagem com análise automática de imagens de erro.
- Integrar fornecedores externos ao fluxo via e-mail.
- Garantir segurança (acesso por papel, RLS, validação, headers).

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Front/Back | **Next.js 16** (App Router, Server Actions) · **TypeScript** |
| UI | **Tailwind CSS v4** · componentes próprios · **lucide-react** |
| Dados/Auth | **Supabase** (Postgres + Auth + Storage + RLS + pgvector) |
| Validação | **Zod** |
| E-mail | **Resend** + **@react-email** |
| IA | **OpenAI** (`gpt-4o-mini`, configurável via `OPENAI_MODEL`) — visão + texto |
| Hospedagem | **Vercel** (app) + **Supabase Cloud** (dados) |

---

## 3. Escopo funcional

### 3.1 Tipos de solicitação
A plataforma trata **dois tipos** na mesma base (campo `kind`):

| | **Incidência** (problema/bug) | **Melhoria & Desenvolvimento** |
|---|---|---|
| Fluxo | Aberto → Em andamento → Resolvido → Fechado | Solicitada → Em análise → Aprovada → Em desenvolvimento → Entregue (ou Recusada) |
| Campos extras | Categoria | Stakeholder/área, Justificativa/benefício |
| Prioridade | Baixa/Média/Alta/Crítica | "Impacto no negócio" (mesma escala) |
| Menu | Incidências | Melhorias |

Ambos reaproveitam: anexos, comentários, IA, e-mail às parceiras e detalhe unificado.

### 3.2 Perfis e ciclo de acesso
- **Solicitante**: abre e acompanha as próprias solicitações; consulta a base de conhecimento.
- **Técnico**: vê tudo, assume, comenta, muda status, registra solução/entrega.
- **Administrador**: tudo do técnico + gestão de sistemas, empresas, **usuários e acessos**. *(O primeiro usuário cadastrado vira admin.)*

**Provisionamento e senha** (dois caminhos):
- **Admin cria a conta** (nome, e-mail, papel) → senha inicial gerada, enviada por
  e-mail (e exibida na tela) → **troca obrigatória no 1º acesso**.
- **Auto-cadastro** → conta **pendente** até aprovação do admin.

**Segurança de acessos**: status de conta (pendente/ativo/desativado) com
**revogação instantânea**, **esqueci a senha** (link por e-mail), **último acesso**
registrado e **trilha de auditoria** (`/auditoria`).

### 3.3 Funcionalidades
- Autenticação por e-mail corporativo (**restrição de domínio** no autocadastro;
  convites do admin liberam qualquer domínio).
- Painel com métricas clicáveis (abertos, em andamento, resolvidos, melhorias em aberto) e recentes.
- Abertura de chamado/melhoria com **upload de imagens/PDF** (até 10 MB).
- Listagens com **busca full-text (português)** e filtros por status.
- Detalhe com comentários, atribuição, mudança de status e registro de solução/entrega.
- **Base de conhecimento**: incidências resolvidas, pesquisáveis.
- Administração de **sistemas**, **empresas parceiras** e **usuários/papéis**.
- Perfil do usuário (editar nome, ver papel, sair).

### 3.4 Inteligência artificial
Ao abrir uma solicitação, o servidor (best-effort, não bloqueia o fluxo):
1. Busca solicitações **resolvidas parecidas** (full-text) e pede à OpenAI um resumo
   "isto já foi resolvido no #X".
2. Se houver imagens, a OpenAI as **analisa** e descreve o erro observado.
3. O resultado aparece no painel **"Análise da IA"** do chamado.

### 3.5 Notificação a empresas parceiras
Quando uma solicitação é direcionada a uma empresa parceira, seus contatos recebem
um **e-mail HTML formatado** (marca navy/laranja) com título, descrição, prioridade,
sistema, imagens anexadas e botão para abrir o chamado.

---

## 4. Arquitetura

```
app/
  (auth)/   login, registro  + actions (login/registro/logout)
  (app)/    dashboard · incidencias[/nova /[id]] · melhorias[/nova /[id]]
            base-conhecimento · sistemas · empresas · admin · perfil
components/ ui · brand · layout · incidents (form, detalhe, badges, comentários)
lib/
  supabase/ client · server · middleware · types (mantidos à mão)
  email/    template (react-email) + envio (Resend)
  ai/       análise de imagens + sugestão (OpenAI)
  auth.ts · domain.ts · validations.ts · utils.ts
supabase/
  migrations/ 0001..0005  ·  seed.sql
middleware.ts  (proteção de rotas + renovação de sessão)
```

### Modelo de dados (Postgres)
- **profiles** — usuário + papel (1:1 com auth.users).
- **companies** — empresas parceiras (nome, e-mails de contato, ativo).
- **systems** — catálogo de sistemas.
- **incidents** — solicitação (incidência ou melhoria): `kind`, título, descrição,
  sistema, empresa, categoria, stakeholder_area, benefit, prioridade, status,
  solução, análise da IA, `embedding vector(1024)` (reservado p/ Fase 2), `ref`
  (nº sequencial), busca full-text gerada.
- **incident_comments** — comentários.
- **incident_attachments** — anexos (Storage privado).
- **app_config** — domínio de e-mail autorizado.

---

## 5. Segurança (implementada)

- **RLS habilitado e deny-by-default** em todas as tabelas.
- Triggers no banco impedem **escalonamento de papel** e **edição de campos restritos** por não-equipe.
- Restrição de **domínio de e-mail** no **autocadastro**, em duas camadas (Server
  Action + trigger). Convites do admin aceitam qualquer domínio (parceiros externos).
- Chaves sensíveis (`SERVICE_ROLE`, `OPENAI_API_KEY`) **apenas no servidor**.
- **Cabeçalhos de segurança** (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) + `poweredByHeader: false`.
- **Validação Zod** em todas as Server Actions.
- Storage privado com upload restrito à pasta do próprio usuário e leitura via URL assinada.
- Documentação e **checklist de pentest (OWASP)** em [`SECURITY.md`](./SECURITY.md).

---

## 6. Status — o que está CONCLUÍDO ✅

| Área | Status |
|---|---|
| Scaffold Next.js 16 + TS + Tailwind v4 | ✅ |
| Design system navy/laranja + landing page | ✅ |
| Clientes Supabase + middleware de auth | ✅ |
| Migrações SQL (esquema, funções/triggers, RLS, storage, melhorias) | ✅ |
| Autenticação (login/registro/logout) + restrição de domínio + papéis | ✅ |
| Painel com métricas e recentes | ✅ |
| Incidências: lista, criação, detalhe, comentários, status, solução | ✅ |
| Melhorias & Desenvolvimento: lista, criação, detalhe, fluxo próprio | ✅ |
| Upload de anexos (imagens/PDF) | ✅ |
| Base de conhecimento (busca full-text) | ✅ |
| Admin: sistemas, empresas parceiras, usuários/papéis | ✅ |
| Controle de acesso: provisionamento (admin cria + auto-cadastro com aprovação) | ✅ |
| Senha inicial por e-mail + troca obrigatória no 1º acesso | ✅ |
| Esqueci/redefinir senha + ativar/desativar conta + auditoria + último acesso | ✅ |
| Perfil do usuário | ✅ |
| IA (OpenAI): análise de imagens + sugestão por similaridade | ✅ |
| IA: busca **semântica** por embeddings (pgvector / `match_incidents`) | ✅ |
| **Notificações** in-app + e-mail (status, atribuição, conclusão, comentário) | ✅ |
| E-mail formatado às empresas parceiras (Resend) | ✅ |
| Segurança (RLS, headers, validação) + SECURITY.md | ✅ |
| Convenção `proxy.ts` (Next 16) substituindo `middleware.ts` | ✅ |
| Documentação (README, ESCOPO, CLAUDE.md) | ✅ |
| **Build e Lint** | ✅ passando (23 rotas) |

---

## 7. Fora do escopo atual / Próximas fases ⏳

### Fase 2 — IA semântica ✅ (implementada)
- **Embeddings** OpenAI (`text-embedding-3-small`, 1024 dims) gravados em
  `incidents.embedding` na criação e recalculados ao registrar a solução.
- Busca por **similaridade vetorial** (pgvector / RPC `match_incidents`) para
  encontrar parecidos por *significado*; cai para full-text se não houver chave.
- Pendente (opcional): painel "Problemas parecidos" em tempo real na tela de
  abertura e *backfill* de embeddings para chamados antigos.

### Melhorias futuras sugeridas (não iniciadas)
- SLA e prazos por prioridade; relatórios e exportação.
- **Rate limiting** nas Server Actions de auth (ex.: Upstash).
- Login único (SSO) Google/Microsoft.
- Métricas/relatórios gerenciais (tempo médio de resolução, por sistema/empresa).
- Testes automatizados (unit/e2e).

---

## 8. Configuração pendente (responsabilidade do usuário)

Para colocar no ar:
1. `cp .env.example .env.local` e preencher: Supabase (URL, anon, **service role**
   — necessária para o admin criar usuários), `ALLOWED_EMAIL_DOMAIN`,
   `RESEND_API_KEY`/`EMAIL_FROM`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`.
2. Rodar as migrações `0001`→`0008` + `seed.sql` no SQL Editor do Supabase
   (ajustar domínio e empresas no seed). As migrações `0007` (busca semântica)
   e `0008` (notificações) são novas.
3. Em Auth → **URL Configuration**, adicionar o Redirect URL `…/auth/callback`
   (usado na redefinição de senha). Configurar SMTP para os e-mails do Supabase.
4. `npm install && npm run dev`. **Primeiro cadastro vira administrador.**

> A IA e o e-mail são **tolerantes a falta de chave**: se não configurados, o sistema
> funciona normalmente sem essas integrações (apenas registram aviso no log).

---

## 9. Referências
- [`README.md`](./README.md) — setup passo a passo.
- [`SECURITY.md`](./SECURITY.md) — controles e checklist de pentest.
- [`CLAUDE.md`](./CLAUDE.md) — convenções para manutenção.
