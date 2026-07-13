import {
  Button,
  Field,
  Input,
  Textarea,
  makeStyles,
  tokens,
  Text,
  Divider,
} from "@fluentui/react-components";
import { ArrowLeftRegular, SaveRegular } from "@fluentui/react-icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/Toaster";

const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  container: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: tokens.spacingHorizontalXXL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  header: { display: "flex", gap: tokens.spacingHorizontalL, alignItems: "center" },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingHorizontalXXL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  row: { display: "flex", gap: tokens.spacingHorizontalM, flexWrap: "wrap" },
  actions: { display: "flex", gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalM },
});

export default function ProfilePage() {
  const s = useStyles();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ displayName: displayName.trim(), username: username.trim(), bio: bio.trim(), avatarUrl: avatarUrl.trim() || undefined });
      toast.show({ title: "Profile updated", intent: "success" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.root}>
      <div className={s.topbar}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={() => navigate("/chat")} aria-label="Back">Back</Button>
        <Text weight="semibold" size={400}>Your profile</Text>
      </div>
      <div className={s.container}>
        <div className={s.card}>
          <div className={s.header}>
            <Avatar name={displayName || user.displayName} image={avatarUrl || user.avatarUrl} size={96} />
            <div>
              <Text size={500} weight="semibold">{displayName || user.displayName}</Text>
              <div><Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>@{username || user.username}</Text></div>
              <div><Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{user.email}</Text></div>
            </div>
          </div>
          <Divider />
          <Field label="Display name" required>
            <Input value={displayName} onChange={(_, d) => setDisplayName(d.value)} />
          </Field>
          <Field label="Username" hint="3–20 letters, numbers, dot or underscore." required>
            <Input value={username} onChange={(_, d) => setUsername(d.value)} contentBefore="@" />
          </Field>
          <Field label="Avatar URL" hint="Paste a link to an image (optional).">
            <Input value={avatarUrl} onChange={(_, d) => setAvatarUrl(d.value)} placeholder="https://…" />
          </Field>
          <Field label="Bio">
            <Textarea value={bio} onChange={(_, d) => setBio(d.value)} rows={3} maxLength={160} />
          </Field>
          {error ? <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</Text> : null}
          <div className={s.actions}>
            <Button appearance="primary" icon={<SaveRegular />} onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button appearance="secondary" onClick={() => navigate("/chat")}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
