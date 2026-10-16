import { useTheme, type Theme } from "../lib/themes";
export function ThemePicker() {
  const [theme, setTheme] = useTheme();
  return (
    <label className="theme-picker">
      <span className="theme-swatch" />
      <span className="sr-only">Visual theme</span>
      <select
        aria-label="Visual theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="signal">Signal Seven</option>
        <option value="afterlight">Afterlight</option>
        <option value="soft">Soft Cinema</option>
      </select>
    </label>
  );
}
