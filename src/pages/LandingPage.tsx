import { Link } from "react-router-dom";
import { Button, Title1, Title3, Body1, makeStyles, tokens, Card } from "@fluentui/react-components";
import { ChatMultipleRegular, LockClosedRegular, FlashRegular } from "@fluentui/react-icons";
import { ThemeToggle } from "@/components/ThemeToggle";

const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXXL}`,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  brandMark: {
    width: "28px",
    height: "28px",
    borderRadius: tokens.borderRadiusMedium,
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorPaletteBerryBackground2})`,
  },
  hero: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    padding: tokens.spacingHorizontalXXL,
  },
  heroInner: {
    maxWidth: "760px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: tokens.spacingVerticalL,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  ctas: { display: "flex", gap: tokens.spacingHorizontalM, flexWrap: "wrap", justifyContent: "center" },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: tokens.spacingHorizontalL,
    width: "100%",
    marginTop: tokens.spacingVerticalXXL,
  },
  card: {
    padding: tokens.spacingHorizontalL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    textAlign: "left",
  },
  icon: {
    width: "36px",
    height: "36px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    display: "grid",
    placeItems: "center",
  },
  footer: {
    padding: tokens.spacingHorizontalL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export default function LandingPage() {
  const s = useStyles();
  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.brand}>
          <span className={s.brandMark} aria-hidden />
          Pulse
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <Link to="/signin"><Button appearance="subtle">Sign in</Button></Link>
          <Link to="/register"><Button appearance="primary">Get started</Button></Link>
        </div>
      </header>

      <section className={s.hero}>
        <div className={s.heroInner}>
          <span className={s.eyebrow}>Real‑time messaging • Fluent 2</span>
          <Title1 as="h1">Conversations that keep pace with your team.</Title1>
          <Body1 style={{ color: tokens.colorNeutralForeground2, maxWidth: 520 }}>
            Pulse is a focused chat workspace — direct messages, groups, mentions, reactions and
            attachments — in a calm, keyboard-first interface.
          </Body1>
          <div className={s.ctas}>
            <Link to="/register"><Button appearance="primary" size="large">Create account</Button></Link>
            <Link to="/signin"><Button appearance="secondary" size="large">Sign in</Button></Link>
          </div>

          <div className={s.features}>
            <Card className={s.card}>
              <div className={s.icon}><ChatMultipleRegular /></div>
              <Title3>Threaded chats</Title3>
              <Body1 style={{ color: tokens.colorNeutralForeground2 }}>
                Reply, react, edit and forward — with delivered and read states.
              </Body1>
            </Card>
            <Card className={s.card}>
              <div className={s.icon}><FlashRegular /></div>
              <Title3>Optimistic & fast</Title3>
              <Body1 style={{ color: tokens.colorNeutralForeground2 }}>
                Messages appear instantly with clear retry on failure.
              </Body1>
            </Card>
            <Card className={s.card}>
              <div className={s.icon}><LockClosedRegular /></div>
              <Title3>Yours to run</Title3>
              <Body1 style={{ color: tokens.colorNeutralForeground2 }}>
                Frontend built to plug into your own Django backend.
              </Body1>
            </Card>
          </div>
        </div>
      </section>

      <footer className={s.footer}>© {new Date().getFullYear()} Pulse Chat</footer>
    </div>
  );
}
