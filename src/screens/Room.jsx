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

  // useEffect For Video Stream
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  // Call User Handler
  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setMyStream(stream);

    stream.getTracks().forEach((track) => {
      peer.peer.addTrack(track, stream);
    });

    const offer = await peer.getOffer();
    socket.emit("call:user", { to: socketId, offer });
  }, [socket, socketId]);

  // User Joined Handler
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log("User joined:", { email, id });
    setSocketId(id);
  }, []);

  // Incomming Call Handler
  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });

      setMyStream(stream);
    },
    [socket],
  );

  const sendStreams = useCallback(() => {
    if (!myStream) return;

    myStream.getTracks().forEach((track) => {
      const alreadyExists = peer.peer
        .getSenders()
        .find((s) => s.track === track);
      if (!alreadyExists) {
        peer.peer.addTrack(track, myStream);
      }
    });
  }, [myStream]);

  // Call Accepted Handler
  const handleCallAccepted = useCallback(
    async ({ from, ans }) => {
      await peer.setLocalDescription(ans);
      console.log("Call accepted by:", from);

      sendStreams();
    },
    [sendStreams],
  );

  const handleNegoNeededIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket],
  );

  const handleNegoDone = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  // useEffect For Sockets
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
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeededIncomming,
    handleNegoDone,
    socket,
  ]);

  // useEffect For Remote Stream
  useEffect(() => {
    const handleTrack = (ev) => {
      const [stream] = ev.streams;
      setRemoteStream(stream);
    };

    peer.peer.addEventListener("track", handleTrack);

    return () => {
      peer.peer.removeEventListener("track", handleTrack);
    };
  }, []);

  // useEffect For Remote Video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Negotiation Needed Handler
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: socketId });
  }, [socket, socketId]);

  // useEffect For Negotiation Needed
  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);

    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded, socket, socketId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #3c3c3c 0%, #2a2a2a 100%)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#ffffff",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 30px",
          background: "rgba(0, 74, 119, 0.2)",
          borderRadius: "16px",
          marginBottom: "30px",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 74, 119, 0.3)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: "600",
            background: "linear-gradient(90deg, #ffffff 0%, #004a77 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        ></h1>

        <div style={{ display: "flex", gap: "12px" }}>
          {socketId && (
            <button
              onClick={handleCallUser}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #004a77 0%, #006ba8 100%)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(0, 74, 119, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(0, 74, 119, 0.6)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(0, 74, 119, 0.4)";
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Call User
            </button>
          )}

          {myStream && (
            <button
              onClick={sendStreams}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #00a86b 0%, #00c97d 100%)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(0, 168, 107, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(0, 168, 107, 0.6)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(0, 168, 107, 0.4)";
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              Send Stream
            </button>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: remoteStream
            ? "repeat(auto-fit, minmax(400px, 1fr))"
            : "1fr",
          gap: "24px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* My Stream */}
        {myStream && (
          <div
            style={{
              background: "rgba(60, 60, 60, 0.6)",
              borderRadius: "20px",
              overflow: "hidden",
              border: "2px solid rgba(0, 74, 119, 0.4)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              transition: "all 0.3s ease",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                zIndex: 10,
                background: "rgba(0, 74, 119, 0.9)",
                padding: "8px 16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#00ff88",
                  boxShadow: "0 0 10px #00ff88",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              ></div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                }}
              >
                You
              </span>
            </div>

            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                aspectRatio: "16/9",
                objectFit: "cover",
              }}
            />

            <div
              style={{
                padding: "16px",
                background:
                  "linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <button
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(10px)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.3)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.2)")
                }
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>

              <button
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(10px)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.3)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.2)")
                }
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Remote Stream */}
        {remoteStream && (
          <div
            style={{
              background: "rgba(60, 60, 60, 0.6)",
              borderRadius: "20px",
              overflow: "hidden",
              border: "2px solid rgba(0, 74, 119, 0.6)",
              boxShadow: "0 8px 32px rgba(0, 74, 119, 0.4)",
              transition: "all 0.3s ease",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                zIndex: 10,
                background: "rgba(0, 74, 119, 0.9)",
                padding: "8px 16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#00ff88",
                  boxShadow: "0 0 10px #00ff88",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              ></div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Remote User
              </span>
            </div>

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                aspectRatio: "16/9",
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!myStream && !remoteStream && (
        <div
          style={{
            maxWidth: "500px",
            margin: "60px auto",
            textAlign: "center",
            padding: "40px",
            background: "rgba(0, 74, 119, 0.1)",
            borderRadius: "20px",
            border: "2px dashed rgba(0, 74, 119, 0.3)",
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#004a77"
            strokeWidth="1.5"
            style={{ margin: "0 auto 20px" }}
          >
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <h2 style={{ color: "#ffffff", marginBottom: "12px" }}>
            Ready to Connect
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "15px" }}>
            Start a call to begin your video conversation
          </p>
        </div>
      )}

      <style>{`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `}</style>
    </div>
  );
}
