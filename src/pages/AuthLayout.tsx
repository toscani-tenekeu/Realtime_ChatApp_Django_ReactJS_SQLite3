import { makeStyles, tokens, Title2, Body1 } from "@fluentui/react-components";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    display: "grid",
    gridTemplateColumns: "1fr",
    "@media (min-width: 960px)": { gridTemplateColumns: "1fr 1fr" },
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  aside: {
    display: "none",
    "@media (min-width: 960px)": {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: tokens.spacingHorizontalXXL,
      background: `linear-gradient(160deg, ${tokens.colorBrandBackground2}, ${tokens.colorNeutralBackground3})`,
    },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
  },
  brandMark: {
    width: "28px",
    height: "28px",
    borderRadius: tokens.borderRadiusMedium,
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorPaletteBerryBackground2})`,
  },
  quote: { maxWidth: "420px" },
  main: {
    display: "flex",
    flexDirection: "column",
    padding: tokens.spacingHorizontalXXL,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: tokens.spacingVerticalXXL,
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  mobileBrand: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
    "@media (min-width: 960px)": { display: "none" },
  },
});

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  quote?: string;
}

export function AuthLayout({ title, subtitle, children, quote }: Props) {
  const s = useStyles();
  return (
    <div className={s.root}>
      <aside className={s.aside}>
        <Link to="/" className={s.brand} style={{ color: "inherit", textDecoration: "none" }}>
          <span className={s.brandMark} aria-hidden />
          Pulse
        </Link>
        <div className={s.quote}>
          <Title2 as="p">
            {quote ?? "A focused place to talk with the people you work and build with."}
          </Title2>
        </div>
        <div style={{ color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 }}>
          © {new Date().getFullYear()} Pulse Chat
        </div>
      </aside>
      <main className={s.main}>
        <div className={s.headerRow}>
          <Link
            to="/"
            className={s.mobileBrand}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <span className={s.brandMark} aria-hidden />
            Pulse
          </Link>
          <div style={{ marginLeft: "auto" }}>
            <ThemeToggle />
          </div>
        </div>
        <div className={s.card}>
          <div>
            <Title2 as="h1">{title}</Title2>
            {subtitle ? (
              <Body1 style={{ color: tokens.colorNeutralForeground2, marginTop: 4 }}>
                {subtitle}
              </Body1>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
