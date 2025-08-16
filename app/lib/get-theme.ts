const script = `
  let theme = localStorage.getItem("vite-ui-theme");
  if (!theme || theme === "system") {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    if (mql.matches) {
      theme = "dark";
    } else {
      theme = "light";
    }
  }
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  }
`;

export function getTheme() {
  return script;
}
