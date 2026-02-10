import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import peer from "../services/peer";

export default function Room() {
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const socket = useSocket();

  // Helper: Adds tracks without duplicates
  const addTracksToPeer = useCallback((stream) => {
    stream.getTracks().forEach((track) => {
      const senders = peer.peer.getSenders();
      const alreadyExists = senders.find((s) => s.track === track);
      if (!alreadyExists) {
        peer.peer.addTrack(track, stream);
      }
    });
  }, []);

  // Handler: User Joined
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log("User joined:", { email, id });
    setSocketId(id);
  }, []);

  // Handler: Initiation of Call
  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setMyStream(stream);
    addTracksToPeer(stream);

    const offer = await peer.getOffer();
    socket.emit("call:user", { to: socketId, offer });
  }, [socket, socketId, addTracksToPeer]);

  // Handler: Incoming Call
  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream(stream);
      addTracksToPeer(stream);

      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket, addTracksToPeer],
  );

  // Handler: Call Accepted
  const handleCallAccepted = useCallback(async ({ from, ans }) => {
    // Only set description if we are expecting an answer
    if (peer.peer.signalingState === "have-local-offer") {
      await peer.setLocalDescription(ans);
      console.log("Call accepted and connection stabilized");
    }
  }, []);

  // Negotiation Logic
  const handleNegoNeeded = useCallback(async () => {
    // Crucial fix: Only trigger negotiation if state is stable
    if (peer.peer.signalingState !== "stable") return;

    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: socketId });
  }, [socket, socketId]);

  const handleNegoNeededIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket],
  );

  const handleNegoDone = useCallback(async ({ ans }) => {
    if (peer.peer.signalingState === "have-local-offer") {
      await peer.setLocalDescription(ans);
    }
  }, []);

  // Sockets Listeners
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeededIncomming);
    socket.on("peer:nego:done", handleNegoDone);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeededIncomming);
      socket.off("peer:nego:done", handleNegoDone);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeededIncomming,
    handleNegoDone,
  ]);

  // Peer Listeners (Track and Negotiation)
  useEffect(() => {
    const handleTrack = (ev) => {
      setRemoteStream(ev.streams[0]);
    };

    peer.peer.addEventListener("track", handleTrack);
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);

    return () => {
      peer.peer.removeEventListener("track", handleTrack);
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  // Video Ref Updates
  useEffect(() => {
    if (myVideoRef.current && myStream) myVideoRef.current.srcObject = myStream;
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream)
      remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.roomStatus}>
          {remoteStream
            ? "● Live Connection"
            : socketId
              ? "User Online"
              : "Waiting for Peer..."}
        </span>
      </div>

      <div style={styles.videoGrid}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={styles.remoteVideo}
          />
        ) : (
          <div style={styles.placeholder}>
            <h2>
              {socketId ? "Ready to Connect" : "Waiting for someone to join..."}
            </h2>
          </div>
        )}

        {myStream && (
          <div style={styles.myVideoWrapper}>
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              style={styles.myVideo}
            />
            <div style={styles.label}>You</div>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        {!remoteStream && socketId && (
          <button onClick={handleCallUser} style={styles.btnPrimary}>
            Start Call
          </button>
        )}
        <div style={styles.iconGroup}>
          <button style={styles.roundBtn}>🎤</button>
          <button style={styles.roundBtn}>📷</button>
          <button style={{ ...styles.roundBtn, backgroundColor: "#ff4d4d" }}>
            📞
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#3c3c3c",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    color: "white",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
  },
  header: { padding: "20px", position: "absolute", top: 0, zIndex: 10 },
  roomStatus: {
    background: "rgba(0,0,0,0.6)",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    border: "1px solid #555",
  },
  videoGrid: {
    flex: 1,
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
  },
  remoteVideo: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: { textAlign: "center", color: "#888" },
  myVideoWrapper: {
    position: "absolute",
    bottom: "100px",
    right: "30px",
    width: "240px",
    height: "150px",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    border: "2px solid #004a77",
    backgroundColor: "#000",
  },
  myVideo: { width: "100%", height: "100%", objectFit: "cover" },
  label: {
    position: "absolute",
    bottom: "5px",
    left: "10px",
    fontSize: "11px",
    background: "rgba(0,0,0,0.5)",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  controls: {
    height: "90px",
    backgroundColor: "rgba(30, 30, 30, 0.9)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    zIndex: 100,
  },
  btnPrimary: {
    backgroundColor: "#004a77",
    color: "white",
    border: "none",
    padding: "12px 28px",
    borderRadius: "30px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  iconGroup: { display: "flex", gap: "15px" },
  roundBtn: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#4a4a4a",
    color: "white",
    cursor: "pointer",
    fontSize: "1.2rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
