(function () {
  const root = document.documentElement;
  const button = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("studentResultPortalTheme");
  const initialTheme = savedTheme === "dark" ? "dark" : "light";

  function applyTheme(theme) {
    const isDark = theme === "dark";
    root.setAttribute("data-theme", isDark ? "dark" : "light");
    if (button) {
      const icon = button.querySelector(".theme-icon");
      const label = button.querySelector(".theme-label");
      if (icon) icon.textContent = isDark ? "☀" : "☾";
      if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
      button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(isDark));
      button.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    }
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", isDark ? "#0c1723" : "#f7fbff");
  }

  applyTheme(initialTheme);
  if (button) {
    button.addEventListener("click", function () {
      const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem("studentResultPortalTheme", nextTheme);
      applyTheme(nextTheme);
    });
  }
})();