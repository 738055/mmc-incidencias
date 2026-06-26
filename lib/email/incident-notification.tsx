import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface IncidentEmailProps {
  ref: number;
  kindLabel: string;
  title: string;
  description: string;
  systemName?: string | null;
  priorityLabel: string;
  requesterName: string;
  companyName: string;
  url: string;
  imageUrls?: string[];
}

const navy = "#0b2545";
const orange = "#f26c21";

/** E-mail enviado às empresas parceiras quando uma incidência é direcionada a elas. */
export function IncidentNotificationEmail({
  ref,
  kindLabel,
  title,
  description,
  systemName,
  priorityLabel,
  requesterName,
  companyName,
  url,
  imageUrls = [],
}: IncidentEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`Nova ${kindLabel} #${ref}: ${title}`}</Preview>
      <Body style={{ backgroundColor: "#f5f7fb", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1px solid #e3e8f0" }}>
          {/* Cabeçalho */}
          <Section style={{ background: navy, padding: "24px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0 }}>
              MMC Incidências
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>
              Notificação para {companyName}
            </Text>
          </Section>

          <Section style={{ padding: "28px" }}>
            <Text style={{ display: "inline-block", background: "#fff3ec", color: orange, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, margin: 0 }}>
              {`${kindLabel} #${ref} · Prioridade ${priorityLabel}`}
            </Text>
            <Heading style={{ color: navy, fontSize: 20, margin: "14px 0 6px" }}>
              {title}
            </Heading>
            <Text style={{ color: "#5b6573", fontSize: 13, margin: 0 }}>
              {systemName ? `Sistema: ${systemName} · ` : ""}Aberto por {requesterName}
            </Text>

            <Hr style={{ borderColor: "#e3e8f0", margin: "20px 0" }} />

            <Text style={{ color: "#0b1524", fontSize: 14, lineHeight: "22px", whiteSpace: "pre-wrap", margin: 0 }}>
              {description}
            </Text>

            {imageUrls.length > 0 && (
              <Section style={{ marginTop: 20 }}>
                <Text style={{ color: navy, fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>
                  Anexos
                </Text>
                {imageUrls.map((src, i) => (
                  <Img
                    key={i}
                    src={src}
                    alt={`Anexo ${i + 1}`}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #e3e8f0", marginBottom: 8 }}
                  />
                ))}
              </Section>
            )}

            <Section style={{ marginTop: 28, textAlign: "center" as const }}>
              <Link
                href={url}
                style={{ background: orange, color: "#ffffff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}
              >
                Abrir chamado
              </Link>
            </Section>
          </Section>

          <Section style={{ background: "#f5f7fb", padding: "16px 28px" }}>
            <Text style={{ color: "#8a93a3", fontSize: 11, margin: 0 }}>
              Você recebeu este e-mail porque {companyName} é parceira de suporte da MMC.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
