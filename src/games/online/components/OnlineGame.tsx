"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useOnlineGame } from "../hooks/useOnline";
import { OnlineBoard } from "./OnlineBoard";
import { OnlineLobby } from "./OnlineLobby";

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/online" title="Kniffel Online" />
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4">
        <Card className="flex flex-col gap-3 p-4 text-sm">{children}</Card>
      </div>
    </div>
  );
}

/** /online/[id]: the lobby before the start, the board after it. */
export function OnlineGame({ gameId }: { gameId: string }) {
  const { user, loading } = useAuth();
  const { load, userId, holds, sendHolds, accept } = useOnlineGame(gameId);

  if (!loading && !user) {
    return (
      <Message>
        Melde dich an, um mitzuspielen.
        <Button asChild>
          <Link href="/konto">Anmelden</Link>
        </Button>
      </Message>
    );
  }
  if (load.state === "loading" || !userId) {
    return (
      <Message>
        <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
      </Message>
    );
  }
  if (load.state === "gone") {
    return (
      <Message>
        Dieses Spiel gibt es nicht (mehr), oder du bist nicht dabei.
        <Button asChild variant="outline">
          <Link href="/online">Zu Kniffel Online</Link>
        </Button>
      </Message>
    );
  }

  const { game, players } = load;
  if (game.status === "cancelled") {
    return (
      <Message>
        Das Spiel wurde abgebrochen.
        <Button asChild variant="outline">
          <Link href="/online">Zu Kniffel Online</Link>
        </Button>
      </Message>
    );
  }
  if (game.status === "lobby") {
    if (!players.some((p) => p.user_id === userId)) {
      return (
        <Message>
          Du bist nicht (mehr) in diesem Spiel.
          <Button asChild variant="outline">
            <Link href="/online">Zu Kniffel Online</Link>
          </Button>
        </Message>
      );
    }
    return (
      <div className="min-h-full bg-background">
        <PageHeader backHref="/online" title="Lobby" />
        <div className="mx-auto max-w-md px-4 pb-10">
          <OnlineLobby game={game} players={players} userId={userId} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-full flex-col bg-background">
      <OnlineBoard game={game} userId={userId} holds={holds} sendHolds={sendHolds} accept={accept} />
    </div>
  );
}
