import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RestrictedNotice() {
  return (
    <Card className="mx-auto max-w-md p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-navy-700">Acesso restrito</h2>
      <p className="mt-1 text-sm text-muted">
        Esta área é exclusiva para administradores.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href="/dashboard">Voltar ao painel</Link>
      </Button>
    </Card>
  );
}
