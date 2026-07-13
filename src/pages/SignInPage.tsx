import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Checkbox,
  Field,
  Input,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
  Body1,
} from "@fluentui/react-components";
import { EyeRegular, EyeOffRegular } from "@fluentui/react-icons";
import { AuthLayout } from "@/pages/AuthLayout";
import { useAuth } from "@/providers/AuthProvider";
import { validatePassword } from "@/utils/validation";

const useStyles = makeStyles({
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  meta: { textAlign: "center", color: tokens.colorNeutralForeground2 },
});

export default function SignInPage() {
  const s = useStyles();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ id?: string; pw?: string }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: typeof fieldErr = {};
    if (!identifier.trim()) errs.id = "Enter your email or username.";
    const pw = validatePassword(password);
    if (pw) errs.pw = pw;
    setFieldErr(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      await signIn({ identifier, password, remember });
      navigate(location.state?.from ?? "/chat");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Realtime ChatApp account.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error ? (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}
        <Field
          label="Email or username"
          validationState={fieldErr.id ? "error" : "none"}
          validationMessage={fieldErr.id}
          required
        >
          <Input
            value={identifier}
            onChange={(_, d) => setIdentifier(d.value)}
            autoComplete="username"
            autoFocus
          />
        </Field>
        <Field
          label="Password"
          validationState={fieldErr.pw ? "error" : "none"}
          validationMessage={fieldErr.pw}
          required
          hint={<Link to="/forgot-password">Forgot password?</Link>}
        >
          <Input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(_, d) => setPassword(d.value)}
            autoComplete="current-password"
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
        <div className={s.row}>
          <Checkbox
            checked={remember}
            onChange={(_, d) => setRemember(Boolean(d.checked))}
            label="Remember me"
          />
        </div>
        <Button appearance="primary" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <Body1 className={s.meta}>
          New here? <Link to="/register">Create an account</Link>
        </Body1>
      </form>
    </AuthLayout>
  );
}
