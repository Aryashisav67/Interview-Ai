import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ChannelStripProps {
  /** Normalized volume level, 0..1 */
  level: number;
  speaking: boolean;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  channel: string;
  segments?: number;
}

const SEGMENT_COUNT_DEFAULT = 14;

/** How many of the top segments read as "red" (clip warning), console-meter style. */
function litColor(index: number, total: number): "amber" | "red" {
  return index >= total - 2 ? "red" : "amber";
}

export function ChannelStrip({
  level,
  speaking,
  label,
  sublabel,
  icon: Icon,
  channel,
  segments = SEGMENT_COUNT_DEFAULT,
}: ChannelStripProps) {
  const clamped = Math.min(1, Math.max(0, level));
  const litCount = Math.round(clamped * segments);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rack-label">{channel}</div>

      <div className="patch-frame flex items-end gap-4 px-5 py-5">
        {/* LED ladder */}
        <div className="led-meter h-40 w-6">
          {Array.from({ length: segments }).map((_, i) => {
            const isLit = i < litCount;
            return (
              <div
                key={i}
                className="seg"
                data-lit={isLit ? litColor(i, segments) : undefined}
              />
            );
          })}
        </div>

        {/* Identity plate */}
        <div className="flex h-40 w-28 flex-col items-center justify-center gap-3 border-l border-border pl-4">
          <div
            className={cn(
              "grid size-11 place-items-center rounded-sm border transition-colors",
              speaking ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <p className={cn("font-display text-xs font-semibold uppercase tracking-wide", speaking ? "text-primary" : "text-foreground")}>
              {label}
            </p>
            <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{speaking ? "on air" : sublabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
