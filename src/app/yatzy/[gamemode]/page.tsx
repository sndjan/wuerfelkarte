import { Suspense } from "react";

import { Board } from "@/games/yatzy/components/Board";

export default function YatzyGamePage() {
  return (
    <Suspense>
      <Board />
    </Suspense>
  );
}
