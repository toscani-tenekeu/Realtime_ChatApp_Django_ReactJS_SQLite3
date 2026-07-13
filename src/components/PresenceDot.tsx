import { makeStyles, tokens, mergeClasses } from "@fluentui/react-components";
import type { Presence } from "@/services/types";

const useStyles = makeStyles({
  root: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: tokens.borderRadiusCircular,
    border: `2px solid ${tokens.colorNeutralBackground1}`,
    boxSizing: "content-box",
  },
  online: { backgroundColor: tokens.colorPaletteGreenForeground1 },
  away: { backgroundColor: tokens.colorPaletteYellowForeground1 },
  offline: { backgroundColor: tokens.colorNeutralForeground4 },
});

export function PresenceDot({ presence, className }: { presence: Presence; className?: string }) {
  const styles = useStyles();
  return <span className={mergeClasses(styles.root, styles[presence], className)} aria-hidden />;
}
