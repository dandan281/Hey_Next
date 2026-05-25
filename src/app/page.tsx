import Link from "next/link";

export default function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <nav className="flex items-center justify-between">
        <div className="text-xl font-semibold tracking-tight">
          <span className="gradient-text">Hey Next</span>
        </div>
        <Link
          href="/login"
          className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
        >
          sign in →
        </Link>
      </nav>

      <header className="mt-24 space-y-6">
        <div className="inline-block rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-muted">
          for the in-between
        </div>
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          give them your{" "}
          <span className="gradient-text">Hey Next</span>
          <br />
          not your number.
        </h1>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          the next is the best
        </p>
        <p className="max-w-xl text-lg text-muted">
          one switch. when you&apos;re{" "}
          <span className="text-foreground">unavailable</span>, friends see you
          exist — nothing else. flip to{" "}
          <span className="text-available">available</span> and everyone you&apos;ve
          ever added gets your real phone &amp; email, all at once.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/login"
            className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            sign in with phone →
          </Link>
          <Link
            href="/app/demo"
            className="rounded-full border border-border px-6 py-3 font-medium text-muted transition hover:border-accent hover:text-foreground"
          >
            try the demo
          </Link>
        </div>
      </header>

      <section className="mt-24 grid gap-6 sm:grid-cols-3">
        <Card
          step="01"
          title="add"
          body="tap-to-trade. exchange Hey Next handles instead of phone numbers. zero pressure, real intent."
        />
        <Card
          step="02"
          title="wait"
          body="they're taken. you're taken. or just not in the mood. friends can see you exist — contact info stays hidden."
        />
        <Card
          step="03"
          title="reveal"
          body="single now? curious? bored? flip the switch — everyone who's been waiting gets your real number with a dramatic notification."
        />
      </section>

      <section className="mt-24 rounded-3xl border border-border bg-card p-8">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          who this is for
        </div>
        <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <Tag>situationships in waiting</Tag>
          <Tag>currently coupled, maybe not forever</Tag>
          <Tag>chronic flirts with boundaries</Tag>
          <Tag>poly &amp; ENM curious</Tag>
          <Tag>"slide back in if you're ever free"</Tag>
          <Tag>海王 / 海后 with class</Tag>
        </div>
      </section>

      <footer className="mt-24 border-t border-border pt-6 text-xs text-muted">
        <p>
          Hey Next is in private demo. all data lives in your browser. nothing
          uploaded.
        </p>
      </footer>
    </div>
  );
}

function Card({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="font-mono text-[10px] tracking-[0.3em] text-accent">
        {step}
      </div>
      <div className="mt-2 text-xl font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted">{body}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      {children}
    </div>
  );
}
