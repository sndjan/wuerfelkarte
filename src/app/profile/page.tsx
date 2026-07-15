import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { DisplayNameEditor } from "./DisplayNameEditor";

export default async function PrivatePage() {
  if (process.env.PROFILE_ACTIVE !== "true") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="m-4 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Profil deaktiviert</h2>
          <p className="text-gray-500">
            Die Profilfunktion ist aktuell deaktiviert.
          </p>
        </Card>
      </div>
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/login");
  }
  const user = data.user;
  const email = user.email || "";
  const displayName = user.user_metadata.display_name || email.split("@")[0];
  const initials = displayName
    .split(/\W+/)
    .map((n: string) => n[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, summary, start_time, end_time, gamemode")
    .eq("user_id", user.id)
    .order("end_time", { ascending: false })
    .limit(10);

  async function signOutAction() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div>
      <PageHeader backHref="/" title="Würfelkarte" right={<Menu />} />
      {/* Combined Profile and Matches Card */}
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-2xl p-4 sm:p-8 flex flex-col gap-8 shadow-lg ">
          {/* Profile Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarImage
                src={user.user_metadata?.avatar_url || undefined}
                alt={displayName}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center sm:items-start gap-2 w-full">
              <DisplayNameEditor initialName={displayName} />
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                {email}
              </div>
            </div>
          </div>
          {/* Matches Section */}
          <div className="w-full">
            <h2 className="text-xl font-bold mb-4 text-center">
              Deine letzten Spiele
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gewinner</TableHead>
                  <TableHead>Punkte</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches && matches.length > 0 ? (
                  matches.map((match) => {
                    let summary = match.summary;
                    if (typeof summary === "string") {
                      try {
                        summary = JSON.parse(summary);
                      } catch {
                        console.error(
                          "Fehler beim Parsen der Zusammenfassung:",
                          summary
                        );
                        summary = {};
                      }
                    }
                    const date = match.end_time
                      ? new Date(match.end_time)
                      : null;
                    let winner;
                    if (Array.isArray(summary?.players)) {
                      const sorted = [...summary.players].sort(
                        (a: { score: number }, b: { score: number }) =>
                          b.score - a.score
                      );
                      winner = sorted[0] || "-";
                    }
                    return (
                      <TableRow key={match.id}>
                        <TableCell>{winner?.name || "-"}</TableCell>
                        <TableCell>{winner?.score || "-"}</TableCell>
                        <TableCell>{match.gamemode || "-"}</TableCell>
                        <TableCell>
                          {date ? date.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-400"
                    >
                      Keine gespeicherten Spiele
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <form action={signOutAction} className="w-full mt-2">
            <Button
              type="submit"
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Ausloggen
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
