import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Workflow,
  Building2,
  Search,
  ImageIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Workflow,
    title: "Incidências e melhorias",
    desc: "Registre problemas (bugs) e pedidos de melhoria/desenvolvimento, cada um com seu fluxo — tudo rastreado.",
  },
  {
    icon: Sparkles,
    title: "IA que reaproveita soluções",
    desc: "Ao abrir um chamado parecido, a IA mostra como um problema igual já foi resolvido antes.",
  },
  {
    icon: ImageIcon,
    title: "Análise de imagens",
    desc: "Anexe prints e fotos do erro: a IA interpreta a imagem e ajuda a entender o problema.",
  },
  {
    icon: Building2,
    title: "Empresas parceiras",
    desc: "Chamados direcionados a fornecedores (ex.: Onasys) com notificação por e-mail formatada.",
  },
  {
    icon: Search,
    title: "Base de conhecimento",
    desc: "Tudo que já foi resolvido vira conhecimento pesquisável para toda a equipe.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança em primeiro lugar",
    desc: "RLS no banco, controle de acesso por papel, headers de segurança e validação ponta a ponta.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Topo */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/registro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="brand-gradient relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-navy-400/30 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">
              <Sparkles className="h-3.5 w-3.5 text-orange-300" />
              Suporte inteligente com IA
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Plataforma de Incidências{" "}
              <span className="text-orange-400">MMC</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/80 md:text-lg">
              Centralize problemas e solicitações de todos os sistemas, resolva
              com agilidade e deixe a IA reaproveitar soluções de chamados
              anteriores — para o time não resolver o mesmo problema duas vezes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/registro">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20"
              >
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          {/* Mock de card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-xl bg-surface p-5 text-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">
                    Chamado #1042
                  </span>
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
                    Resolvido
                  </span>
                </div>
                <h3 className="mt-2 font-semibold">
                  Erro ao emitir reserva no ERP
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Sistema: ERP / Backoffice · Prioridade: Alta
                </p>
                <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm ring-1 ring-inset ring-orange-200">
                  <p className="flex items-center gap-1.5 font-medium text-orange-700">
                    <Sparkles className="h-4 w-4" /> Sugestão da IA
                  </p>
                  <p className="mt-1 text-orange-900/80">
                    Problema parecido resolvido no chamado #968: limpar cache de
                    sessão e reemitir. Ver solução →
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-navy-700">
            Tudo que o suporte precisa, num só lugar
          </h2>
          <p className="mt-3 text-muted">
            Construído para o setor de Tecnologia e Inovação, com foco em
            agilidade, conhecimento reaproveitável e segurança.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-50 text-navy-700">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-50/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy-700">
            Pronto para organizar o suporte da MMC?
          </h2>
          <Button asChild variant="accent" size="lg">
            <Link href="/registro">
              Criar minha conta <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} MMC · Tecnologia e Inovação</p>
        </div>
      </footer>
    </div>
  );
}
