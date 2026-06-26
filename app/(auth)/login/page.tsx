import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; status?: string; erro?: string }>;
}) {
  const { redirect, status, erro } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-700">Entrar</h1>
      <p className="mt-1 text-sm text-muted">
        Acesse a plataforma de incidências da MMC.
      </p>

      {status === "disabled" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          Sua conta foi desativada. Procure um administrador.
        </p>
      )}
      {erro === "link" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-inset ring-amber-200">
          Link inválido ou expirado. Solicite uma nova redefinição de senha.
        </p>
      )}

      <div className="mt-6">
        <LoginForm redirectTo={redirect} />
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/esqueci-senha"
          className="text-sm font-medium text-muted hover:text-navy-700 hover:underline"
        >
          Esqueci a senha
        </Link>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link href="/registro" className="font-medium text-orange-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
