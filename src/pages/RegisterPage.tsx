import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
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
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/utils/validation";

const useStyles = makeStyles({
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  meta: { textAlign: "center", color: tokens.colorNeutralForeground2 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: tokens.spacingVerticalM,
    "@media (min-width: 480px)": { gridTemplateColumns: "1fr 1fr" },
  },
});

interface Errors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  const s = useStyles();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: Errors = {
      displayName: validateDisplayName(displayName),
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: confirm !== password ? "Passwords don't match." : undefined,
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setSubmitting(true);
    try {
      await signUp({ displayName, username, email, password });
      navigate("/chat");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Takes less than a minute.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error ? (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}
        <div className={s.grid}>
          <Field
            label="Display name"
            required
            validationState={errors.displayName ? "error" : "none"}
            validationMessage={errors.displayName}
          >
            <Input
              value={displayName}
              onChange={(_, d) => setDisplayName(d.value)}
              autoComplete="name"
            />
          </Field>
          <Field
            label="Username"
            required
            validationState={errors.username ? "error" : "none"}
            validationMessage={errors.username}
          >
            <Input
              value={username}
              onChange={(_, d) => setUsername(d.value)}
              autoComplete="username"
            />
          </Field>
        </div>
        <Field
          label="Email"
          required
          validationState={errors.email ? "error" : "none"}
          validationMessage={errors.email}
        >
          <Input
            type="email"
            value={email}
            onChange={(_, d) => setEmail(d.value)}
            autoComplete="email"
          />
        </Field>
        <Field
          label="Password"
          required
          validationState={errors.password ? "error" : "none"}
          validationMessage={errors.password ?? "At least 8 characters."}
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
        <Button appearance="primary" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        <Body1 className={s.meta}>
          Already have an account? <Link to="/signin">Sign in</Link>
        </Body1>
      </form>
    </AuthLayout>
  );
}
