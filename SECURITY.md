# Segurança — MMC Incidências

A segurança é prioridade nesta plataforma. Este documento descreve os controles
implementados e um checklist de verificação (estilo pentest) para auditorias.

## Modelo de acesso

- **Autenticação**: Supabase Auth (e-mail/senha), sessão em cookies httpOnly via
  `@supabase/ssr`. O middleware valida o usuário com `getUser()` (verificação no
  servidor de auth, não confia apenas no cookie).
- **Restrição de domínio**: o **autocadastro** é permitido apenas para o domínio
  configurado em `ALLOWED_EMAIL_DOMAIN`. Validado em **duas camadas**: na Server
  Action de registro e no trigger `handle_new_user` do banco. **Convites do admin**
  (contas provisionadas) aceitam qualquer domínio — externos entram só por convite.
- **Papéis**: `requester` (solicitante), `technician` (técnico), `admin`.
  O primeiro usuário cadastrado torna-se `admin` automaticamente.
- **Status de conta** (`pending` / `active` / `disabled`): o acesso é negado a
  contas pendentes (aguardando aprovação) e desativadas. Verificado no login e em
  `requireProfile` (toda página protegida).
- **Provisionamento**: admin cria contas com senha inicial (via Admin API +
  service role) **ou** auto-cadastro com aprovação. Contas criadas pelo admin
  exigem **troca de senha no 1º acesso** (`must_change_password`).
- **Trilha de auditoria** (`audit_log`): registra criação/aprovação/ativação de
  usuários, mudança de papel e alteração de senha. Leitura só para admin (RLS);
  escrita só via service role.

## Defesa em camadas

| Camada | Controle |
|---|---|
| Banco | **RLS habilitado e deny-by-default** em todas as tabelas. Sem política = sem acesso. |
| Banco | Triggers impedem escalonamento de papel (`guard_role_change`) e edição de campos restritos por não-equipe (`guard_incident_fields`). |
| Banco | `app_config` sem políticas → inacessível via API (só service role). |
| Storage | Bucket `attachments` privado; acesso só por URL assinada; upload restrito à pasta do próprio usuário (`auth.uid()`). |
| App | Validação com **Zod** em todas as Server Actions (login, registro, incidências, comentários, solução, admin). |
| App | `SUPABASE_SERVICE_ROLE_KEY` e `OPENAI_API_KEY` usados **apenas no servidor**, nunca no bundle do cliente. |
| HTTP | Cabeçalhos de segurança em `next.config.ts`: HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. |
| HTTP | `poweredByHeader: false` (não expõe a stack). |

## Políticas RLS (resumo)

- **incidents**: solicitante vê os próprios + os resolvidos/fechados (base de
  conhecimento); equipe vê todos. Só equipe altera status/responsável/prioridade/solução.
- **profiles**: usuário vê o próprio; equipe vê todos (para atribuição). Troca de
  papel só por admin.
- **companies / systems**: leitura por autenticados; escrita só admin.
- **comments / attachments**: visíveis/edíveis conforme acesso à incidência.

## Checklist de verificação (pentest)

### Controle de acesso (OWASP A01)
- [ ] Solicitante NÃO acessa chamado aberto de outro usuário (testar via SQL e via UI).
- [ ] Solicitante NÃO altera status/solução (bloqueio por trigger + RLS).
- [ ] Não-admin NÃO acessa `/admin`, `/sistemas`, `/empresas` (mostra "Acesso restrito").
- [ ] Usuário NÃO consegue alterar o próprio papel (UPDATE em profiles.role).
- [ ] Rotas privadas redirecionam para `/login` sem sessão (middleware).

### Autenticação (OWASP A07)
- [ ] Autocadastro com e-mail de domínio diferente é rejeitado (app **e** banco).
- [ ] Convite do admin com e-mail de outro domínio é aceito (conta provisionada).
- [ ] Senha exige mínimo de 8 caracteres com maiúscula e número.
- [ ] Logout invalida a sessão.
- [ ] Conta **pendente** não acessa o sistema (vai para /pendente).
- [ ] Conta **desativada** é bloqueada no login e expulsa em telas protegidas.
- [ ] Usuário criado pelo admin é **forçado a trocar a senha** no 1º acesso.
- [ ] Link de redefinição de senha expira e só funciona uma vez.
- [ ] Admin não consegue desativar ou rebaixar a própria conta.
- [ ] Ações sensíveis aparecem na **auditoria** (`/auditoria`).

### Injeção (OWASP A03)
- [ ] Todas as queries usam o client Supabase (parametrizado) — sem SQL string concatenada.
- [ ] Entradas validadas por Zod com limites de tamanho.

### Exposição de dados (OWASP A02/A05)
- [ ] `service_role` nunca aparece no código cliente (`grep` no bundle `.next`).
- [ ] Anexos só acessíveis por URL assinada com expiração.
- [ ] Cabeçalhos de segurança presentes (verificar em DevTools → Network).

### Dependências (OWASP A06)
- [ ] `npm audit` revisado a cada release. **Nota**: há 2 alertas *moderate* de
  `postcss` aninhado dentro do próprio Next.js (uso apenas em build); o "fix"
  sugerido rebaixaria o Next para a v9 (breaking) — **não aplicar**. Resolve-se
  quando o Next atualizar a dependência interna.

## Recomendações de produção
- Ativar **rate limiting** (ex.: Vercel/Upstash) nas Server Actions de auth.
- Configurar política de senha e MFA no painel do Supabase Auth.
- Restringir CORS/Redirect URLs no Supabase ao domínio de produção.
- Habilitar logs de auditoria e backups automáticos no Supabase.
- Revisar a CSP (atualmente via headers; considerar `Content-Security-Policy` explícita).

## Como reportar uma vulnerabilidade
Envie um e-mail para a equipe de Tecnologia e Inovação. Não abra issues públicas
com detalhes de exploração.
