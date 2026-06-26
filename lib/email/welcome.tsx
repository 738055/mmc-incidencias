import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface WelcomeEmailProps {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

const navy = "#0b2545";
const orange = "#f26c21";

/** E-mail de boas-vindas com a senha inicial (troca obrigatória no 1º acesso). */
export function WelcomeEmail({
  name,
  email,
  tempPassword,
  loginUrl,
}: WelcomeEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu acesso à plataforma MMC Incidências</Preview>
      <Body style={{ backgroundColor: "#f5f7fb", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1px solid #e3e8f0" }}>
          <Section style={{ background: navy, padding: "24px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0 }}>
              MMC Incidências
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>
              Tecnologia &amp; Inovação
            </Text>
          </Section>

          <Section style={{ padding: "28px" }}>
            <Heading style={{ color: navy, fontSize: 20, margin: "0 0 8px" }}>
              Olá, {name}!
            </Heading>
            <Text style={{ color: "#0b1524", fontSize: 14, lineHeight: "22px", margin: 0 }}>
              Uma conta foi criada para você na plataforma de incidências e
              suporte da MMC. Use as credenciais abaixo para o primeiro acesso.
            </Text>

            <Section style={{ marginTop: 18, background: "#f5f7fb", borderRadius: 8, padding: "16px 18px", border: "1px solid #e3e8f0" }}>
              <Text style={{ color: "#5b6573", fontSize: 12, margin: "0 0 2px" }}>E-mail</Text>
              <Text style={{ color: navy, fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>{email}</Text>
              <Text style={{ color: "#5b6573", fontSize: 12, margin: "0 0 2px" }}>Senha inicial</Text>
              <Text style={{ color: navy, fontSize: 18, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace", margin: 0 }}>
                {tempPassword}
              </Text>
            </Section>

            <Text style={{ color: "#b23f08", fontSize: 13, lineHeight: "20px", marginTop: 16 }}>
              Por segurança, você será solicitado a criar uma nova senha pessoal
              logo no primeiro acesso.
            </Text>

            <Section style={{ marginTop: 24, textAlign: "center" as const }}>
              <Link
                href={loginUrl}
                style={{ background: orange, color: "#ffffff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}
              >
                Acessar a plataforma
              </Link>
            </Section>

            <Hr style={{ borderColor: "#e3e8f0", margin: "24px 0 12px" }} />
            <Text style={{ color: "#8a93a3", fontSize: 11, margin: 0 }}>
              Se você não esperava este e-mail, ignore-o.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
