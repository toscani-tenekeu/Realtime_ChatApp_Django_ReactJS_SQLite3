import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
  tokens,
  Body1,
} from "@fluentui/react-components";
import { AuthLayout } from "@/pages/AuthLayout";
import { authService } from "@/services";
import { validateEmail } from "@/utils/validation";

const useStyles = makeStyles({
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  meta: { textAlign: "center", color: tokens.colorNeutralForeground2 },
});

export default function ForgotPasswordPage() {
  const s = useStyles();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateEmail(email);
    setErr(v);
    if (v) return;
    setSubmitting(true);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent password reset instructions.">
        <MessageBar intent="success">
          <MessageBarBody>
            <MessageBarTitle>Email on the way</MessageBarTitle>
            If an account exists for <b>{email}</b>, you'll get a reset link shortly.
          </MessageBarBody>
        </MessageBar>
        <Body1 style={{ textAlign: "center", color: tokens.colorNeutralForeground2 }}>
          <Link to="/signin">Back to sign in</Link>
        </Body1>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you use for Realtime ChatApp."
    >
      <form className={s.form} onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          required
          validationState={err ? "error" : "none"}
          validationMessage={err}
        >
          <Input type="email" value={email} onChange={(_, d) => setEmail(d.value)} autoFocus />
        </Field>
        <Button appearance="primary" type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
        <Body1 className={s.meta}>
          Remembered it? <Link to="/signin">Sign in</Link>
        </Body1>
      </form>
    </AuthLayout>
  );
}
