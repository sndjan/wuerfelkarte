"use client";

import { Emoji } from "@/components/emoji/Emoji";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { hostName } from "../config";
import { useMyOnline } from "../hooks/useOnline";
import { ActiveGameCard } from "./ActiveGameCard";

/** On the home page: the online game this account is in, or open invites. */
export function OnlineBanner() {
  const { user } = useAuth();
  const online = useMyOnline();
  if (!user || online.state !== "ready") return null;
  if (online.active) {
    return (
      <div className="wk-section">
        <h2 className="wk-overline">Online</h2>
        <ActiveGameCard game={online.active} userId={user.id} />
      </div>
    );
  }
  if (online.invites.length === 0) return null;
  const first = online.invites[0];
  return (
    <Link
      href="/online"
      className="wk-listrow wk-card-accent"
    >
      <span className="wk-listrow-emoji" aria-hidden="true">
        <Emoji e="🌐" />
      </span>
      <div className="wk-listrow-body">
        <p className="wk-listrow-title">Einladung von {hostName(first)}</p>
        <p className="wk-listrow-sub">
          Online-Würfelkarte{online.invites.length > 1 && ` · ${online.invites.length - 1} weitere`}
        </p>
      </div>
      <span className="wk-btn wk-btn-sm wk-btn-primary">Ansehen</span>
    </Link>
  );
}
