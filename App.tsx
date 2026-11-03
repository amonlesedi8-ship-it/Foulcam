import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { useVideoPlayer, VideoView } from "expo-video";

type MatchEvent = {
  id: string;
  time: number;
  label: string;
  kind: "FOUL" | "GOAL" | "YELLOW" | "RED" | "OFFSIDE";
};

const SPEEDS = [0.25, 0.5, 0.75, 1] as const;

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default function App() {
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  const player = useVideoPlayer(videoUri, (instance) => {
    instance.loop = false;
    instance.playbackRate = 1;
  });

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  async function askPermissions() {
    const camera = await requestCameraPermission();
    const microphone = await requestMicPermission();
    if (!camera.granted || !microphone.granted) {
      Alert.alert(
        "Permissions needed",
        "FoulCam needs camera and microphone access to record a match."
      );
    }
  }

  async function startRecording() {
    if (!cameraRef.current || !cameraReady || busy || recordingRef.current) return;

    setBusy(true);
    setEvents([]);
    setVideoUri(null);
    setElapsed(0);
    setSpeed(1);
    startTimeRef.current = Date.now();
    recordingRef.current = true;
    setRecording(true);
    setBusy(false);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 60 * 60 * 3,
        maxFileSize: 2_000_000_000,
      });
      if (result?.uri) {
        setVideoUri(result.uri);
      }
    } catch (error) {
      console.warn("Recording failed:", error);
      Alert.alert("Recording error", "The match could not be recorded. Please try again.");
    } finally {
      recordingRef.current = false;
      startTimeRef.current = null;
      setRecording(false);
    }
  }

  function stopRecording() {
    if (cameraRef.current && recordingRef.current) {
      cameraRef.current.stopRecording();
    }
  }

  function addEvent(kind: MatchEvent["kind"]) {
    const number = events.filter((event) => event.kind === kind).length + 1;
    const labels: Record<MatchEvent["kind"], string> = {
      FOUL: `Foul ${number}`,
      GOAL: `Goal ${number}`,
      YELLOW: `Yellow card ${number}`,
      RED: `Red card ${number}`,
      OFFSIDE: `Offside ${number}`,
    };
    setEvents((previous) => [
      ...previous,
      { id: `${Date.now()}-${previous.length}`, time: elapsed, label: labels[kind], kind },
    ]);
  }

  function seekTo(time: number) {
    if (!videoUri) return;
    player.currentTime = time;
    player.play();
  }

  function setPlaybackSpeed(value: number) {
    setSpeed(value);
    player.playbackRate = value;
  }

  function startNewMatch() {
    Alert.alert("Start a new match?", "The current replay and event list will be cleared.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New match",
        style: "destructive",
        onPress: () => {
          setVideoUri(null);
          setEvents([]);
          setElapsed(0);
          setSpeed(1);
          setCameraReady(false);
        },
      },
    ]);
  }

  if (!cameraPermission || !micPermission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={COLORS.blue} size="large" />
        <Text style={styles.muted}>Checking permissions…</Text>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.brand}>FOULCAM</Text>
        <Text style={styles.tagline}>MATCH RECORDING & INSTANT REPLAY</Text>
        <Text style={styles.permissionCopy}>
          Allow camera and microphone access so FoulCam can record your match.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={askPermissions}>
          <Text style={styles.buttonText}>ALLOW ACCESS</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FOULCAM</Text>
            <Text style={styles.tagline}>MATCH RECORDING & INSTANT REPLAY</Text>
          </View>
          <View style={[styles.statusPill, recording ? styles.livePill : styles.readyPill]}>
            <View style={[styles.statusDot, recording && styles.liveDot]} />
            <Text style={styles.statusText}>{recording ? "LIVE" : videoUri ? "REPLAY" : "READY"}</Text>
          </View>
        </View>

        {!videoUri ? (
          <View style={styles.cameraFrame}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="video"
              onCameraReady={() => setCameraReady(true)}
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.timerPill}>
                {recording && <View style={styles.recordDot} />}
                <Text style={styles.timerText}>{clock(elapsed)}</Text>
              </View>
              {!recording && (
                <Text style={styles.cameraHint}>
                  {cameraReady ? "CAMERA READY" : "STARTING CAMERA…"}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>MATCH REPLAY</Text>
              <Text style={styles.duration}>{clock(elapsed)}</Text>
            </View>
            <VideoView
              player={player}
              style={styles.video}
              nativeControls
              contentFit="contain"
              fullscreenOptions={{ enable: true }}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => player.play()}>
              <Text style={styles.buttonText}>▶  PLAY REPLAY</Text>
            </TouchableOpacity>
            <Text style={styles.smallLabel}>PLAYBACK SPEED</Text>
            <View style={styles.speedRow}>
              {SPEEDS.map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setPlaybackSpeed(value)}
                  style={[styles.speedButton, speed === value && styles.speedSelected]}
                >
                  <Text style={[styles.speedText, speed === value && styles.speedTextSelected]}>
                    {value}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.controlRow}>
          {!recording ? (
            <TouchableOpacity
              style={[styles.primaryButton, styles.startButton, (!cameraReady || busy || !!videoUri) && styles.disabled]}
              onPress={startRecording}
              disabled={!cameraReady || busy || !!videoUri}
            >
              <Text style={styles.buttonText}>{busy ? "PREPARING…" : "●  START MATCH"}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.eventAction, styles.foulAction]} onPress={() => addEvent("FOUL")}>
                <Text style={styles.buttonText}>⚑  FOUL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.eventAction, styles.stopAction]} onPress={stopRecording}>
                <Text style={styles.buttonText}>■  STOP</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {recording && (
          <View style={styles.quickEvents}>
            <Text style={styles.smallLabel}>QUICK MATCH EVENTS</Text>
            <View style={styles.quickGrid}>
              {([
                ["GOAL", "＋ GOAL"],
                ["YELLOW", "YELLOW CARD"],
                ["RED", "RED CARD"],
                ["OFFSIDE", "OFFSIDE"],
              ] as const).map(([kind, label]) => (
                <TouchableOpacity key={kind} style={styles.quickButton} onPress={() => addEvent(kind)}>
                  <Text style={styles.quickButtonText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.eventPanel}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>MATCH EVENTS</Text>
            <Text style={styles.eventCount}>{events.length} FLAGGED</Text>
          </View>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>No events yet. Flag an event while recording.</Text>
          ) : (
            [...events].reverse().map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRow}
                onPress={() => seekTo(event.time)}
                disabled={!videoUri}
              >
                <View style={styles.eventLeft}>
                  <View style={[styles.eventMarker, event.kind === "GOAL" && styles.goalMarker]} />
                  <View>
                    <Text style={styles.eventName}>{event.label}</Text>
                    <Text style={styles.eventType}>{event.kind}</Text>
                  </View>
                </View>
                <Text style={styles.eventTime}>{clock(event.time)}  ›</Text>
              </TouchableOpacity>
            ))
          )}
          {videoUri && events.length > 0 && (
            <Text style={styles.helperText}>Tap an event to jump to that moment in the replay.</Text>
          )}
        </View>

        {videoUri && (
          <TouchableOpacity style={styles.secondaryButton} onPress={startNewMatch}>
            <Text style={styles.secondaryButtonText}>＋  NEW MATCH</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.footer}>FOULCAM  •  REVIEW THE MOMENT</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  background: "#0B1020",
  panel: "#141C2E",
  panel2: "#1B263B",
  blue: "#3478F6",
  text: "#F5F7FB",
  muted: "#8996AE",
  red: "#F04452",
  border: "#29354B",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 34 },
  center: {
    flex: 1, backgroundColor: COLORS.background, alignItems: "center",
    justifyContent: "center", padding: 24,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  brand: { color: COLORS.text, fontSize: 29, fontWeight: "900", letterSpacing: 2 },
  tagline: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.6, marginTop: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  readyPill: { backgroundColor: "#1A2940" },
  livePill: { backgroundColor: "#3A1723" },
  statusDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: "#8DA0BB", marginRight: 6 },
  liveDot: { backgroundColor: COLORS.red },
  statusText: { color: COLORS.text, fontWeight: "800", fontSize: 10, letterSpacing: 1 },
  cameraFrame: { height: 255, borderRadius: 16, overflow: "hidden", backgroundColor: "#05070D" },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 12 },
  timerPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "#000B", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 },
  recordDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: COLORS.red, marginRight: 7 },
  timerText: { color: "#FFF", fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] },
  cameraHint: { alignSelf: "flex-end", color: "#FFF", backgroundColor: "#0009", padding: 7, borderRadius: 5, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  controlRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 12 },
  primaryButton: { backgroundColor: COLORS.blue, padding: 15, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 12 },
  startButton: { flex: 1, marginTop: 0, minHeight: 54 },
  disabled: { opacity: 0.45 },
  eventAction: { padding: 16, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  foulAction: { backgroundColor: COLORS.red, flex: 1.5 },
  stopAction: { backgroundColor: "#4A5568", flex: 1 },
  buttonText: { color: "#FFF", fontWeight: "900", letterSpacing: 0.6 },
  quickEvents: { backgroundColor: COLORS.panel, borderRadius: 14, padding: 14, marginBottom: 12 },
  smallLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 10, marginTop: 5 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickButton: { width: "48%", backgroundColor: COLORS.panel2, borderRadius: 8, padding: 12, alignItems: "center" },
  quickButtonText: { color: COLORS.text, fontWeight: "800", fontSize: 10 },
  panel: { backgroundColor: COLORS.panel, borderRadius: 15, padding: 13 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  duration: { color: COLORS.blue, fontWeight: "800" },
  video: { width: "100%", height: 220, backgroundColor: "#000", borderRadius: 10 },
  speedRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  speedButton: { flex: 1, backgroundColor: COLORS.panel2, paddingVertical: 11, borderRadius: 8, alignItems: "center" },
  speedSelected: { backgroundColor: COLORS.blue },
  speedText: { color: COLORS.muted, fontWeight: "800" },
  speedTextSelected: { color: "#FFF" },
  eventPanel: { backgroundColor: COLORS.panel, borderRadius: 14, padding: 14, marginTop: 5 },
  eventCount: { color: COLORS.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  emptyText: { color: COLORS.muted, fontSize: 12, paddingVertical: 14 },
  eventRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  eventLeft: { flexDirection: "row", alignItems: "center" },
  eventMarker: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.red, marginRight: 11 },
  goalMarker: { backgroundColor: "#36C98F" },
  eventName: { color: COLORS.text, fontWeight: "800", fontSize: 12 },
  eventType: { color: COLORS.muted, fontSize: 9, marginTop: 3, letterSpacing: 1 },
  eventTime: { color: "#79A8FF", fontWeight: "900", fontVariant: ["tabular-nums"] },
  helperText: { color: COLORS.muted, fontSize: 10, marginTop: 8 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: 10, alignItems: "center", marginTop: 14 },
  secondaryButtonText: { color: COLORS.text, fontWeight: "800", letterSpacing: 0.5 },
  permissionCopy: { color: COLORS.muted, textAlign: "center", lineHeight: 21, marginTop: 18, maxWidth: 290 },
  muted: { color: COLORS.muted, marginTop: 12 },
  footer: { color: "#56647C", textAlign: "center", fontSize: 9, letterSpacing: 2, marginTop: 22 },
});
