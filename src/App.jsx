import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const star1Ref = useRef(null);
  const star2Ref = useRef(null);

  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const trail1Ref = useRef([]);
  const trail2Ref = useRef([]);

  const gesture1Ref = useRef("Searching...");
  const gesture2Ref = useRef("Searching...");

  const [cameraOn, setCameraOn] = useState(false);
  const [handDetected, setHandDetected] = useState(false);

  const [gesture1, setGesture1] =
    useState("Searching...");

  const [gesture2, setGesture2] =
    useState("Searching...");

  useEffect(() => {
    startTracking();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  async function startTracking() {
    try {
      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

      handLandmarkerRef.current =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

              delegate: "GPU",
            },

            runningMode: "VIDEO",

            // TWO HANDS
            numHands: 2,

            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }
        );

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      setCameraOn(true);

      detectHands();
    } catch (error) {
      console.error(
        "Camera / MediaPipe error:",
        error
      );
    }
  }

  /* =================================
     GESTURE DETECTION
  ================================= */

  function getGesture(hand) {
    const indexOpen =
      hand[8].y < hand[6].y;

    const middleOpen =
      hand[12].y < hand[10].y;

    const ringOpen =
      hand[16].y < hand[14].y;

    const pinkyOpen =
      hand[20].y < hand[18].y;

    const fingersOpen =
      Number(indexOpen) +
      Number(middleOpen) +
      Number(ringOpen) +
      Number(pinkyOpen);

    if (fingersOpen >= 3) {
      return "Open Hand 🖐";
    }

    if (fingersOpen === 0) {
      return "Fist ✊";
    }

    if (
      fingersOpen === 1 &&
      indexOpen
    ) {
      return "Pointing ☝️";
    }

    return "Gesture";
  }

  /* =================================
     STAR BURST
  ================================= */

  function createStarBurst(starElement) {
    const container =
      document.getElementById(
        "burstContainer"
      );

    if (!container || !starElement) {
      return;
    }

    const x =
      starElement.offsetLeft;

    const y =
      starElement.offsetTop;

    // BIG EXPLOSION
    for (let i = 0; i < 100; i++) {
      const star =
        document.createElement("span");

      star.className = "burstStar";

      star.textContent = "★";

      const angle =
        (Math.PI * 2 * i) / 100;

      const distance =
        250 + Math.random() * 500;

      const endX =
        Math.cos(angle) * distance;

      const endY =
        Math.sin(angle) * distance;

      star.style.left =
        `${x}px`;

      star.style.top =
        `${y}px`;

      star.style.setProperty(
        "--x",
        `${endX}px`
      );

      star.style.setProperty(
        "--y",
        `${endY}px`
      );

      star.style.fontSize =
        `${14 + Math.random() * 30}px`;

      container.appendChild(star);

      setTimeout(() => {
        star.remove();
      }, 1400);
    }
  }

  /* =================================
     DRAW HAND
  ================================= */

  function drawHand(
    ctx,
    hand,
    canvas
  ) {
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],

      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],

      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12],

      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16],

      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20],

      [0, 17],
    ];

    ctx.lineWidth = 3;

    ctx.strokeStyle =
      "rgba(255, 210, 50, 0.85)";

    ctx.shadowColor =
      "rgba(255, 200, 40, 0.7)";

    ctx.shadowBlur = 6;

    connections.forEach(
      ([a, b]) => {
        const x1 =
          hand[a].x *
          canvas.width;

        const y1 =
          hand[a].y *
          canvas.height;

        const x2 =
          hand[b].x *
          canvas.width;

        const y2 =
          hand[b].y *
          canvas.height;

        ctx.beginPath();

        ctx.moveTo(x1, y1);

        ctx.lineTo(x2, y2);

        ctx.stroke();
      }
    );

    ctx.shadowBlur = 12;

    hand.forEach((point) => {
      const x =
        point.x *
        canvas.width;

      const y =
        point.y *
        canvas.height;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        8,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#ffffff";

      ctx.shadowColor =
        "rgba(255, 220, 80, 0.9)";

      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }

  /* =================================
     UPDATE STAR
  ================================= */

  function updateStar(
    starRef,
    hand,
    gesture,
    trailRef
  ) {
    if (!starRef.current) {
      return;
    }

    const fingertip =
      hand[8];

    const targetX =
      (1 - fingertip.x) * 100;

    const targetY =
      fingertip.y * 100;

    const currentX =
      parseFloat(
        starRef.current.dataset.x ||
          targetX
      );

    const currentY =
      parseFloat(
        starRef.current.dataset.y ||
          targetY
      );

    const smoothX =
      currentX +
      (targetX - currentX) *
        0.12;

    const smoothY =
      currentY +
      (targetY - currentY) *
        0.12;

    starRef.current.dataset.x =
      smoothX;

    starRef.current.dataset.y =
      smoothY;

    starRef.current.style.left =
      `${smoothX}%`;

    starRef.current.style.top =
      `${smoothY}%`;

    /* ONLY ONE FINGER SHOWS STAR */

    if (
      gesture === "Pointing ☝️"
    ) {
      starRef.current.style.opacity =
        "1";
    } else {
      starRef.current.style.opacity =
        "0";
    }

    /* STAR SIZE */

    let starSize = 65;

    if (
      gesture === "Open Hand 🖐"
    ) {
      starSize = 75;
    }

    if (
      gesture === "Fist ✊"
    ) {
      starSize = 50;
    }

    starRef.current.style.width =
      `${starSize}px`;

    starRef.current.style.height =
      `${starSize}px`;

    /* TRAIL */

    trailRef.current.push({
      x: fingertip.x,
      y: fingertip.y,
    });

    if (
      trailRef.current.length >
      25
    ) {
      trailRef.current.shift();
    }
  }

  /* =================================
     DRAW TRAIL
  ================================= */

  function drawTrail(
    ctx,
    canvas,
    trail
  ) {
    trail.forEach(
      (point, index) => {
        const x =
          point.x *
          canvas.width;

        const y =
          point.y *
          canvas.height;

        const progress =
          index / trail.length;

        const opacity =
          0.15 +
          progress * 0.85;

        ctx.save();

        ctx.globalAlpha =
          opacity;

        ctx.fillStyle =
          "#ffd83d";

        ctx.shadowColor =
          "#ffd83d";

        ctx.shadowBlur = 12;

        ctx.font =
          "22px Arial";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          "★",
          x,
          y
        );

        ctx.restore();
      }
    );
  }

  /* =================================
     MAIN DETECTION
  ================================= */

  function detectHands() {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !handLandmarkerRef.current
    ) {
      animationRef.current =
        requestAnimationFrame(
          detectHands
        );

      return;
    }

    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext("2d");

    if (video.readyState < 2) {
      animationRef.current =
        requestAnimationFrame(
          detectHands
        );

      return;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const results =
      handLandmarkerRef.current.detectForVideo(
        video,
        performance.now()
      );

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const hands =
      results.landmarks || [];

    /* =================================
       HAND 1
    ================================= */

    if (hands.length >= 1) {
      const hand1 =
        hands[0];

      const newGesture1 =
        getGesture(hand1);

      if (
        gesture1Ref.current !==
        newGesture1
      ) {
        const previous =
          gesture1Ref.current;

        gesture1Ref.current =
          newGesture1;

        setGesture1(
          newGesture1
        );

        if (
          newGesture1 ===
            "Open Hand 🖐" &&
          previous !==
            "Open Hand 🖐"
        ) {
          createStarBurst(
            star1Ref.current
          );
        }
      }

      updateStar(
        star1Ref,
        hand1,
        newGesture1,
        trail1Ref
      );

      drawHand(
        ctx,
        hand1,
        canvas
      );

      drawTrail(
        ctx,
        canvas,
        trail1Ref.current
      );
    } else {
      star1Ref.current.style.opacity =
        "0";

      trail1Ref.current = [];

      gesture1Ref.current =
        "Searching...";

      setGesture1(
        "Searching..."
      );
    }

    /* =================================
       HAND 2
    ================================= */

    if (hands.length >= 2) {
      const hand2 =
        hands[1];

      const newGesture2 =
        getGesture(hand2);

      if (
        gesture2Ref.current !==
        newGesture2
      ) {
        const previous =
          gesture2Ref.current;

        gesture2Ref.current =
          newGesture2;

        setGesture2(
          newGesture2
        );

        if (
          newGesture2 ===
            "Open Hand 🖐" &&
          previous !==
            "Open Hand 🖐"
        ) {
          createStarBurst(
            star2Ref.current
          );
        }
      }

      updateStar(
        star2Ref,
        hand2,
        newGesture2,
        trail2Ref
      );

      drawHand(
        ctx,
        hand2,
        canvas
      );

      drawTrail(
        ctx,
        canvas,
        trail2Ref.current
      );
    } else {
      star2Ref.current.style.opacity =
        "0";

      trail2Ref.current = [];

      gesture2Ref.current =
        "Searching...";

      setGesture2(
        "Searching..."
      );
    }

    setHandDetected(
      hands.length > 0
    );

    /* =================================
       NEXT FRAME
    ================================= */

    animationRef.current =
      requestAnimationFrame(
        detectHands
      );
  }

  return (
    <div className="app">

      {/* CAMERA */}

      <video
        ref={videoRef}
        className="camera"
        autoPlay
        playsInline
        muted
      />

      {/* CANVAS */}

      <canvas
        ref={canvasRef}
        className="trackingCanvas"
      />

      {/* =========================
          STAR 1
      ========================= */}

      <div
        ref={star1Ref}
        className="star"
      >
        <span className="starSymbol">
          ★
        </span>

        <span className="sparkle sparkle1">
          ✦
        </span>

        <span className="sparkle sparkle2">
          ✦
        </span>

        <span className="sparkle sparkle3">
          ✦
        </span>

        <span className="sparkle sparkle4">
          ✦
        </span>
      </div>

      {/* =========================
          STAR 2
      ========================= */}

      <div
        ref={star2Ref}
        className="star secondStar"
      >
        <span className="starSymbol">
          ★
        </span>

        <span className="sparkle sparkle1">
          ✦
        </span>

        <span className="sparkle sparkle2">
          ✦
        </span>

        <span className="sparkle sparkle3">
          ✦
        </span>

        <span className="sparkle sparkle4">
          ✦
        </span>
      </div>

      {/* BURST */}

      <div
        id="burstContainer"
        className="burstContainer"
      />

      {/* =========================
          TOP PANEL
      ========================= */}

      <div className="topPanel">

        <div className="brand">
          ✦ STAR TRACKER
        </div>

        <div className="statusRow">

          <span
            className={
              cameraOn
                ? "statusDot active"
                : "statusDot"
            }
          />

          <span>
            Camera
          </span>

          <strong>
            {cameraOn
              ? "ON"
              : "OFF"}
          </strong>

        </div>

        <div className="panelLine" />

        <div className="featureRow">

          <span>
            Two Stars
          </span>

          <strong>
            ON
          </strong>

        </div>

        <div className="panelLine" />

        <div className="featureRow">

          <span>
            Two Hands
          </span>

          <strong>
            ON
          </strong>

        </div>

      </div>

      {/* =========================
          GESTURE PANEL
      ========================= */}

      <div className="gesturePanel">

        <h2>
          ✨ Two Hand Tracker
        </h2>

        <div className="currentGesture">
          Hand 1:
          <strong>
            {gesture1}
          </strong>
        </div>

        <div className="currentGesture">
          Hand 2:
          <strong>
            {gesture2}
          </strong>
        </div>

        <ul>
          <li>
            ☝️ Point → Star
          </li>

          <li>
            🖐 Open → Explosion
          </li>

          <li>
            ✊ Fist → Hide
          </li>
        </ul>

      </div>

      {/* =========================
          BOTTOM STATUS
      ========================= */}

      <div className="bottomStatus">

        <span>
          {handDetected
            ? "✓ Hand detected"
            : "○ Searching for hands"}
        </span>

        <span>
          Two Hand Tracking
        </span>

        <span>
          Landmarks: 21 × 2
        </span>

      </div>

    </div>
  );
}

export default App;