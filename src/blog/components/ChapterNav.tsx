import Link from "next/link";

type Target = { href: string; title: string };

/** Back and next between the guide's pages. */
export function ChapterNav({ prev, next }: { prev?: Target; next?: Target }) {
  return (
    <nav className="wkx-chapnav" aria-label="Kapitel">
      {prev && (
        <Link href={prev.href}>
          <small>Zurück</small>
          <span>{prev.title}</span>
        </Link>
      )}
      {next && (
        <Link href={next.href} className="is-next">
          <small>Weiter</small>
          <span>{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
