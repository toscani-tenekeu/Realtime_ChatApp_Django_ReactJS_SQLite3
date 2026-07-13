import { Skeleton, SkeletonItem, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  row: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    alignItems: "center",
  },
  col: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXS, flex: 1 },
  msgList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalL,
  },
  msg: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-start" },
  msgCol: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    flex: 1,
    maxWidth: "60%",
  },
});

export function ConversationListSkeleton() {
  const styles = useStyles();
  return (
    <Skeleton>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.row}>
          <SkeletonItem shape="circle" size={40} />
          <div className={styles.col}>
            <SkeletonItem size={12} style={{ width: "60%" }} />
            <SkeletonItem size={8} style={{ width: "80%" }} />
          </div>
        </div>
      ))}
    </Skeleton>
  );
}

export function MessageTimelineSkeleton() {
  const styles = useStyles();
  return (
    <Skeleton>
      <div className={styles.msgList}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={styles.msg}
            style={{ flexDirection: i % 2 ? "row-reverse" : "row" }}
          >
            <SkeletonItem shape="circle" size={32} />
            <div className={styles.msgCol}>
              <SkeletonItem size={12} style={{ width: "40%" }} />
              <SkeletonItem size={40} style={{ width: "100%", borderRadius: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
