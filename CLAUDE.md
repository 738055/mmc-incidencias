@AGENTS.md

# MMC Incidências — notas para o agente

Plataforma de incidências/suporte (Next.js 16 + Supabase + IA OpenAI). Visual navy + laranja.

## Convenções
- **Idioma**: toda a UI e mensagens em **pt-BR**.
- **Supabase**: use `lib/supabase/server.ts` (Server Components/Actions, respeita RLS),
  `client.ts` (browser), `createAdminClient()` só quando precisar ignorar RLS (raro, server-only).
- **Tipos do banco**: `lib/supabase/types.ts` é mantido à mão (não há geração automática).
  Linhas são `type` (não `interface`) para satisfazer o `Record<string,unknown>` do postgrest.
  Ao adicionar tabela/coluna, atualize as migrações **e** este arquivo.
- **Validação**: toda Server Action valida entrada com Zod (`lib/validations.ts`).
- **Segurança**: RLS deny-by-default; nunca exponha `SERVICE_ROLE`/`OPENAI_API_KEY` no cliente.
  Ver `SECURITY.md`.
- **IA/E-mail**: `lib/ai` e `lib/email` são tolerantes a falta de chave (no-op com log).

## Banco
Migrações em `supabase/migrations/` (rodar em ordem) + `supabase/seed.sql`.
Coluna `incidents.embedding vector(1024)` reservada para a busca semântica (Fase 2).

## Verificação
`npm run build` (type-check) e `npm run lint` devem passar.
