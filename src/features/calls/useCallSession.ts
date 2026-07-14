import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, ID } from "@/services/types";
import { chatService } from "@/services";
import { toApiId } from "@/services/api/identity";
import type { RealtimeEvent } from "@/services/chat/ApiChatService";

export type CallKind = "audio" | "video";
export type CallStatus =
  "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended" | "failed";

export interface CallState {
  id: string;
  kind: CallKind;
  status: CallStatus;
  direction: "incoming" | "outgoing";
  conversationId: ID;
  remoteUserId: ID;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  error?: string;
}

type PendingSignal = { type: "offer" | "ice-candidate"; payload: unknown };

const rtcConfig: RTCConfiguration = {
  iceServers: (import.meta.env.VITE_RTC_ICE_SERVERS
    ? JSON.parse(import.meta.env.VITE_RTC_ICE_SERVERS)
    : []) as RTCIceServer[],
};

function newCallId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `call_${crypto.randomUUID()}`;
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return `call_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function callError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera or microphone permission was denied.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No camera or microphone was found.";
  }
  if (error instanceof DOMException && error.name === "NotReadableError") {
    return "The camera is already in use by another tab or application. Close it, then try video again, or use an audio call.";
  }
  if (error instanceof DOMException && error.name === "OverconstrainedError") {
    return "This camera cannot provide the requested video mode.";
  }
  if (error instanceof DOMException && error.name === "SecurityError") {
    return "Camera access requires HTTPS and permission for this site.";
  }
  return error instanceof Error ? error.message : "Unable to start the call.";
}

export function useCallSession(userId: ID | undefined) {
  const [call, setCall] = useState<CallState | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingSignals = useRef<PendingSignal[]>([]);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const callRef = useRef<CallState | null>(null);
  const remoteBackendId = useRef<string>("");
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const sendSignal = useCallback(
    async (input: {
      callId: string;
      conversationId: ID;
      toUserId: string;
      signalType: string;
      kind: CallKind;
      payload?: unknown;
    }) => {
      await chatService.sendRealtime({ type: "call.signal", ...input });
    },
    [],
  );

  const closePeer = useCallback(() => {
    peerRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  const finish = useCallback(
    async (notify = true, status: CallStatus = "ended") => {
      const active = callRef.current;
      if (active && notify && remoteBackendId.current) {
        await sendSignal({
          callId: active.id,
          conversationId: active.conversationId,
          toUserId: remoteBackendId.current,
          signalType: "hangup",
          kind: active.kind,
        }).catch(() => undefined);
      }
      closePeer();
      pendingOffer.current = null;
      pendingSignals.current = [];
      remoteBackendId.current = "";
      setCall((current) =>
        current ? { ...current, status, localStream: null, remoteStream: null } : null,
      );
      window.setTimeout(
        () => setCall((current) => (current?.status === status ? null : current)),
        250,
      );
    },
    [closePeer, sendSignal],
  );

  const createPeer = useCallback(
    (active: CallState) => {
      const peer = new RTCPeerConnection(rtcConfig);
      peer.onicecandidate = (event) => {
        if (event.candidate && remoteBackendId.current) {
          void sendSignal({
            callId: active.id,
            conversationId: active.conversationId,
            toUserId: remoteBackendId.current,
            signalType: "ice-candidate",
            kind: active.kind,
            payload: event.candidate.toJSON(),
          });
        }
      };
      peer.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        setCall((current) =>
          current ? { ...current, remoteStream: stream, status: "connected" } : current,
        );
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(peer.connectionState)) {
          void finish(false, peer.connectionState === "failed" ? "failed" : "ended");
        }
      };
      peerRef.current = peer;
      return peer;
    },
    [finish, sendSignal],
  );

  const flushCandidates = useCallback(async (peer: RTCPeerConnection) => {
    const queued = pendingSignals.current.splice(0);
    for (const signal of queued) {
      if (signal.type === "ice-candidate" && signal.payload) {
        await peer.addIceCandidate(signal.payload as RTCIceCandidateInit).catch(() => undefined);
      }
    }
  }, []);

  const startCall = useCallback(
    async (conversation: Conversation, kind: CallKind) => {
      if (!userId || conversation.kind !== "dm" || callRef.current) return;
      const remoteId = conversation.memberIds.find((id) => id !== userId && id !== "u_me");
      if (!remoteId) return;
      const id = newCallId();
      const active: CallState = {
        id,
        kind,
        status: "calling",
        direction: "outgoing",
        conversationId: conversation.id,
        remoteUserId: remoteId,
        localStream: null,
        remoteStream: null,
        muted: false,
        cameraOff: kind === "audio",
      };
      remoteBackendId.current = toApiId(remoteId);
      setCall(active);
      try {
        // Ring immediately so the recipient is alerted even while the caller
        // is responding to the browser microphone/camera permission prompt.
        await sendSignal({
          callId: active.id,
          ...active,
          toUserId: remoteBackendId.current,
          signalType: "ring",
          kind,
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: kind === "video",
        });
        localStreamRef.current = stream;
        setCall((current) => (current ? { ...current, localStream: stream } : current));
        const peer = createPeer(active);
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await sendSignal({
          callId: active.id,
          ...active,
          toUserId: remoteBackendId.current,
          signalType: "offer",
          kind,
          payload: offer,
        });
        // WebSocket delivery can race a freshly opened recipient session.
        // Retry the invitation while the caller is still waiting for an answer.
        for (const delay of [1000, 3000]) {
          window.setTimeout(() => {
            if (callRef.current?.id !== id || callRef.current.status !== "calling") return;
            void sendSignal({
              callId: active.id,
              ...active,
              toUserId: remoteBackendId.current,
              signalType: "ring",
              kind,
            });
            void sendSignal({
              callId: active.id,
              ...active,
              toUserId: remoteBackendId.current,
              signalType: "offer",
              kind,
              payload: offer,
            });
          }, delay);
        }
      } catch (error) {
        await sendSignal({
          callId: active.id,
          ...active,
          toUserId: remoteBackendId.current,
          signalType: "hangup",
          kind,
        }).catch(() => undefined);
        setCall((current) =>
          current ? { ...current, status: "failed", error: callError(error) } : current,
        );
        closePeer();
      }
    },
    [closePeer, createPeer, sendSignal, userId],
  );

  const acceptCall = useCallback(async () => {
    const active = callRef.current;
    if (!active || active.direction !== "incoming") return;
    try {
      setCall((current) => (current ? { ...current, status: "connecting" } : current));
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: active.kind === "video",
      });
      localStreamRef.current = stream;
      setCall((current) => (current ? { ...current, localStream: stream } : current));
      const peer = createPeer(active);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      if (pendingOffer.current) {
        await peer.setRemoteDescription(pendingOffer.current);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal({
          callId: active.id,
          ...active,
          toUserId: remoteBackendId.current,
          signalType: "answer",
          kind: active.kind,
          payload: answer,
        });
        await flushCandidates(peer);
      }
      await sendSignal({
        callId: active.id,
        ...active,
        toUserId: remoteBackendId.current,
        signalType: "accept",
        kind: active.kind,
      });
    } catch (error) {
      await sendSignal({
        callId: active.id,
        conversationId: active.conversationId,
        toUserId: remoteBackendId.current,
        signalType: "reject",
        kind: active.kind,
      }).catch(() => undefined);
      closePeer();
      setCall((current) =>
        current ? { ...current, status: "failed", error: callError(error) } : current,
      );
    }
  }, [closePeer, createPeer, flushCandidates, sendSignal]);

  const rejectCall = useCallback(async () => {
    const active = callRef.current;
    if (!active) return;
    await sendSignal({
      callId: active.id,
      ...active,
      toUserId: remoteBackendId.current,
      signalType: "reject",
      kind: active.kind,
    }).catch(() => undefined);
    await finish(false);
  }, [finish, sendSignal]);

  const toggleMute = useCallback(() => {
    const stream = callRef.current?.localStream;
    if (!stream) return;
    const next = !callRef.current?.muted;
    stream.getAudioTracks().forEach((track) => (track.enabled = !next));
    setCall((current) => (current ? { ...current, muted: next } : current));
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = callRef.current?.localStream;
    if (!stream || callRef.current?.kind !== "video") return;
    const next = !callRef.current?.cameraOff;
    stream.getVideoTracks().forEach((track) => (track.enabled = next));
    setCall((current) => (current ? { ...current, cameraOff: next } : current));
  }, []);

  useEffect(() => {
    if (!userId) return;
    return chatService.subscribeEvents((event: RealtimeEvent) => {
      if (event.event !== "call.signal" || !event.callId || !event.signalType || !event.fromUserId)
        return;
      if (event.signalType === "ring") {
        if (callRef.current) {
          if (callRef.current.id === event.callId && callRef.current.direction === "incoming")
            return;
          void sendSignal({
            callId: event.callId,
            conversationId: event.conversationId ?? "",
            toUserId: event.fromUserId,
            signalType: "busy",
            kind: event.kind ?? "video",
          });
          return;
        }
        remoteBackendId.current = event.fromUserId;
        setCall({
          id: event.callId,
          kind: event.kind ?? "video",
          status: "ringing",
          direction: "incoming",
          conversationId: event.conversationId ?? "",
          remoteUserId: event.fromUserId,
          localStream: null,
          remoteStream: null,
          muted: false,
          cameraOff: event.kind !== "video",
        });
        return;
      }
      if (event.signalType === "offer") {
        pendingOffer.current = event.payload as RTCSessionDescriptionInit;
        if (!callRef.current) {
          remoteBackendId.current = event.fromUserId;
          setCall({
            id: event.callId,
            kind: event.kind ?? "video",
            status: "ringing",
            direction: "incoming",
            conversationId: event.conversationId ?? "",
            remoteUserId: event.fromUserId,
            localStream: null,
            remoteStream: null,
            muted: false,
            cameraOff: event.kind !== "video",
          });
          return;
        }
        if (callRef.current.id !== event.callId) return;
        const active = callRef.current;
        const peer = peerRef.current;
        if (active.direction === "incoming" && peer && active.status === "connecting") {
          void peer
            .setRemoteDescription(pendingOffer.current)
            .then(async () => {
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await sendSignal({
                callId: active.id,
                ...active,
                toUserId: remoteBackendId.current,
                signalType: "answer",
                kind: active.kind,
                payload: answer,
              });
              await flushCandidates(peer);
            })
            .catch(() => undefined);
        }
        return;
      }
      if (event.signalType === "ice-candidate" && event.payload && !callRef.current) {
        pendingSignals.current.push({ type: "ice-candidate", payload: event.payload });
        return;
      }
      if (!callRef.current || callRef.current.id !== event.callId) return;
      if (event.signalType === "answer" && peerRef.current && event.payload) {
        void peerRef.current
          .setRemoteDescription(event.payload as RTCSessionDescriptionInit)
          .then(() => flushCandidates(peerRef.current!));
        setCall((current) => (current ? { ...current, status: "connecting" } : current));
      } else if (event.signalType === "ice-candidate" && event.payload) {
        if (peerRef.current?.remoteDescription)
          void peerRef.current
            .addIceCandidate(event.payload as RTCIceCandidateInit)
            .catch(() => undefined);
        else pendingSignals.current.push({ type: "ice-candidate", payload: event.payload });
      } else if (
        event.signalType === "reject" ||
        event.signalType === "busy" ||
        event.signalType === "hangup"
      ) {
        void finish(false);
      } else if (event.signalType === "accept") {
        setCall((current) => (current ? { ...current, status: "connecting" } : current));
      }
    });
  }, [finish, flushCandidates, sendSignal, userId]);

  useEffect(
    () => () => {
      void finish(false);
    },
    [finish],
  );

  return {
    call,
    startCall,
    acceptCall,
    rejectCall,
    hangup: () => finish(true),
    toggleMute,
    toggleCamera,
  };
}
