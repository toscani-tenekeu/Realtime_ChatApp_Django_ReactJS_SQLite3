import { useEffect, useRef } from "react";
import { Button, Card, Text, makeStyles, tokens } from "@fluentui/react-components";
import {
  CallEndRegular,
  MicOffRegular,
  MicRegular,
  VideoOffRegular,
  VideoRegular,
} from "@fluentui/react-icons";
import type { CallState } from "@/features/calls/useCallSession";

const useStyles = makeStyles({
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(0, 0, 0, .72)",
    padding: tokens.spacingHorizontalL,
  },
  panel: {
    width: "min(760px, 100%)",
    minHeight: "min(520px, 80dvh)",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  stage: {
    flex: 1,
    minHeight: 260,
    position: "relative",
    overflow: "hidden",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
    display: "grid",
    placeItems: "center",
  },
  remote: { width: "100%", height: "100%", objectFit: "cover" },
  local: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 150,
    height: 100,
    objectFit: "cover",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground4,
  },
  controls: { display: "flex", justifyContent: "center", gap: tokens.spacingHorizontalM },
  end: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorPaletteRedForeground1,
  },
  incoming: { textAlign: "center", display: "grid", gap: tokens.spacingVerticalM },
});

interface Props {
  call: CallState;
  remoteName: string;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export function CallOverlay({
  call,
  remoteName,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  onToggleCamera,
}: Props) {
  const s = useStyles();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = call.localStream;
  }, [call.localStream]);
  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = call.remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = call.remoteStream;
    if (call.remoteStream) {
      void remoteRef.current?.play().catch(() => undefined);
      void remoteAudioRef.current?.play().catch(() => undefined);
    }
  }, [call.remoteStream]);

  const incoming = call.direction === "incoming" && call.status === "ringing";
  const failed = call.status === "failed";
  return (
    <div className={s.backdrop} role="dialog" aria-label={incoming ? "Incoming call" : "Call"}>
      <Card className={s.panel}>
        <div>
          <Text size={500} weight="semibold">
            {incoming ? `${remoteName} is calling` : remoteName}
          </Text>
          <Text block size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            {failed
              ? call.error
              : incoming
                ? `${call.kind === "video" ? "Video" : "Audio"} call`
                : call.status === "connected"
                  ? "Connected"
                  : "Connecting…"}
          </Text>
        </div>
        {incoming ? (
          <div className={s.incoming}>
            <Text>{call.kind === "video" ? "Incoming video call" : "Incoming audio call"}</Text>
            <div className={s.controls}>
              <Button appearance="primary" onClick={onAccept}>
                Accept
              </Button>
              <Button className={s.end} icon={<CallEndRegular />} onClick={onReject}>
                Decline
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className={s.stage}>
              {call.kind === "audio" ? <audio ref={remoteAudioRef} autoPlay /> : null}
              {call.kind === "video" ? (
                <video ref={remoteRef} className={s.remote} autoPlay playsInline />
              ) : (
                <Text size={500}>{call.status === "calling" ? "Calling…" : "Audio call"}</Text>
              )}
              {call.kind === "video" ? (
                <video ref={localRef} className={s.local} autoPlay playsInline muted />
              ) : null}
            </div>
            <div className={s.controls}>
              <Button
                aria-label={call.muted ? "Unmute microphone" : "Mute microphone"}
                icon={call.muted ? <MicOffRegular /> : <MicRegular />}
                onClick={onToggleMute}
              />
              {call.kind === "video" ? (
                <Button
                  aria-label={call.cameraOff ? "Turn camera on" : "Turn camera off"}
                  icon={call.cameraOff ? <VideoOffRegular /> : <VideoRegular />}
                  onClick={onToggleCamera}
                />
              ) : null}
              <Button
                className={s.end}
                aria-label="End call"
                icon={<CallEndRegular />}
                onClick={onHangup}
              >
                End call
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
