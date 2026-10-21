import { createFileRoute } from "@tanstack/react-router";
import { ShedApp } from "@/components/shed/shed-app";

export const Route = createFileRoute("/")({
  component: ShedApp,
});
