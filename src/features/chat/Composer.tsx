import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Textarea,
  Tooltip,
  makeStyles,
  tokens,
  ProgressBar,
  Popover,
  PopoverSurface,
  PopoverTrigger,
} from "@fluentui/react-components";
import {
  SendRegular,
  AttachRegular,
  EmojiRegular,
  DismissRegular,
  ImageRegular,
  DocumentRegular,
  ArrowReplyRegular,
  MicRegular,
  RecordStopRegular,
} from "@fluentui/react-icons";
import type { Attachment, Message } from "@/services/types";
import { getUser } from "@/features/chat/helpers";

const EMOJI = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F60D}",
  "\u{1F972}",
  "\u{1F914}",
  "\u{1F44D}",
  "\u{1F64F}",
  "\u{1F389}",
  "\u{1F525}",
  "\u{1F4AF}",
  "\u{2764}\u{FE0F}",
  "\u{1F622}",
  "\u{1F62E}",
  "\u{1F64C}",
  "\u{2728}",
  "\u{1F680}",
];

const useStyles = makeStyles({
  root: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: tokens.spacingHorizontalM,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  replyBar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
  },
  replyText: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  row: {
    display: "flex",
    alignItems: "flex-end",
    gap: tokens.spacingHorizontalS,
  },
  textareaWrap: { flex: 1 },
  attachRow: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  attachChip: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    maxWidth: "240px",
  },
  attachChipFail: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  chipName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  emojiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: "4px",
    padding: tokens.spacingHorizontalS,
    maxWidth: "260px",
  },
  emojiBtn: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px",
    borderRadius: tokens.borderRadiusMedium,
    ":hover": { backgroundColor: tokens.colorNeutralBackground3Hover },
  },
  recordingBar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  recordingDot: {
    width: "8px",
    height: "8px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorPaletteRedForeground1,
  },
});

interface Pending extends Attachment {
  progress: number;
  failed?: boolean;
}

