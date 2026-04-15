import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

(() => {
  const blank = "data:,";
  document
    .querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]'
    )
    .forEach((el) => el.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = blank;
  document.head.appendChild(link);
})();

createRoot(document.getElementById("root")!).render(<App />);
