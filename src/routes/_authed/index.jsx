import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/home/HomeScreen";

export const Route = createFileRoute("/_authed/")({
  head: () => ({ meta: [{ title: "Home · LifeOS" }] }),
  component: HomePage,
});