interface Props {
  onSend: (input: { body: string; replyToId?: string; attachments?: Attachment[] }) => void;
  replyTo?: Message | null;
  onClearReply: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, replyTo, onClearReply, disabled, placeholder }: Props) {
  const s = useStyles();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  function formatRecordingTime(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function queueRecording(file: File) {
    setPending((prev) => [
      ...prev,
      {
        id: `att_${Math.random().toString(36).slice(2)}`,
        kind: "audio",
        name: file.name,
        url: URL.createObjectURL(file),
        sizeBytes: file.size,
        mime: file.type || "audio/webm",
        progress: 100,
      },
    ]);
  }

  async function startRecording() {
    if (disabled || recording) return;
    if (!window.isSecureContext) {
      window.alert("Voice recording requires HTTPS (or localhost). Open the secure app URL.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      window.alert("Audio recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find(
        (type) =>
          typeof MediaRecorder.isTypeSupported !== "function" ||
          MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type });
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        if (blob.size > 0)
          queueRecording(new File([blob], `voice-message-${Date.now()}.${extension}`, { type }));
        recordingChunksRef.current = [];
      };
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(
        () => setRecordingSeconds((value) => value + 1),
        1000,
      );
    } catch {
      window.alert("Microphone permission is required to record a voice message.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    recordingStreamRef.current = null;
    clearRecordingTimer();
    setRecording(false);
  }

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) recorder.onstop = null;
    recorder?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    recordingStreamRef.current = null;
    recordingChunksRef.current = [];
    clearRecordingTimer();
    setRecording(false);
  }, []);

  useEffect(() => cancelRecording, [cancelRecording]);

  function submit() {
    if (recording) return;
    const body = text.trim();
    if (!body && pending.length === 0) return;
    if (pending.some((p) => p.progress < 100 && !p.failed)) return;
    const attachments: Attachment[] = pending
      .filter((p) => !p.failed)
      .map(({ progress, failed, ...attachment }) => attachment);
    onSend({
      body,
      replyToId: replyTo?.id,
      attachments: attachments.length ? attachments : undefined,
    });
    setText("");
    setPending([]);
    onClearReply();
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = `att_${Math.random().toString(36).slice(2)}`;
      const kind = file.type.startsWith("image/") ? "image" : "document";
      const url = URL.createObjectURL(file);
      const nextAttachment: Pending = {
        id,
        kind,
        name: file.name,
        url,
        sizeBytes: file.size,
        mime: file.type,
        progress: 0,
      };
      setPending((prev) => [...prev, nextAttachment]);
      const willFail = Math.random() < 0.1;
      const step = () => {
        setPending((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const next = Math.min(100, item.progress + 20 + Math.random() * 20);
            if (next >= 100 && willFail) return { ...item, progress: 100, failed: true };
            return { ...item, progress: next };
          }),
        );
      };
      const interval = window.setInterval(() => {
        setPending((prev) => {
          const current = prev.find((item) => item.id === id);
          if (!current) {
            window.clearInterval(interval);
            return prev;
          }
          if (current.progress >= 100 || current.failed) {
            window.clearInterval(interval);
            return prev;
          }
          return prev;
        });
        step();
      }, 250);
    });
  }

  return (
    <div className={s.root} data-testid="composer">
      {replyTo ? (
        <div className={s.replyBar}>
          <ArrowReplyRegular />
          <div className={s.replyText}>
            Replying to <b>{getUser(replyTo.authorId)?.displayName ?? "someone"}</b>: {replyTo.body}
          </div>
          <Button
            aria-label="Cancel reply"
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            onClick={onClearReply}
          />
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className={s.attachRow}>
          {pending.map((item) => (
            <div
              key={item.id}
              className={item.failed ? `${s.attachChip} ${s.attachChipFail}` : s.attachChip}
            >
              {item.kind === "image" ? <ImageRegular /> : <DocumentRegular />}
              <span className={s.chipName}>{item.name}</span>
              {!item.failed && item.progress < 100 ? (
                <div style={{ width: 60 }}>
                  <ProgressBar value={item.progress / 100} thickness="medium" />
                </div>
              ) : null}
              {item.failed ? <span>failed</span> : null}
              <Button
                aria-label={`Remove ${item.name}`}
                appearance="transparent"
                size="small"
                icon={<DismissRegular />}
                onClick={() => setPending((prev) => prev.filter((entry) => entry.id !== item.id))}
              />
            </div>
          ))}
        </div>
      ) : null}

      {recording ? (
        <div className={s.recordingBar} role="status" aria-live="polite">
          <span className={s.recordingDot} />
          <span>Recording {formatRecordingTime(recordingSeconds)}</span>
          <Button
            aria-label="Stop recording"
            appearance="subtle"
            size="small"
            icon={<RecordStopRegular />}
            onClick={stopRecording}
          />
          <Button size="small" appearance="transparent" onClick={cancelRecording}>
            Cancel
          </Button>
        </div>
      ) : null}

      <div className={s.row}>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            onFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Tooltip content="Attach file" relationship="label">
          <Button
            aria-label="Attach file"
            appearance="subtle"
            icon={<AttachRegular />}
            onClick={() => fileInput.current?.click()}
            disabled={disabled}
          />
        </Tooltip>
        <Tooltip content="Record voice message" relationship="label">
          <Button
            aria-label="Record voice message"
            appearance="subtle"
            icon={<MicRegular />}
            onClick={() => void startRecording()}
            disabled={disabled || recording}
          />
        </Tooltip>
        <Popover>
          <PopoverTrigger disableButtonEnhancement>
            <Tooltip content="Emoji" relationship="label">
              <Button
                aria-label="Insert emoji"
                appearance="subtle"
                icon={<EmojiRegular />}
                disabled={disabled}
              />
            </Tooltip>
          </PopoverTrigger>
          <PopoverSurface>
            <div className={s.emojiGrid}>
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  className={s.emojiBtn}
                  onClick={() => setText((value) => value + emoji)}
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverSurface>
        </Popover>
        <div className={s.textareaWrap}>
          <Textarea
            value={text}
            onChange={(_, data) => setText(data.value)}
            placeholder={
              placeholder ?? "Write a message... (Enter to send, Shift+Enter for a new line)"
            }
            resize="vertical"
            disabled={disabled}
            aria-label="Message input"
            data-testid="message-input"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            style={{ width: "100%" }}
          />
        </div>
        <Tooltip content="Send" relationship="label">
          <Button
            aria-label="Send message"
            appearance="primary"
            icon={<SendRegular />}
            onClick={submit}
            data-testid="send-message"
            disabled={
              disabled || (!text.trim() && pending.filter((item) => !item.failed).length === 0)
            }
          />
        </Tooltip>
      </div>
    </div>
  );
}
