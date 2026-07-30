/* eslint-disable @typescript-eslint/no-explicit-any */
// Thin wrapper around @vladmandic/face-api (a maintained face-api.js fork).
// The library is imported lazily inside the browser so it never runs during SSR.

let faceapi: any = null;
let modelsLoaded = false;

// Model weight files live in /public/models (see public/models/README.md).
const MODEL_URL = "/models";

export async function loadFaceApi() {
  if (!faceapi) {
    faceapi = await import("@vladmandic/face-api");
  }
  if (!modelsLoaded) {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  }
  return faceapi;
}

// Detect the single most prominent face and return its 128-value descriptor.
// inputSize 416 (up from 320) noticeably improves detection of smaller / off-centre
// / less well-lit faces at a small speed cost — worth it for reliability.
export async function getDescriptor(
  input: HTMLVideoElement | HTMLImageElement
): Promise<Float32Array | null> {
  const fa = await loadFaceApi();
  const detection = await fa
    .detectSingleFace(input, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? detection.descriptor : null;
}

// Capture several descriptors from a live video and average them into one
// template. Averaging cancels per-frame noise (blink, motion, lighting flicker),
// producing a far more stable enrolment than a single snapshot. Falls back to a
// single sample if only one succeeds; returns null if no face is ever found.
export async function getAveragedDescriptor(
  input: HTMLVideoElement,
  samples = 5,
  gapMs = 180
): Promise<Float32Array | null> {
  const collected: Float32Array[] = [];
  for (let i = 0; i < samples; i++) {
    const d = await getDescriptor(input);
    if (d) collected.push(d);
    if (i < samples - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
  if (collected.length === 0) return null;
  if (collected.length === 1) return collected[0];
  const avg = new Float32Array(128);
  for (const d of collected) {
    for (let i = 0; i < 128; i++) avg[i] += d[i];
  }
  for (let i = 0; i < 128; i++) avg[i] /= collected.length;
  return avg;
}

export function euclideanDistance(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface KnownFaceLite {
  _id: string;
  name: string;
  relationship?: string;
  descriptor: number[];
}

export interface MatchResult {
  knownFaceId: string;
  name: string;
  relationship?: string;
  distance: number;
  confidence: number; // 0-100
}

// Nearest-neighbour match. Returns null if nothing is within the threshold
// (lower distance = more similar; ~0.6 is the usual face-api boundary).
export function findBestMatch(
  probe: Float32Array,
  known: KnownFaceLite[],
  threshold = 0.6
): MatchResult | null {
  let best: MatchResult | null = null;
  for (const k of known) {
    if (!k.descriptor || k.descriptor.length !== 128) continue;
    const distance = euclideanDistance(probe, k.descriptor);
    if (!best || distance < best.distance) {
      best = {
        knownFaceId: k._id,
        name: k.name,
        relationship: k.relationship,
        distance,
        confidence: Math.max(0, Math.min(100, Math.round((1 - distance) * 100))),
      };
    }
  }
  if (!best || best.distance > threshold) return null;
  return best;
}
