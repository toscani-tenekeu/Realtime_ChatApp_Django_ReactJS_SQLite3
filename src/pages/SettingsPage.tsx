import {
  Button,
  Field,
  Input,
  Switch,
  makeStyles,
  tokens,
  Text,
  Divider,
  RadioGroup,
  Radio,
  Spinner,
} from "@fluentui/react-components";
import { ArrowLeftRegular, DeleteRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services";
import type { User, UserSettings } from "@/services/types";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme, type ThemePref } from "@/providers/ThemeProvider";
import { useToast } from "@/components/Toaster";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/Avatar";

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
    position: "sticky", top: 0, zIndex: 1,
  },
  container: {
    maxWidth: "760px", margin: "0 auto",
    padding: tokens.spacingHorizontalXXL,
    display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL,
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingHorizontalXXL,
    display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM,
  },
  sectionTitle: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400 },
  toggleRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  toggleText: { display: "flex", flexDirection: "column" },
  danger: {
    borderTopColor: tokens.colorPaletteRedBorder2,
    borderRightColor: tokens.colorPaletteRedBorder2,
    borderBottomColor: tokens.colorPaletteRedBorder2,
    borderLeftColor: tokens.colorPaletteRedBorder2,
  },
  blockedRow: {
    display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
  },
});

export default function SettingsPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { pref, setPref } = useTheme();
  const toast = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [blocked, setBlocked] = useState<User[]>([]);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePw, setDeletePw] = useState("");

  useEffect(() => {
    authService.getSettings().then(setSettings);
    authService.getBlockedUsers().then(setBlocked);
  }, []);

  async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    await authService.updateSettings({ [key]: value } as Partial<UserSettings>);
  }

  async function enableBrowserNotifications(on: boolean) {
    if (on && "Notification" in window && Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      if (res !== "granted") {
        toast.show({ title: "Notifications blocked", body: "Enable them in your browser settings.", intent: "warning" });
        return;
      }
    }
    await updateSetting("browserNotifications", on);
    toast.show({ title: on ? "Notifications on" : "Notifications off", intent: "info" });
  }

  async function onChangePassword() {
    setPwSaving(true);
    setPwError(null);
    try {
      await authService.changePassword({ current: currentPw, next: newPw });
      toast.show({ title: "Password updated", intent: "success" });
      setCurrentPw("");
      setNewPw("");
    } catch (e) {
      setPwError((e as Error).message);
    } finally {
      setPwSaving(false);
    }
  }

  async function onDelete() {
    try {
      await authService.deleteAccount(deletePw);
      await signOut();
      toast.show({ title: "Account deleted", intent: "info" });
      navigate("/");
    } catch (e) {
      toast.show({ title: "Could not delete account", body: (e as Error).message, intent: "error" });
    }
  }

  async function unblock(id: string) {
    await authService.unblockUser(id);
    setBlocked((prev) => prev.filter((u) => u.id !== id));
    toast.show({ title: "Unblocked", intent: "success" });
  }

  if (!user) return null;

  return (
    <div className={s.root}>
      <div className={s.topbar}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={() => navigate("/chat")} aria-label="Back">Back</Button>
        <Text weight="semibold" size={400}>Settings</Text>
      </div>
      <div className={s.container}>
        {/* Appearance */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Appearance</div>
          <Field label="Theme">
            <RadioGroup value={pref} onChange={(_, d) => setPref(d.value as ThemePref)}>
              <Radio value="system" label="Match system" />
              <Radio value="light" label="Light" />
              <Radio value="dark" label="Dark" />
            </RadioGroup>
          </Field>
        </div>

        {/* Notifications */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Notifications</div>
          {!settings ? <Spinner size="tiny" /> : (
            <>
              <div className={s.toggleRow}>
                <div className={s.toggleText}>
                  <Text weight="semibold">Browser notifications</Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    Get a notification when you receive a new message.
                  </Text>
                </div>
                <Switch checked={settings.browserNotifications} onChange={(_, d) => enableBrowserNotifications(d.checked)} />
              </div>
              <div className={s.toggleRow}>
                <div className={s.toggleText}>
                  <Text weight="semibold">Sounds</Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Play a sound for new messages.</Text>
                </div>
                <Switch checked={settings.soundEnabled} onChange={(_, d) => updateSetting("soundEnabled", d.checked)} />
              </div>
            </>
          )}
        </div>

        {/* Privacy */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Privacy</div>
          {!settings ? <Spinner size="tiny" /> : (
            <>
              <div className={s.toggleRow}>
                <div className={s.toggleText}>
                  <Text weight="semibold">Read receipts</Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Let others see when you've read their messages.</Text>
                </div>
                <Switch checked={settings.showReadReceipts} onChange={(_, d) => updateSetting("showReadReceipts", d.checked)} />
              </div>
              <div className={s.toggleRow}>
                <div className={s.toggleText}>
                  <Text weight="semibold">Show my presence</Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Broadcast when you're online or away.</Text>
                </div>
                <Switch checked={settings.showPresence} onChange={(_, d) => updateSetting("showPresence", d.checked)} />
              </div>
            </>
          )}
          <Divider />
          <Text weight="semibold">Blocked accounts</Text>
          {blocked.length === 0 ? (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>You haven't blocked anyone.</Text>
          ) : blocked.map((u) => (
            <div key={u.id} className={s.blockedRow}>
              <Avatar name={u.displayName} image={u.avatarUrl} size={32} />
              <div style={{ flex: 1 }}>
                <div><Text weight="semibold">{u.displayName}</Text></div>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>@{u.username}</Text>
              </div>
              <Button appearance="secondary" onClick={() => unblock(u.id)}>Unblock</Button>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Composer</div>
          {!settings ? <Spinner size="tiny" /> : (
            <div className={s.toggleRow}>
              <div className={s.toggleText}>
                <Text weight="semibold">Press Enter to send</Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Shift + Enter always inserts a new line.</Text>
              </div>
              <Switch checked={settings.enterToSend} onChange={(_, d) => updateSetting("enterToSend", d.checked)} />
            </div>
          )}
        </div>

        {/* Password */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Change password</div>
          <Field label="Current password">
            <Input type="password" value={currentPw} onChange={(_, d) => setCurrentPw(d.value)} />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <Input type="password" value={newPw} onChange={(_, d) => setNewPw(d.value)} />
          </Field>
          {pwError ? <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{pwError}</Text> : null}
          <div>
            <Button appearance="primary" onClick={onChangePassword} disabled={pwSaving || !currentPw || !newPw}>
              {pwSaving ? "Updating…" : "Update password"}
            </Button>
          </div>
        </div>

        {/* Danger zone */}
        <div className={`${s.card} ${s.danger}`}>
          <div className={s.sectionTitle} style={{ color: tokens.colorPaletteRedForeground1 }}>Danger zone</div>
          <Text>Delete your account and all its data. This can't be undone.</Text>
          <Field label="Confirm with password">
            <Input type="password" value={deletePw} onChange={(_, d) => setDeletePw(d.value)} />
          </Field>
          <div>
            <Button
              icon={<DeleteRegular />}
              onClick={() => setConfirmDelete(true)}
              disabled={!deletePw}
              style={{ backgroundColor: tokens.colorPaletteRedBackground3, color: tokens.colorNeutralForegroundOnBrand }}
            >
              Delete account
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your account?"
        description="Every message and conversation you own will be permanently removed."
        confirmLabel="Delete account"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
