import { notFound } from "next/navigation";

import { DiceDesigns } from "./DiceDesigns";

/** Dev-only drafts for the Training/Quiz dice layout; 404 in production. */
export default function DiceDesignsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DiceDesigns />;
}
