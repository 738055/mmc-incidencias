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

export interface StatusEmailProps {
  ref: number;
  title: string;
  headline: string; // ex.: "Status atualizado: Em andamento"
  message: string; // corpo descritivo
  actorName: string;
  url: string;
}

const navy = "#001736";
const orange = "#fb7800";

/** E-mail enviado ao solicitante quando há novidade no seu chamado. */
export function StatusUpdateEmail({
  ref,
  title,
  headline,
  message,
  actorName,
  url,
}: StatusEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`${headline} — chamado #${ref}`}</Preview>
      <Body style={{ backgroundColor: "#f8f9ff", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1px solid #e9ecef" }}>
          <Section style={{ background: navy, padding: "24px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0 }}>
              MMC Incidências
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>
              Atualização do seu chamado
            </Text>
          </Section>

          <Section style={{ padding: "28px" }}>
            <Text style={{ display: "inline-block", background: "#fff4ec", color: orange, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, margin: 0 }}>
              {`Chamado #${ref}`}
            </Text>
            <Heading style={{ color: navy, fontSize: 20, margin: "14px 0 6px" }}>
              {headline}
            </Heading>
            <Text style={{ color: "#43474f", fontSize: 13, margin: 0 }}>{title}</Text>

            <Hr style={{ borderColor: "#e9ecef", margin: "20px 0" }} />

            <Text style={{ color: "#191c21", fontSize: 14, lineHeight: "22px", whiteSpace: "pre-wrap", margin: 0 }}>
              {message}
            </Text>
            <Text style={{ color: "#747780", fontSize: 12, margin: "12px 0 0" }}>
              Por {actorName}
            </Text>

            <Section style={{ marginTop: 28, textAlign: "center" as const }}>
              <Link
                href={url}
                style={{ background: orange, color: "#ffffff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}
              >
                Ver chamado
              </Link>
            </Section>
          </Section>

          <Section style={{ background: "#f8f9ff", padding: "16px 28px" }}>
            <Text style={{ color: "#8a93a3", fontSize: 11, margin: 0 }}>
              Você recebeu este e-mail porque é parte interessada neste chamado na plataforma MMC Incidências.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
