import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSessionProfile } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default async function PendingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.status === "active") {
    if (profile.must_change_password) redirect("/trocar-senha");
    redirect("/dashboard");
  }
  if (profile.status === "disabled") redirect("/login?status=disabled");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-bold text-navy-700">
              Conta aguardando aprovação
            </h1>
            <p className="mt-2 text-sm text-muted">
              Seu cadastro ({profile.email}) foi recebido e está pendente de
              aprovação por um administrador. Você receberá acesso assim que for
              liberado.
            </p>
            <form action={signOutAction} className="mt-6">
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
