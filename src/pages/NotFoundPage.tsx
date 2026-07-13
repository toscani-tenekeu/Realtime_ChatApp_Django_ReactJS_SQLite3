import { Link } from "react-router-dom";
import { Button, Title2, makeStyles, tokens, Body1 } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  card: {
    maxWidth: "440px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  big: {
    fontSize: "72px",
    lineHeight: 1,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
});

export default function NotFoundPage() {
  const s = useStyles();
  return (
    <div className={s.root}>
      <div className={s.card}>
        <div className={s.big}>404</div>
        <Title2 as="h1">This page wandered off</Title2>
        <Body1 style={{ color: tokens.colorNeutralForeground2 }}>
          The address you followed doesn't exist. Head back to the app.
        </Body1>
        <div>
          <Link to="/">
            <Button appearance="primary">Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
