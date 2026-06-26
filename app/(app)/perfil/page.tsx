import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateProfileAction } from "@/app/(app)/admin/actions";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-navy-700">Meu perfil</h1>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-navy-100 text-xl font-semibold text-navy-700">
              {(profile.full_name || profile.email).slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold text-foreground">
                {profile.full_name || "Sem nome"}
              </p>
              <p className="text-sm text-muted">{profile.email}</p>
              <Badge className="mt-1 bg-navy-50 text-navy-700 ring-navy-200">
                {ROLE_LABELS[profile.role]}
              </Badge>
            </div>
          </div>

          <form action={updateProfileAction} className="space-y-3 border-t border-border pt-5">
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile.full_name}
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </form>
    </div>
  );
}
