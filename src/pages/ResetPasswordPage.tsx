import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
  Body1,
} from "@fluentui/react-components";
import { EyeRegular, EyeOffRegular } from "@fluentui/react-icons";
import { AuthLayout } from "@/pages/AuthLayout";
import { authService } from "@/services";
import { validatePassword } from "@/utils/validation";

const useStyles = makeStyles({
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  meta: { textAlign: "center", color: tokens.colorNeutralForeground2 },
});

export default function ResetPasswordPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: typeof errors = {
      pw: validatePassword(password),
      confirm: confirm !== password ? "Passwords don't match." : undefined,
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setSubmitting(true);
    try {
      await authService.resetPassword({ token: "mock", password });
      setDone(true);
      setTimeout(() => navigate("/signin"), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose something strong you'll remember.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error ? (
          <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>
        ) : null}
        {done ? (
          <MessageBar intent="success">
            <MessageBarBody>Password updated. Redirecting to sign in…</MessageBarBody>
          </MessageBar>
        ) : null}
        <Field
          label="New password"
          required
          validationState={errors.pw ? "error" : "none"}
          validationMessage={errors.pw ?? "At least 8 characters."}
        >
          <Input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(_, d) => setPassword(d.value)}
            autoComplete="new-password"
            contentAfter={
              <Button
                aria-label={showPw ? "Hide password" : "Show password"}
                appearance="transparent"
                size="small"
                icon={showPw ? <EyeOffRegular /> : <EyeRegular />}
                onClick={() => setShowPw((v) => !v)}
              />
            }
          />
        </Field>
        <Field
          label="Confirm password"
          required
          validationState={errors.confirm ? "error" : "none"}
          validationMessage={errors.confirm}
        >
          <Input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(_, d) => setConfirm(d.value)}
            autoComplete="new-password"
          />
        </Field>
        <Button appearance="primary" type="submit" disabled={submitting || done}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
        <Body1 className={s.meta}>
          <Link to="/signin">Back to sign in</Link>
        </Body1>
      </form>
    </AuthLayout>
  );
}
