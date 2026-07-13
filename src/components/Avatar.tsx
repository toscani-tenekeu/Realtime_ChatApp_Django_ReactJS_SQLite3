import { Avatar as FAvatar, makeStyles, tokens } from "@fluentui/react-components";
import { PresenceDot } from "@/components/PresenceDot";
import type { Presence } from "@/services/types";

const useStyles = makeStyles({
  wrap: { position: "relative", display: "inline-block" },
  dot: {
    position: "absolute",
    right: "-2px",
    bottom: "-2px",
    boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
  },
});

interface Props {
  name: string;
  image?: string;
  size?: 20 | 24 | 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 96 | 120 | 128;
  presence?: Presence;
  showPresence?: boolean;
  color?: "brand" | "colorful" | "neutral";
}

export function Avatar({
  name,
  image,
  size = 40,
  presence,
  showPresence,
  color = "colorful",
}: Props) {
  const styles = useStyles();
  return (
    <span className={styles.wrap}>
      <FAvatar name={name} image={image ? { src: image } : undefined} size={size} color={color} />
      {showPresence && presence ? <PresenceDot presence={presence} className={styles.dot} /> : null}
    </span>
  );
}
