import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { APP_NAME } from "@/constants";

/** Landing page with a direct link to the login page. */
export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="rounded-2xl bg-white p-10 text-center shadow-soft">
        <h1 className="text-3xl font-semibold text-navy-800">{APP_NAME}</h1>
        <p className="mt-2 text-accent">
          School Bulletin &amp; Event Registration System
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button size="lg">Sign In</Button>
        </Link>
      </div>
    </main>
  );
}
