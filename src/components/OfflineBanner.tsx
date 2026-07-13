import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useConnection } from "@/providers/ConnectionProvider";

const useStyles = makeStyles({
  root: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    borderRadius: 0,
    borderLeft: "none",
    borderRight: "none",
    borderTop: "none",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export function OfflineBanner() {
  const styles = useStyles();
  const { status } = useConnection();
  if (status === "online") return null;
  const intent = status === "offline" ? "warning" : "info";
  const title = status === "offline" ? "You're offline" : "Reconnecting…";
  const body =
    status === "offline"
      ? "New messages will send when you're back online."
      : "Restoring your connection.";
  return (
    <MessageBar intent={intent} className={styles.root} politeness="polite">
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {body}
      </MessageBarBody>
    </MessageBar>
  );
}
