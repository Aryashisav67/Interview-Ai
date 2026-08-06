import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useNavigate } from "react-router";
import { ArrowRight, Github, Loader2 } from "lucide-react";

export function Form() {
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit() {
    if (!github.trim()) {
      toast("Patch in a GitHub URL first");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, {
        github: github.trim(),
      });
      navigate(`/interview/${response.data.id}`);
    } catch (e) {
      toast("Couldn't reach the console. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="tally-dot" data-state="ready" />
            <span className="rack-label">ch.01 — source</span>
          </div>
          <span className="font-display text-xs tracking-[0.2em] text-muted-foreground">SIGNAL CHECK</span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Patch in your
          <br />
          <span className="text-primary">GitHub signal.</span>
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
          We read your public repos, route them into a live voice interviewer, and print a
          scored transcript when you're done. Headphones recommended.
        </p>

        <div className="mt-10">
          <div className="patch-frame flex items-center gap-2 p-2 focus-within:border-ring">
            <div className="flex items-center pl-2 text-muted-foreground">
              <Github className="size-4" />
            </div>
            <Input
              value={github}
              placeholder="github.com/your-username"
              onChange={(e) => setGithub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
              disabled={loading}
            />
            <Button disabled={loading} onClick={onSubmit} className="shrink-0">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Patching
                </>
              ) : (
                <>
                  Go live
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 font-mono text-[0.7rem] text-muted-foreground">
            mic access requested once the interview channel opens
          </p>
        </div>

        {/* Signal chain preview */}
        <div className="mt-16 flex items-center gap-3 font-display text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-primary">ch.01 source</span>
          <span className="h-px flex-1 bg-border" />
          <span>ch.02 live</span>
          <span className="h-px flex-1 bg-border" />
          <span>ch.03 readout</span>
        </div>
      </div>
    </main>
  );
}
