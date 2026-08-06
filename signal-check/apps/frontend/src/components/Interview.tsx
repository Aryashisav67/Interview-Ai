import { BACKEND_URL, DEEPGRAM_KEY } from "@/lib/config";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, PhoneOff, User } from "lucide-react";
import { Button } from "./ui/button";
import { ChannelStrip } from "./ChannelStrip";

type Status = "connecting" | "live" | "ending";

/** Attaches an analyser to a stream and returns a getter for its current 0..1 volume level. */
function createLevelMeter(ctx: AudioContext, stream: MediaStream) {
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  return () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    // Boost and clamp so normal speech fills most of the range.
    return Math.min(1, rms * 3.2);
  };
}

export function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("connecting");
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);

  // Resources we need to tear down on exit.
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      let aiMeter: (() => number) | null = null;
      let userMeter: (() => number) | null = null;

      // Play + meter the AI's audio.
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        const stream = e.streams[0]!;
        audioEl.srcObject = stream;
        aiMeter = createLevelMeter(audioCtx, stream);
      };

      // Capture the user's microphone.
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled) {
        ms.getTracks().forEach((t) => t.stop());
        return;
      }
      userStreamRef.current = ms;
      userMeter = createLevelMeter(audioCtx, ms);

      // Stream the mic to Deepgram for live transcription.
      if (DEEPGRAM_KEY) {
        const socket = new WebSocket("wss://api.deepgram.com/v1/listen", ["token", DEEPGRAM_KEY]);
        socketRef.current = socket;

        socket.onopen = () => {
          const mediaRecorder = new MediaRecorder(ms, { mimeType: "audio/webm" });
          recorderRef.current = mediaRecorder;
          mediaRecorder.start(250);
          mediaRecorder.addEventListener("dataavailable", (event) => {
            if (socket.readyState === WebSocket.OPEN) socket.send(event.data);
          });
        };

        socket.onmessage = (message) => {
          const received = JSON.parse(message.data);
          const transcript = received.channel?.alternatives[0]?.transcript;
          if (transcript) {
            axios.post(`${BACKEND_URL}/api/v1/session/user/response/${interviewId}`, {
              message: transcript,
            });
          }
        };
      }

      pc.addTrack(ms.getTracks()[0]!);

      // SDP handshake with the backend.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpResponse = await fetch(`${BACKEND_URL}/api/v1/session/${interviewId}`, {
        method: "POST",
        body: offer.sdp,
        headers: { "Content-Type": "application/sdp" },
      });
      const answer = { type: "answer" as const, sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

      if (cancelled) return;
      setStatus("live");

      // Single animation loop drives both volume meters.
      const tick = () => {
        if (aiMeter) setAiLevel(aiMeter());
        if (userMeter) setUserLevel(userMeter());
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    socketRef.current?.close();
    userStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    audioCtxRef.current?.close().catch(() => {});
  }

  function endInterview() {
    setStatus("ending");
    cleanup();
    navigate(`/result/${interviewId}`);
  }

  const aiSpeaking = aiLevel > 0.06 && aiLevel >= userLevel;
  const userSpeaking = userLevel > 0.06 && userLevel > aiLevel;

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Rack header */}
      <header className="strip-scan flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="tally-dot" data-state={status === "live" ? "live" : undefined} />
          <span className="font-display text-xs uppercase tracking-[0.14em]">
            {status === "connecting" ? "connecting…" : status === "ending" ? "wrapping up…" : "on air"}
          </span>
        </div>
        <span className="rack-label">ch.02 — live</span>
      </header>

      {/* Stage */}
      <div className="flex flex-1 items-center justify-center px-6">
        {status === "connecting" ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="font-mono text-xs">opening channel & requesting mic access…</p>
          </div>
        ) : (
          <div className="flex w-full max-w-3xl items-center justify-center gap-16 sm:gap-28">
            <ChannelStrip
              level={aiLevel}
              speaking={aiSpeaking}
              label="Interviewer"
              sublabel="listening"
              icon={Bot}
              channel="input a"
            />
            <ChannelStrip
              level={userLevel}
              speaking={userSpeaking}
              label="You"
              sublabel="mic live"
              icon={User}
              channel="input b"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="flex justify-center border-t border-border px-6 py-6">
        <Button
          variant="destructive"
          size="lg"
          onClick={endInterview}
          disabled={status === "ending"}
          className="gap-2"
        >
          {status === "ending" ? <Loader2 className="size-4 animate-spin" /> : <PhoneOff className="size-4" />}
          End interview
        </Button>
      </footer>
    </main>
  );
}
