import { RuntimeBootstrap } from "@/app/runtime-bootstrap";
import { AppRouter } from "@/routes/app-router";

export function App() {
  return (
    <>
      <RuntimeBootstrap />
      <AppRouter />
    </>
  );
}
