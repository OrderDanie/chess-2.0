export function getToken(): string {
  if (typeof window === "undefined") return "server";
  
  // Check URL param first if testing specific seats
  const urlParam = new URLSearchParams(window.location.search).get("token");
  if (urlParam) return urlParam;

  let t = window.sessionStorage.getItem("chess2-token");
  if (!t) {
    // Generate a clean per-session player token
    t = "usr_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.sessionStorage.setItem("chess2-token", t);
  }
  return t;
}

export function getName(): string {
  if (typeof window === "undefined") return "Doodler";
  return (
    window.sessionStorage.getItem("chess2-name") ||
    window.localStorage.getItem("chess2-name") ||
    "Doodler"
  );
}

export function setName(name: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("chess2-name", name);
  window.localStorage.setItem("chess2-name", name);
}
