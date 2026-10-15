import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CarTaxiFront, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [{ title: "My Driver & QR Sticker — AutoMitra" }],
  }),
  component: ConsoleRedirect,
});

function ConsoleRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/onboard" });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-amber/20 text-amber mb-4">
        <CarTaxiFront className="size-8" />
      </div>
      <h1 className="text-2xl font-black text-foreground">Family Console Retired</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        AutoMitra now auto-detects UPI payments and dispatches SMS directly to the driver's phone with zero manual effort.
      </p>
      <Link
        to="/onboard"
        className="mt-6 flex items-center gap-2 rounded-xl bg-amber px-5 py-2.5 text-xs font-black text-ink shadow-md hover:bg-amber-deep transition-all"
      >
        <span>Go to My Driver &amp; QR</span>
        <ArrowRight className="size-4" />
      </Link>
    </main>
  );
}
