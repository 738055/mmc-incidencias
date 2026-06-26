import Link from "next/link";
import type { Metadata } from "next";
import { resetPasswordAction } from "../actions";
import { PasswordForm } from "@/components/auth/password-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-700">Criar nova senha</h1>
      <p className="mt-1 text-sm text-muted">
        Defina uma nova senha para sua conta.
      </p>

      <div className="mt-6">
        <PasswordForm action={resetPasswordAction} submitLabel="Salvar nova senha" />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-orange-600 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
