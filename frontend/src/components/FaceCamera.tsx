import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';

interface FaceCameraProps {
    onCapture: (descriptor: Float32Array) => void;
    mode: 'REGISTER' | 'ATTENDANCE';
}

const FaceCamera: React.FC<FaceCameraProps> = ({ onCapture, mode }) => {
    const webcamRef = useRef<Webcam>(null);
    const [status, setStatus] = useState('Loading AI Models...');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [livenessConfirmed, setLivenessConfirmed] = useState(false);
    const [, setBlinkCount] = useState(0);
    const [detectionHistory, setDetectionHistory] = useState<number[]>([]);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                if (mode === 'REGISTER') {
                    setStatus('Look at camera and BLINK to verify you are real');
                } else {
                    setStatus('Look at camera and BLINK to verify attendance');
                }
            } catch (err) {
                console.error(err);
                setStatus('Failed to load AI models. Check internet.');
            }
        };
        loadModels();
    }, [mode]);

    const detect = async () => {
        if (webcamRef.current && webcamRef.current.video?.readyState === 4) {
            const video = webcamRef.current.video;

            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length > 0) {
                const face = detections[0];
                const landmarks = face.landmarks;
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                const leftEAR = getEAR(leftEye);
                const rightEAR = getEAR(rightEye);
                const avgEAR = (leftEAR + rightEAR) / 2;

                // Track EAR history for motion detection
                setDetectionHistory(prev => {
                    const newHistory = [...prev, avgEAR];
                    // Keep only last 15 frames (3 seconds at 200ms intervals)
                    return newHistory.slice(-15);
                });

                // ENHANCED LIVENESS DETECTION
                if (!livenessConfirmed && detectionHistory.length >= 10) {
                    // 1. Check for BLINK (eyes closed)
                    const isBlinking = avgEAR < 0.22;

                    // 2. Check for MOTION VARIANCE (real faces move slightly, videos don't)
                    const variance = calculateVariance(detectionHistory);
                    const hasMotion = variance > 0.002; // Real faces have natural micro-movements

                    // 3. Check for BLINK PATTERN (must have open->closed->open transition)
                    const hasBlinkPattern = checkBlinkPattern(detectionHistory);

                    if (isBlinking && hasBlinkPattern && hasMotion) {
                        setBlinkCount(prev => prev + 1);
                        setStatus('✓ Liveness Verified! Capturing...');
                        setLivenessConfirmed(true);

                        setTimeout(() => {
                            capture(face.descriptor);
                        }, 300);
                    } else if (!hasMotion) {
                        setStatus('⚠️ Please move your head slightly - No motion detected');
                    } else if (!hasBlinkPattern) {
                        setStatus('👁️ Please BLINK naturally to verify');
                    }
                } else if (detectionHistory.length < 10) {
                    setStatus('Analyzing... Please look at camera');
                }
            } else {
                setStatus('❌ No face detected - Please position yourself');
            }
        }
    };

    const capture = (descriptor: Float32Array) => {
        onCapture(descriptor);
    };

    // Helper: Eye Aspect Ratio
    const getEAR = (eye: faceapi.Point[]) => {
        const A = dist(eye[1], eye[5]);
        const B = dist(eye[2], eye[4]);
        const C = dist(eye[0], eye[3]);
        return (A + B) / (2.0 * C);
    };

    const dist = (p1: faceapi.Point, p2: faceapi.Point) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };

    // Calculate variance to detect motion
    const calculateVariance = (values: number[]) => {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    };

    // Check for blink pattern (open -> closed -> open)
    const checkBlinkPattern = (earHistory: number[]) => {
        if (earHistory.length < 8) return false;

        const recent = earHistory.slice(-8);
        const openThreshold = 0.25;
        const closedThreshold = 0.20;

        // Look for pattern: open eyes -> closed eyes -> open eyes
        let hasOpenBefore = false;
        let hasClosed = false;
        let hasOpenAfter = false;

        for (let i = 0; i < recent.length; i++) {
            if (!hasOpenBefore && recent[i] > openThreshold) {
                hasOpenBefore = true;
            } else if (hasOpenBefore && !hasClosed && recent[i] < closedThreshold) {
                hasClosed = true;
            } else if (hasClosed && !hasOpenAfter && recent[i] > openThreshold) {
                hasOpenAfter = true;
                break;
            }
        }

        return hasOpenBefore && hasClosed && hasOpenAfter;
    };

    useEffect(() => {
        let interval: any;
        if (modelsLoaded && !livenessConfirmed) {
            interval = setInterval(() => {
                detect();
            }, 200);
        }
        return () => clearInterval(interval);
    }, [modelsLoaded, livenessConfirmed, detectionHistory]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative rounded-lg overflow-hidden shadow-lg bg-black">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user' }}
                    className="w-full h-64 md:h-96 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 flex flex-col items-center">
                    <p className="text-sm font-bold mb-2">{status}</p>
                    {modelsLoaded && (
                        <button
                            onClick={async () => {
                                if (webcamRef.current?.video) {
                                    const detections = await faceapi.detectAllFaces(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks()
                                        .withFaceDescriptors();
                                    if (detections.length > 0) {
                                        capture(detections[0].descriptor);
                                    } else {
                                        setStatus('No face detected for manual capture');
                                    }
                                }
                            }}
                            className="bg-blue-600 px-4 py-1 rounded text-sm hover:bg-blue-700"
                        >
                            Manual Capture (Force)
                        </button>
                    )}
                </div>
            </div>
            <p className="mt-4 text-gray-500 text-sm text-center">
                {mode === 'REGISTER'
                    ? "🔒 Security: Blink naturally + slight head movement required"
                    : "🔒 Anti-spoofing: Blink to verify you're real"}
            </p>
        </div>
    );
};

export default FaceCamera;
