import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { toast } from "sonner";
import { InventoryItem } from "@/lib/types";
import { useLang } from "@/context/LangContext";

const GEMMA_API_KEY = import.meta.env.VITE_GEMMA_API_KEY as string;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

export function DictateModal({
  open,
  onClose,
  inventory,
  onParsed,
}: {
  open: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onParsed: (matches: { item: InventoryItem; qty: number }[]) => void;
}) {
  const { t } = useLang();
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!open) {
      setTranscript("");
      setRecording(false);
      setTranscribing(false);
      setStatus(null);
      setSubmitting(false);
      if (mediaRecRef.current?.state === "recording") {
        mediaRecRef.current.stop();
      }
      mediaRecRef.current = null;
      chunksRef.current = [];
    }
  }, [open]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 100) return;
        await transcribeWithGroq(audioBlob);
      };

      mediaRecRef.current = mediaRecorder;
      setRecording(true);
      setStatus(null);
      mediaRecorder.start();
    } catch {
      toast.error(t.micDenied);
    }
  };

  const stopRec = () => {
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop();
    }
    setRecording(false);
  };

  const transcribeWithGroq = async (audioBlob: Blob) => {
    setTranscribing(true);
    setStatus(t.transcribingStatus);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "hi");
      formData.append("response_format", "json");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Groq STT error ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      const text = data?.text?.trim() ?? "";
      if (text) {
        setTranscript(text);
        setStatus(t.transcriptionComplete);
      } else {
        setStatus(t.noSpeechDetected);
        toast.error(t.noSpeechError);
      }
    } catch (err) {
      console.error(err);
      setStatus(null);
      toast.error(t.transcriptionFailed);
    } finally {
      setTranscribing(false);
    }
  };

  const submit = async () => {
    if (!transcript.trim()) return;
    setSubmitting(true);
    setStatus(t.parsing);
    try {
      const sys = `You extract grocery shop orders from a shopkeeper's voice command (may be in Hindi, Hinglish, or English).
Available inventory items (with unit price) — you MUST use these exact names in your output:
${inventory.map((i) => `- ${i.name} (₹${i.price}/${i.unit})`).join("\n")}

Instructions:
- Map spoken item names (in any language) to the closest matching inventory name above.
- Return ONLY a JSON array, no prose.
  Each element: {"name": "<exact inventory name>", "qty": <number>} OR {"name": "...", "amount": <number>}
  Use "qty" when the user specifies a quantity (e.g. "2 kilo", "3 bottle", "ek packet").
  Use "amount" when the user specifies a monetary value (e.g. "200 rupees ka", "500rs", "₹300 wala").
  If only a bare number is given without units or currency, use the item's unit price to judge whether the number is a plausible quantity or a plausible rupee amount.
- If the command says to remove, reduce, or cancel an item (e.g. "हटा दो", "कम कर दो", "निकाल दो"), use negative qty (e.g. -1, -0.5).
- If neither qty nor amount is stated, default to qty: 1.
- Skip items that clearly don't match any inventory item.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${GEMMA_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sys }] },
            contents: [{ role: "user", parts: [{ text: transcript }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.2, thinkingConfig: { thinkingLevel: "MINIMAL" } },
          }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemma API error ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      const parts: { text?: string; thought?: boolean }[] =
        data?.candidates?.[0]?.content?.parts ?? [];
      const text: string =
        parts.filter((p) => !p.thought).pop()?.text ?? "[]";
      const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
      const parsed: { name: string; qty?: number; amount?: number }[] = JSON.parse(jsonStr);

      const matches: { item: InventoryItem; qty: number }[] = [];
      for (const p of parsed) {
        const pName = p.name.toLowerCase().trim();
        const item =
          inventory.find((i) => i.name.toLowerCase() === pName) ||
          inventory.find((i) => i.name.toLowerCase().includes(pName)) ||
          inventory.find((i) => pName.includes(i.name.toLowerCase())) ||
          inventory.find((i) => {
            const iName = i.name.toLowerCase();
            const shorter = pName.length < iName.length ? pName : iName;
            const longer = pName.length < iName.length ? iName : pName;
            const words = shorter.split(/\s+/);
            return words.some((w) => w.length > 2 && longer.includes(w));
          });
        if (item) {
          let qty = p.qty;
          if (qty == null && p.amount != null && item.price > 0) {
            qty = parseFloat((p.amount / item.price).toFixed(4));
          }
          matches.push({ item, qty: qty || 1 });
        }
      }

      if (matches.length === 0) {
        setStatus(t.noMatchingItems);
        toast.error(t.noMatchError);
      } else {
        setStatus(t.doneAdded(matches.length));
        onParsed(matches);
        setTimeout(() => onClose(), 600);
      }
    } catch (err) {
      console.error(err);
      setStatus(null);
      toast.error(t.parseError);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-billpanel text-billpanel-foreground rounded-t-3xl p-5 pb-7 animate-slide-up">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20 mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Mic className="h-5 w-5" /> {t.voiceOrder}
          </h2>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-center my-5">
          <button
            onClick={recording ? stopRec : startRec}
            disabled={transcribing}
            className="relative h-20 w-20 rounded-full bg-primary text-primary-foreground grid place-items-center
                       hover:bg-primary-hover active:scale-95 transition shadow-lg disabled:opacity-50"
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording && <span className="pulse-ring" />}
            {recording && <span className="pulse-ring delay" />}
            <Mic className="h-8 w-8 relative" />
          </button>
        </div>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={transcribing ? t.transcribingPlaceholder : t.speechPlaceholder}
          rows={3}
          className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-sm text-white
                     placeholder:text-white/40 placeholder:italic focus:outline-none focus:border-primary
                     resize-none"
        />

        <div className="h-5 mt-2 text-xs font-medium" style={{ color: "hsl(var(--brand-soft))" }}>
          {status ?? ""}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/30 text-white text-sm font-semibold
                       hover:bg-white/10 transition"
          >
            {t.cancel}
          </button>
          <button
            onClick={submit}
            disabled={!transcript.trim() || submitting || transcribing}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                       hover:bg-primary-hover disabled:opacity-50 transition"
          >
            {submitting ? t.submitting : t.submitOrder}
          </button>
        </div>
      </div>
    </div>
  );
}
