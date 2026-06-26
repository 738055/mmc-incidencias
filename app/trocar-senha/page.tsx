import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordForm } from "@/components/auth/password-form";
import { changePasswordAction } from "@/app/(auth)/actions";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Trocar senha" };

export default async function ChangePasswordPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.status === "disabled") redirect("/login?status=disabled");
  if (profile.status === "pending") redirect("/pendente");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="pt-6">
            <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-orange-50 text-orange-600">
              <KeyRound className="h-5 w-5" />
            </span>
            <h1 className="text-center text-xl font-bold text-navy-700">
              Defina sua nova senha
            </h1>
            <p className="mt-1 text-center text-sm text-muted">
              Por segurança, no primeiro acesso você precisa criar uma senha
              pessoal antes de continuar.
            </p>
            <div className="mt-5">
              <PasswordForm
                action={changePasswordAction}
                submitLabel="Salvar e continuar"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
