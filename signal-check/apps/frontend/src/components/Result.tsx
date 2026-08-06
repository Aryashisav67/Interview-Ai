import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, User } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ResultData {
  transcript: { type: "Assistant" | "User"; content: string; createdAt: string }[];
  score: number;
  feedback: string;
  status: "Done" | "InProgress" | "Pre";
}

export function Result() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData>({
    score: 0,
    feedback: "",
    transcript: [],
    status: "Pre",
  });

  useEffect(() => {
    const fetchResult = () =>
      axios.get(`${BACKEND_URL}/api/v1/result/${interviewId}`).then((response) => {
        setResult(response.data);
        return response.data.status as ResultData["status"];
      });

    fetchResult();
    const intervalId = setInterval(async () => {
      const s = await fetchResult();
      if (s === "Done") clearInterval(intervalId);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [interviewId]);

  const ready = result.status === "Done";
  const scoreSegments = 10;
  const litSegments = Math.round(result.score);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-14">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="tally-dot" data-state={ready ? "ready" : undefined} />
            <span className="rack-label">ch.03 — readout</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Interview printout</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          New session
        </Button>
      </header>

      {!ready ? (
        <div className="patch-frame flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <div>
            <p className="font-display text-sm">printing your results…</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">usually takes a few seconds</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Score meter */}
          <section className="patch-frame p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="rack-label">score</div>
              <div className="flex items-baseline gap-1 font-display">
                <span className="text-3xl font-bold tracking-tight">{result.score}</span>
                <span className="text-sm text-muted-foreground">/ 10</span>
              </div>
            </div>

            <div className="led-meter mt-4 h-5 w-full flex-row! gap-1.5">
              {Array.from({ length: scoreSegments }).map((_, i) => (
                <div
                  key={i}
                  className="seg h-5! w-full"
                  data-lit={i < litSegments ? (i >= 8 ? "teal" : "amber") : undefined}
                />
              ))}
            </div>

            <p className="mt-5 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
              {result.feedback}
            </p>
          </section>

          {/* Transcript */}
          <section>
            <h2 className="rack-label mb-4">conversation log</h2>
            <div className="flex flex-col gap-3">
              {result.transcript.length === 0 && (
                <p className="font-mono text-xs text-muted-foreground">No messages were recorded for this interview.</p>
              )}
              {result.transcript.map((m, i) => {
                const isAi = m.type === "Assistant";
                return (
                  <div key={i} className={cn("flex gap-3", isAi ? "justify-start" : "flex-row-reverse")}>
                    <div
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-sm border",
                        isAi ? "border-primary/40 text-primary" : "border-accent/40 text-accent",
                      )}
                    >
                      {isAi ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-sm border px-4 py-2.5 font-mono text-xs leading-relaxed",
                        isAi ? "border-border bg-card" : "border-accent/30 bg-accent/10",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
