import Link from "next/link";
import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Esqueci a senha" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-700">Esqueci a senha</h1>
      <p className="mt-1 text-sm text-muted">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>

      <div className="mt-6">
        <ForgotForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Lembrou?{" "}
        <Link href="/login" className="font-medium text-orange-600 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
