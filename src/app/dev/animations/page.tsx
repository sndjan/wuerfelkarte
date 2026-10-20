import { notFound } from "next/navigation";

import { AnimationsPlayground } from "./AnimationsPlayground";

/** Dev-only playground for the celebration animations; 404 in production. */
export default function AnimationsPlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AnimationsPlayground />;
}
