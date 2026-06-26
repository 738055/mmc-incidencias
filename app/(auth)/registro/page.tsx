import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-700">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">
        Use seu e-mail corporativo para acessar a plataforma.
      </p>

      <div className="mt-6">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-orange-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
