import { Tooltip, Button, makeStyles, tokens } from "@fluentui/react-components";
import { WeatherMoonRegular, WeatherSunnyRegular } from "@fluentui/react-icons";
import { useTheme } from "@/providers/ThemeProvider";

const useStyles = makeStyles({
  btn: { color: tokens.colorNeutralForeground2 },
});

export function ThemeToggle() {
  const styles = useStyles();
  const { mode, toggle } = useTheme();
  const label = mode === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <Tooltip content={label} relationship="label">
      <Button
        aria-label={label}
        appearance="subtle"
        icon={mode === "dark" ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
        onClick={toggle}
        className={styles.btn}
      />
    </Tooltip>
  );
}
