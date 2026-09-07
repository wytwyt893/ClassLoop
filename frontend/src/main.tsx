import { createRoot } from "react-dom/client";
import { ApiDataProvider } from "./services/dataProvider";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <ApiDataProvider>
    <App />
  </ApiDataProvider>,
);
