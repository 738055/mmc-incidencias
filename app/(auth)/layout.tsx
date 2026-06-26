import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ShieldCheck, Sparkles, Building2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado da marca */}
      <div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <Link href="/">
          <Logo variant="light" />
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Suporte que aprende com cada chamado.
          </h2>
          <p className="mt-3 text-white/75">
            Registre incidências, resolva com agilidade e deixe a IA reaproveitar
            soluções anteriores.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-orange-300" /> IA sugere soluções
              de chamados parecidos
            </li>
            <li className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-orange-300" /> Notificação a
              empresas parceiras por e-mail
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-orange-300" /> Segurança e
              controle de acesso por papel
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} MMC · Tecnologia e Inovação
        </p>
      </div>

      {/* Lado do formulário */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
