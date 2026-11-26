import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import Svg, {
  Rect,
  Circle,
  Line,
  Polygon,
  Path,
  G,
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import {
  X,
  Camera,
  Image as ImageIcon,
  Check,
  RotateCw,
  Printer,
  Share2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  Scissors,
  Layers,
  Award,
} from 'lucide-react-native';

import { Colors, Radii, Spacing, Typography } from '../constants/theme';
import { BentoCard } from '../components/BentoCard';
import {
  DEMO_SAMPLES,
  uploadScan,
  getJobStatus,
  triggerPolish,
  triggerCutoutSheet,
  API_BASE_URL,
} from '../services/api';
import {
  saveCreation,
  updateCreation,
  checkAndUnlockBadges,
  CreationItem,
  getPaperPreference,
} from '../services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STAGE_NAMES = ['Capture', 'Subject Lift', '3D Model', 'Unfold', 'Print PDF', 'Assembly'];

export default function WorkflowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sampleId?: string; creationId?: string; autoPick?: string }>();

  const [currentStage, setCurrentStage] = useState<number>(1);
  const [projectId, setProjectId] = useState<string>(`proj_${Date.now()}`);
  const [modelName, setModelName] = useState<string>('Custom Craft');
  const [category, setCategory] = useState<string>('Custom');
  const [edgeColorHex, setEdgeColorHex] = useState<string>('#F4C430');

  // Stage 1 (Capture)
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Stage 2 (Lift & Quality)
  const [cutoutUri, setCutoutUri] = useState<string | null>(null);
  const [solidity, setSolidity] = useState<number>(84);
  const [sharpness, setSharpness] = useState<number>(92);
  const [cropStatus, setCropStatus] = useState<string>('All edges clean');
  const [isPolishing, setIsPolishing] = useState<boolean>(false);

  // Stage 3 (3D Model)
  const [rotationAngle, setRotationAngle] = useState<number>(25);
  const [moldStyle, setMoldStyle] = useState<'block' | 'standee'>('block');
  const [heightCm, setHeightCm] = useState<number>(18);
  const [depthCm, setDepthCm] = useState<number>(2.5);

  // Stage 4 (Unfold)
  const [unfoldProgress, setUnfoldProgress] = useState<number>(0);
  const [isAutoUnfolding, setIsAutoUnfolding] = useState<boolean>(false);

  // Stage 5 (Print)
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [previewPage, setPreviewPage] = useState<1 | 2>(1);

  // Stage 6 (Build & Glue Timer)
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [glueTimerSec, setGlueTimerSec] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // PanResponder for Stage 3 3D Rotation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setRotationAngle((prev) => (prev + gestureState.vx * 4 + 360) % 360);
      },
    })
  ).current;

  // Initial load
  useEffect(() => {
    getPaperPreference().then(setPaperSize);

    if (params.sampleId) {
      const sample = DEMO_SAMPLES.find((s) => s.sampleId === params.sampleId) || DEMO_SAMPLES[0];
      loadSample(sample);
    } else if (params.autoPick === 'gallery') {
      pickFromGallery();
    }
  }, []);

  // Glue Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && glueTimerSec > 0) {
      interval = setInterval(() => {
        setGlueTimerSec((s) => s - 1);
      }, 1000);
    } else if (glueTimerSec === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Glue Bond Ready! ⏱️', 'The glue tabs have set firmly. Proceed to the next step.');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, glueTimerSec]);

  const loadSample = (sample: CreationItem) => {
    setSelectedSampleId(sample.sampleId || 'crossing');
    setModelName(sample.name);
    setCategory(sample.category);
    setEdgeColorHex(sample.edgeColorHex || '#F4C430');
    setHeightCm(sample.heightCm);
    setDepthCm(sample.depthCm);
    setMoldStyle(sample.moldStyle);
    setSolidity(sample.qualityMetrics?.solidity ? Math.round(sample.qualityMetrics.solidity * 100) : 85);
    setSharpness(sample.qualityMetrics?.sharpness ? Math.round(sample.qualityMetrics.sharpness) : 92);
  };

  // ── Stage 1 Actions ──────────────────────────────────────────────────────────

  const compressAndSetImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCapturedUri(manipResult.uri);
      setSelectedSampleId(null);
      setModelName('Photo Craft');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.warn('Compression failed:', err);
      setCapturedUri(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera access is required to take photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await compressAndSetImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Photo library access is required to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await compressAndSetImage(result.assets[0].uri);
    }
  };

  const confirmCaptureAndLift = async () => {
    if (!capturedUri && !selectedSampleId) {
      Alert.alert('Select Object', 'Please take a photo, choose an image, or pick a sample template.');
      return;
    }

    goToStage(2);

    if (capturedUri) {
      setIsProcessingUpload(true);
      try {
        const uploadRes = await uploadScan(capturedUri, 'image/jpeg', 'upload.jpg');
        setProjectId(uploadRes.project_id);

        let done = false;
        let attempts = 0;
        while (!done && attempts < 15) {
          await new Promise((r) => setTimeout(r, 1000));
          const job = await getJobStatus(uploadRes.job_id);
          if (job.status === 'done') {
            done = true;
            setCutoutUri(`${API_BASE_URL}/api/v1/projects/${uploadRes.project_id}/trimmed`);
          } else if (job.status === 'failed') {
            done = true;
            console.warn('Backend job failed, using fallback.');
          }
          attempts++;
        }
      } catch (err) {
        console.warn('Backend offline or failed, using local demo lift:', err);
      } finally {
        setIsProcessingUpload(false);
      }
    }
  };

  // ── Stage 2 Actions ──────────────────────────────────────────────────────────

  const handlePolish = async () => {
    setIsPolishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await triggerPolish(projectId, ['bottom']);
      setCropStatus('Healed & Outpainted');
      Alert.alert('✨ AI Outpainted', 'Edges expanded and background halo cleaned with Gemini 3.1 Flash.');
    } catch {
      Alert.alert('AI Edge Polish', 'Edge polish simulation complete.');
    } finally {
      setIsPolishing(false);
    }
  };

  // ── Stage Navigation ─────────────────────────────────────────────────────────

  const goToStage = async (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStage(next);
    await checkAndUnlockBadges(next);

    // Save project state
    await saveCreation({
      id: projectId,
      name: modelName,
      category,
      status: next === 6 ? 'Building' : 'Ready',
      buildStep: completedSteps.length,
      totalSteps: 7,
      moldStyle,
      heightCm,
      depthCm,
      sampleId: selectedSampleId,
      updatedAt: Date.now(),
      edgeColorHex,
    });
  };

  // ── Stage 5 Print Actions ────────────────────────────────────────────────────

  const generatePrintHtml = (): string => {
    const isA4 = paperSize === 'A4';
    const pageW = isA4 ? '210mm' : '215.9mm';
    const pageH = isA4 ? '297mm' : '279.4mm';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: ${pageW} ${pageH}; margin: 0; }
            body { margin: 0; padding: 12mm; font-family: sans-serif; background: #fff; box-sizing: border-box; }
            .sheet { width: 100%; height: 100%; position: relative; border: 1px dashed #ccc; box-sizing: border-box; padding: 8mm; page-break-after: always; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 4mm; margin-bottom: 6mm; }
            .title { font-size: 16pt; font-weight: bold; }
            .meta { font-size: 9pt; color: #555; }
            .ruler { border: 1.5px solid #000; background: #FFF9C4; padding: 3mm; width: 50mm; text-align: center; font-size: 8pt; font-weight: bold; }
            .ruler-ticks { display: flex; justify-content: space-between; border-bottom: 1.5px solid #000; height: 5mm; margin-bottom: 2mm; }
            .cutout-box { border: 2px solid #E63946; background: #FAFAFA; display: flex; align-items: center; justify-content: center; height: 130mm; margin: 6mm 0; position: relative; }
            .label { font-size: 10pt; font-weight: bold; color: #333; }
            .circle { width: 8mm; height: 8mm; border-radius: 50%; background: #3B78F0; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8pt; position: absolute; }
            .stand-box { border: 2px solid #E63946; width: 88mm; height: 36mm; margin: 4mm auto; position: relative; display: flex; align-items: center; justify-content: center; }
            .fold-line { position: absolute; top: 18mm; left: 0; right: 0; border-top: 2px dashed #3B78F0; }
            .tab-row { border: 1.5px dashed #3B78F0; background: #FDE7E9; height: 26mm; margin: 8mm 0; position: relative; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <!-- PAGE 1: Front, Mirrored Back & Stand -->
          <div class="sheet">
            <div class="header">
              <div>
                <div class="title">FOLDLY: ${modelName.toUpperCase()}</div>
                <div class="meta">${category} • Height: ${heightCm} cm • Paper: ${paperSize} (180–220 gsm)</div>
              </div>
              <div class="ruler">
                <div class="ruler-ticks">
                  <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                </div>
                50 mm Physical Calibration Check
              </div>
            </div>

            <div style="display: flex; gap: 8mm;">
              <div class="cutout-box" style="flex: 1;">
                <div class="label">FRONT SILHOUETTE (Solid Red Cut Line)</div>
                <div class="circle" style="top: 4mm; left: 4mm;">1</div>
                <div class="circle" style="bottom: 4mm; right: 4mm;">2</div>
              </div>
              <div class="cutout-box" style="flex: 1;">
                <div class="label">MIRRORED BACK SILHOUETTE</div>
                <div class="circle" style="top: 4mm; right: 4mm;">1</div>
                <div class="circle" style="bottom: 4mm; left: 4mm;">2</div>
              </div>
            </div>

            <div class="stand-box">
              <div class="fold-line"></div>
              <div class="label">FOLD-OUT DESK STAND (Valley Fold Center)</div>
            </div>
          </div>

          <!-- PAGE 2: Exact-Perimeter Side Depth Strip -->
          <div class="sheet">
            <div class="header">
              <div>
                <div class="title">SIDE DEPTH STRIPS & GLUE TABS</div>
                <div class="meta">Depth: ${depthCm} cm • Cut red outer lines • Score blue dashed fold lines</div>
              </div>
            </div>

            <div class="tab-row">
              <div class="circle" style="left: 10mm;">1</div>
              <div class="label">GUSSET STRIP ROW A (Glue to Front Face First)</div>
              <div class="circle" style="right: 10mm;">2</div>
            </div>

            <div class="tab-row">
              <div class="circle" style="left: 10mm;">1</div>
              <div class="label">GUSSET STRIP ROW B (Seal With Mirrored Back)</div>
              <div class="circle" style="right: 10mm;">2</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintPdf = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = generatePrintHtml();
      await Print.printAsync({ html });
      await checkAndUnlockBadges(5);
    } catch (err) {
      console.warn('Print failed:', err);
    }
  };

  const handleSharePdf = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = generatePrintHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Foldly - ${modelName}.pdf`,
      });
      await checkAndUnlockBadges(5);
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  // ── Stage 6 Actions ──────────────────────────────────────────────────────────

  const toggleStep = (stepNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedSteps((prev) =>
      prev.includes(stepNum) ? prev.filter((s) => s !== stepNum) : [...prev, stepNum]
    );
  };

  const startGlueTimer = () => {
    setGlueTimerSec(20);
    setIsTimerRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleFinishCraft = async () => {
    await updateCreation(projectId, { status: 'Built', buildStep: 7 });
    await checkAndUnlockBadges(6, 'Built');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '🎉 Craft Complete!',
      `Congratulations! "${modelName}" is now finished and placed in your physical gallery. You unlocked the Master Folder badge!`,
      [
        {
          text: 'View Gallery',
          onPress: () => router.replace('/creations'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Workflow Stepper Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <X size={20} color={Colors.ink} />
        </TouchableOpacity>

        <View style={styles.stepperCenter}>
          <Text style={styles.stageTitle}>
            Stage {currentStage}/6: {STAGE_NAMES[currentStage - 1]}
          </Text>
          <View style={styles.stepDotsRow}>
            {[1, 2, 3, 4, 5, 6].map((st) => (
              <View
                key={st}
                style={[
                  styles.stepDot,
                  st === currentStage
                    ? styles.stepDotActive
                    : st < currentStage
                    ? styles.stepDotCompleted
                    : null,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── STAGE 1: CAPTURE ────────────────────────────────────────────── */}
        {currentStage === 1 && (
          <View>
            <View style={styles.captureFrame}>
              {/* Corner guide brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {capturedUri ? (
                <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
              ) : selectedSampleId ? (
                <View style={styles.sampleDisplay}>
                  <Text style={{ fontSize: 72 }}>
                    {selectedSampleId === 'crossing'
                      ? '🚸'
                      : selectedSampleId === 'sneaker'
                      ? '👟'
                      : selectedSampleId === 'fox'
                      ? '🦊'
                      : '🧋'}
                  </Text>
                  <Text style={styles.sampleDisplayName}>{modelName}</Text>
                  <Text style={styles.sampleDisplayCategory}>{category} • 180 gsm</Text>
                </View>
              ) : (
                <View style={styles.emptyCaptureNotice}>
                  <Camera size={44} color={Colors.ruler} strokeWidth={1.5} />
                  <Text style={styles.captureInstructions}>
                    Position subject in good lighting against a plain background
                  </Text>
                </View>
              )}
            </View>

            {/* Quick-Pick Samples */}
            <Text style={styles.sectionLabel}>Or Pick a Ready-Made Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.samplePickerRow}>
              {DEMO_SAMPLES.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => loadSample(s)}
                  style={[
                    styles.sampleChip,
                    selectedSampleId === s.sampleId && styles.sampleChipActive,
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>
                    {s.sampleId === 'crossing'
                      ? '🚸'
                      : s.sampleId === 'sneaker'
                      ? '👟'
                      : s.sampleId === 'fox'
                      ? '🦊'
                      : '🧋'}
                  </Text>
                  <Text style={styles.sampleChipText}>{s.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={takePhoto} style={styles.btnSecondary}>
                <Camera size={18} color={Colors.ink} />
                <Text style={styles.btnSecondaryText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={pickFromGallery} style={styles.btnSecondary}>
                <ImageIcon size={18} color={Colors.ink} />
                <Text style={styles.btnSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={confirmCaptureAndLift} style={styles.btnPrimary}>
              <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.btnGradient}>
                <Text style={styles.btnPrimaryText}>Confirm & Lift Subject</Text>
                <ArrowRight size={18} color="#0D1210" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STAGE 2: SUBJECT LIFT & QUALITY ──────────────────────────────── */}
        {currentStage === 2 && (
          <View>
            <BentoCard title="Neural Subject Lift" subtitle="Clean background isolation & metrics">
              <View style={styles.cutoutCheckerboard}>
                {cutoutUri ? (
                  <Image source={{ uri: cutoutUri }} style={styles.cutoutImg} resizeMode="contain" />
                ) : (
                  <View style={styles.cutoutPlaceholder}>
                    <Text style={{ fontSize: 80 }}>
                      {selectedSampleId === 'crossing'
                        ? '🚸'
                        : selectedSampleId === 'sneaker'
                        ? '👟'
                        : selectedSampleId === 'fox'
                        ? '🦊'
                        : '🧋'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{solidity}%</Text>
                  <Text style={styles.metricLabel}>Solidity</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{sharpness}</Text>
                  <Text style={styles.metricLabel}>Edge Crisp</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { fontSize: 13 }]}>{cropStatus}</Text>
                  <Text style={styles.metricLabel}>Crop Status</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handlePolish}
                disabled={isPolishing}
                style={styles.polishBtn}
              >
                <Sparkles size={16} color={Colors.ruler} />
                <Text style={styles.polishBtnText}>
                  {isPolishing ? 'Outpainting...' : '✨ AI Edge Polish (Gemini 3.1)'}
                </Text>
              </TouchableOpacity>
            </BentoCard>

            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => goToStage(1)} style={styles.navBackBtn}>
                <ArrowLeft size={18} color={Colors.muted} />
                <Text style={styles.navBackText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => goToStage(3)} style={styles.navNextBtn}>
                <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.navNextGrad}>
                  <Text style={styles.btnPrimaryText}>Inspect 3D Model</Text>
                  <ArrowRight size={18} color="#0D1210" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STAGE 3: INTERACTIVE 3D SLAB PREVIEW ─────────────────────────── */}
        {currentStage === 3 && (
          <View>
            <BentoCard title="Crisp 3D Paper Model" subtitle="Drag horizontally to spin 360°">
              <View {...panResponder.panHandlers} style={styles.svg3dCanvas}>
                <Svg width={SCREEN_WIDTH - 64} height={240} viewBox="0 0 300 240">
                  <Defs>
                    <SvgGradient id="matGrid" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#1B3A31" stopOpacity="0.8" />
                      <Stop offset="100%" stopColor="#102620" stopOpacity="0.9" />
                    </SvgGradient>
                  </Defs>

                  {/* Turntable Cutting Mat Disc */}
                  <Polygon
                    points="70,185 230,185 270,215 30,215"
                    fill="url(#matGrid)"
                    stroke="#25493E"
                    strokeWidth="1.5"
                  />

                  {/* 3D Model Group (Driven by rotationAngle) */}
                  <G transform={`translate(150, 110)`}>
                    {/* Fold-Out Stand Base */}
                    <Rect
                      x="-44"
                      y="48"
                      width="88"
                      height="12"
                      rx="3"
                      fill="#FDFDFB"
                      stroke="#CCC"
                      strokeWidth="1"
                    />

                    {/* Extruded Prism Side Wall (Shading based on angle) */}
                    <Polygon
                      points={`
                        ${-45 + Math.cos((rotationAngle * Math.PI) / 180) * 12},${-45}
                        ${45 + Math.cos((rotationAngle * Math.PI) / 180) * 12},${-45}
                        ${45 + Math.cos((rotationAngle * Math.PI) / 180) * 12},${45}
                        ${-45 + Math.cos((rotationAngle * Math.PI) / 180) * 12},${45}
                      `}
                      fill={edgeColorHex}
                      opacity={0.88}
                    />

                    {/* Front Face Silhouette Card */}
                    <Rect
                      x="-45"
                      y="-45"
                      width="90"
                      height="90"
                      rx="6"
                      fill="#FDFDFB"
                      stroke={edgeColorHex}
                      strokeWidth="2"
                    />

                    <SvgText
                      x="0"
                      y="14"
                      fontSize="44"
                      textAnchor="middle"
                    >
                      {selectedSampleId === 'crossing'
                        ? '🚸'
                        : selectedSampleId === 'sneaker'
                        ? '👟'
                        : selectedSampleId === 'fox'
                        ? '🦊'
                        : '🧋'}
                    </SvgText>
                  </G>
                </Svg>

                <View style={styles.rotationHintPill}>
                  <RotateCw size={12} color={Colors.ruler} />
                  <Text style={styles.rotationHintText}>Angle: {Math.round(rotationAngle)}°</Text>
                </View>
              </View>

              {/* Parametric Mold Controls */}
              <View style={styles.controlsSection}>
                <View style={styles.moldTypeRow}>
                  <TouchableOpacity
                    onPress={() => setMoldStyle('block')}
                    style={[styles.moldBtn, moldStyle === 'block' && styles.moldBtnActive]}
                  >
                    <Text style={[styles.moldBtnText, moldStyle === 'block' && styles.moldBtnTextActive]}>
                      🧊 Crisp 3D ({depthCm} cm)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMoldStyle('standee')}
                    style={[styles.moldBtn, moldStyle === 'standee' && styles.moldBtnActive]}
                  >
                    <Text style={[styles.moldBtnText, moldStyle === 'standee' && styles.moldBtnTextActive]}>
                      🪧 3D Standee (1 cm)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sliders / Steppers */}
                <View style={styles.adjusterRow}>
                  <Text style={styles.adjusterLabel}>Model Height: {heightCm} cm</Text>
                  <View style={styles.stepperBox}>
                    <TouchableOpacity
                      onPress={() => setHeightCm((h) => Math.max(12, h - 2))}
                      style={styles.stepMiniBtn}
                    >
                      <Text style={styles.stepMiniText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepVal}>{heightCm}</Text>
                    <TouchableOpacity
                      onPress={() => setHeightCm((h) => Math.min(26, h + 2))}
                      style={styles.stepMiniBtn}
                    >
                      <Text style={styles.stepMiniText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.gsmChip}>
                  <Layers size={14} color={Colors.teal} />
                  <Text style={styles.gsmChipText}>
                    {heightCm >= 24 ? 'Recommended: 220 gsm Cardstock' : 'Recommended: 180 gsm Cardstock'}
                  </Text>
                </View>
              </View>
            </BentoCard>

            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => goToStage(2)} style={styles.navBackBtn}>
                <ArrowLeft size={18} color={Colors.muted} />
                <Text style={styles.navBackText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => goToStage(4)} style={styles.navNextBtn}>
                <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.navNextGrad}>
                  <Text style={styles.btnPrimaryText}>Animate Unfold</Text>
                  <ArrowRight size={18} color="#0D1210" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STAGE 4: ANIMATED UNFOLD (3D -> 2D) ─────────────────────────── */}
        {currentStage === 4 && (
          <View>
            <BentoCard title="Unfold 3D → 2D Pieces" subtitle="Scrub slider to watch flat pack unfold">
              <View style={styles.svg3dCanvas}>
                <Svg width={SCREEN_WIDTH - 64} height={240} viewBox="0 0 300 240">
                  {/* Unfold Interpolation: t in [0, 1] */}
                  {/* Front Silhouette */}
                  <G transform={`translate(${150 - unfoldProgress * 70}, ${100 - unfoldProgress * 30})`}>
                    <Rect x="-35" y="-35" width="70" height="70" rx="4" fill="#FDFDFB" stroke="#E63946" strokeWidth="1.5" />
                    <SvgText x="0" y="8" fontSize="28" textAnchor="middle">
                      {selectedSampleId === 'crossing'
                        ? '🚸'
                        : selectedSampleId === 'sneaker'
                        ? '👟'
                        : selectedSampleId === 'fox'
                        ? '🦊'
                        : '🧋'}
                    </SvgText>
                  </G>

                  {/* Mirrored Back Silhouette */}
                  <G transform={`translate(${150 + unfoldProgress * 70}, ${100 - unfoldProgress * 30})`}>
                    <Rect x="-35" y="-35" width="70" height="70" rx="4" fill="#FDFDFB" stroke="#E63946" strokeWidth="1.5" />
                    <SvgText x="0" y="8" fontSize="28" textAnchor="middle" opacity="0.6">
                      {selectedSampleId === 'crossing'
                        ? '🚸'
                        : selectedSampleId === 'sneaker'
                        ? '👟'
                        : selectedSampleId === 'fox'
                        ? '🦊'
                        : '🧋'}
                    </SvgText>
                  </G>

                  {/* Side Gusset Depth Strip */}
                  <G transform={`translate(150, ${145 + unfoldProgress * 35})`}>
                    <Rect
                      x="-110"
                      y="-12"
                      width="220"
                      height="24"
                      rx="2"
                      fill="#FDE7E9"
                      stroke="#3B78F0"
                      strokeWidth="1.5"
                      strokeDasharray="4, 4"
                    />
                    <SvgText x="0" y="4" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">
                      EXACT PERIMETER SIDE STRIP
                    </SvgText>
                  </G>
                </Svg>
              </View>

              {/* Scrub Slider */}
              <View style={styles.scrubSection}>
                <View style={styles.scrubHeader}>
                  <Text style={styles.scrubLabel}>Unfold Progress: {Math.round(unfoldProgress * 100)}%</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setUnfoldProgress((p) => (p >= 1 ? 0 : 1));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.toggleAnimBtn}
                  >
                    <Text style={styles.toggleAnimText}>{unfoldProgress >= 1 ? 'Fold 3D' : 'Unfold 2D'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Step Pill Selector */}
                <View style={styles.unfoldPillsRow}>
                  {[0, 0.25, 0.5, 0.75, 1].map((step) => (
                    <TouchableOpacity
                      key={step}
                      onPress={() => setUnfoldProgress(step)}
                      style={[
                        styles.unfoldStepPill,
                        Math.abs(unfoldProgress - step) < 0.1 && styles.unfoldStepPillActive,
                      ]}
                    >
                      <Text style={styles.unfoldStepPillText}>{Math.round(step * 100)}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </BentoCard>

            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => goToStage(3)} style={styles.navBackBtn}>
                <ArrowLeft size={18} color={Colors.muted} />
                <Text style={styles.navBackText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => goToStage(5)} style={styles.navNextBtn}>
                <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.navNextGrad}>
                  <Text style={styles.btnPrimaryText}>Generate Print PDF</Text>
                  <ArrowRight size={18} color="#0D1210" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STAGE 5: PRINT & EXPORT ─────────────────────────────────────── */}
        {currentStage === 5 && (
          <View>
            <BentoCard title="Printable Blueprint" subtitle={`Format: ${paperSize} • Exact 300 DPI vector scale`}>
              {/* Page 1 vs Page 2 Toggle */}
              <View style={styles.pageToggleRow}>
                <TouchableOpacity
                  onPress={() => setPreviewPage(1)}
                  style={[styles.pageToggleBtn, previewPage === 1 && styles.pageToggleBtnActive]}
                >
                  <Text style={[styles.pageToggleText, previewPage === 1 && styles.pageToggleTextActive]}>
                    Page 1: Front/Back & Stand
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPreviewPage(2)}
                  style={[styles.pageToggleBtn, previewPage === 2 && styles.pageToggleBtnActive]}
                >
                  <Text style={[styles.pageToggleText, previewPage === 2 && styles.pageToggleTextActive]}>
                    Page 2: Side Depth Strips
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Scaled Sheet Mockup */}
              <View style={styles.sheetMockup}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitleText}>{modelName.toUpperCase()}</Text>
                  <View style={styles.sheetRulerBox}>
                    <Text style={styles.sheetRulerText}>| 50 mm Ruler Check |</Text>
                  </View>
                </View>

                {previewPage === 1 ? (
                  <View style={styles.sheetPage1Body}>
                    <View style={styles.sheetCutoutBox}>
                      <Text style={{ fontSize: 40 }}>
                        {selectedSampleId === 'crossing'
                          ? '🚸'
                          : selectedSampleId === 'sneaker'
                          ? '👟'
                          : selectedSampleId === 'fox'
                          ? '🦊'
                          : '🧋'}
                      </Text>
                      <Text style={styles.sheetCutoutLabel}>Front Cut Line</Text>
                    </View>
                    <View style={styles.sheetCutoutBox}>
                      <Text style={{ fontSize: 40, opacity: 0.6 }}>
                        {selectedSampleId === 'crossing'
                          ? '🚸'
                          : selectedSampleId === 'sneaker'
                          ? '👟'
                          : selectedSampleId === 'fox'
                          ? '🦊'
                          : '🧋'}
                      </Text>
                      <Text style={styles.sheetCutoutLabel}>Mirrored Back</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.sheetPage2Body}>
                    <View style={styles.stripMock}>
                      <Text style={styles.stripLabel}>Side Depth Strip (trapezoid tabs)</Text>
                    </View>
                    <View style={styles.stripMock}>
                      <Text style={styles.stripLabel}>Matching Glue Circles (1 ↔ 1, 2 ↔ 2)</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Native Print & Share Buttons */}
              <View style={styles.printActionRow}>
                <TouchableOpacity onPress={handlePrintPdf} style={styles.printBtnPrimary}>
                  <Printer size={18} color="#0D1210" />
                  <Text style={styles.printBtnPrimaryText}>Print PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSharePdf} style={styles.shareBtnSecondary}>
                  <Share2 size={18} color={Colors.ink} />
                  <Text style={styles.shareBtnSecondaryText}>Save / Share</Text>
                </TouchableOpacity>
              </View>
            </BentoCard>

            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => goToStage(4)} style={styles.navBackBtn}>
                <ArrowLeft size={18} color={Colors.muted} />
                <Text style={styles.navBackText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => goToStage(6)} style={styles.navNextBtn}>
                <LinearGradient colors={[Colors.ruler, '#D4A017']} style={styles.navNextGrad}>
                  <Text style={styles.btnPrimaryText}>Assembly Guide</Text>
                  <ArrowRight size={18} color="#0D1210" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STAGE 6: ASSEMBLY GUIDE & GLUE TIMER ────────────────────────── */}
        {currentStage === 6 && (
          <View>
            <BentoCard title="20s Glue Setting Timer" subtitle="Hold glued paper tabs firmly until countdown reaches zero">
              <View style={styles.timerCircleBox}>
                <Text style={styles.timerSecText}>{glueTimerSec}s</Text>
                <Text style={styles.timerSubText}>{isTimerRunning ? 'BONDING TABS...' : 'READY'}</Text>
              </View>

              <TouchableOpacity
                onPress={startGlueTimer}
                disabled={isTimerRunning}
                style={styles.timerStartBtn}
              >
                <Clock size={18} color="#0D1210" />
                <Text style={styles.timerStartText}>
                  {isTimerRunning ? 'Timer Active...' : 'Start 20s Glue Timer'}
                </Text>
              </TouchableOpacity>
            </BentoCard>

            <Text style={styles.sectionLabel}>Physical Build Steps</Text>
            {[
              { num: 1, title: 'Print at 100%', desc: 'No Fit-to-Page scaling. Check 50mm ruler.' },
              { num: 2, title: 'Cut Red Outlines', desc: 'Carefully cut Front, Back & Strips.' },
              { num: 3, title: 'Score Blue Dashed Lines', desc: 'Pre-crease all glue tabs.' },
              { num: 4, title: 'Match Numbered Circles', desc: 'Match circle 1 on strip to circle 1 on front.' },
              { num: 5, title: 'Glue Side Strips to Front', desc: 'Apply thin PVA layer & hold.' },
              { num: 6, title: 'Seal Mirrored Back', desc: 'Attach back face to remaining tabs.' },
              { num: 7, title: 'Slot Desk Stand', desc: 'Valley fold stand & place upright.' },
            ].map((step) => {
              const done = completedSteps.includes(step.num);
              return (
                <TouchableOpacity
                  key={step.num}
                  onPress={() => toggleStep(step.num)}
                  activeOpacity={0.7}
                  style={[styles.stepItem, done && styles.stepItemDone]}
                >
                  <View style={[styles.stepCheckbox, done && styles.stepCheckboxDone]}>
                    {done && <Check size={14} color="#0D1210" strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepItemTitle, done && styles.stepItemTitleDone]}>
                      Step {step.num}: {step.title}
                    </Text>
                    <Text style={styles.stepItemDesc}>{step.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity onPress={handleFinishCraft} style={styles.finishCraftBtn}>
              <LinearGradient colors={[Colors.teal, '#1E8278']} style={styles.btnGradient}>
                <Award size={20} color="#0D1210" />
                <Text style={styles.btnPrimaryText}>Finish & Save to Creations</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCenter: {
    alignItems: 'center',
  },
  stageTitle: {
    ...Typography.title3,
    fontSize: 14,
    color: Colors.ink,
  },
  stepDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: {
    backgroundColor: Colors.ruler,
    width: 14,
  },
  stepDotCompleted: {
    backgroundColor: Colors.teal,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  captureFrame: {
    height: 280,
    backgroundColor: 'rgba(16, 38, 32, 0.65)',
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.ruler,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3 },
  emptyCaptureNotice: {
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: Spacing.sm,
  },
  captureInstructions: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    fontSize: 13,
  },
  sampleDisplay: {
    alignItems: 'center',
    gap: 4,
  },
  sampleDisplayName: {
    ...Typography.title2,
    marginTop: 4,
  },
  sampleDisplayCategory: {
    ...Typography.caption,
    color: Colors.sage,
  },
  sectionLabel: {
    ...Typography.title3,
    fontSize: 13,
    marginBottom: Spacing.sm,
    color: Colors.muted,
  },
  samplePickerRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sampleChipActive: {
    backgroundColor: 'rgba(244, 196, 48, 0.16)',
    borderColor: Colors.ruler,
  },
  sampleChipText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnSecondaryText: {
    fontWeight: '700',
    color: Colors.ink,
    fontSize: 14,
  },
  btnPrimary: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
  },
  btnPrimaryText: {
    fontWeight: '800',
    color: '#0D1210',
    fontSize: 15,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navBackText: {
    color: Colors.muted,
    fontWeight: '600',
  },
  navNextBtn: {
    flex: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  navNextGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
  },
  cutoutCheckerboard: {
    height: 190,
    borderRadius: Radii.md,
    backgroundColor: '#1E2522',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cutoutImg: {
    width: '100%',
    height: '100%',
  },
  cutoutPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    ...Typography.title2,
    color: Colors.teal,
  },
  metricLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  polishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(244, 196, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 196, 48, 0.3)',
  },
  polishBtnText: {
    color: Colors.ruler,
    fontWeight: '700',
    fontSize: 13,
  },
  svg3dCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 38, 32, 0.5)',
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  rotationHintPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  rotationHintText: {
    fontSize: 10,
    color: Colors.ruler,
    fontWeight: '700',
  },
  controlsSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  moldTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  moldBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moldBtnActive: {
    backgroundColor: 'rgba(244, 196, 48, 0.16)',
    borderColor: Colors.ruler,
  },
  moldBtnText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.muted,
  },
  moldBtnTextActive: {
    color: Colors.ruler,
  },
  adjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  adjusterLabel: {
    ...Typography.body,
    fontSize: 13,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radii.sm,
  },
  stepMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepMiniText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  stepVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.ruler,
    paddingHorizontal: 6,
  },
  gsmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 196, 182, 0.1)',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  gsmChipText: {
    ...Typography.caption,
    color: Colors.teal,
    fontWeight: '600',
  },
  scrubSection: {
    marginTop: Spacing.md,
  },
  scrubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  scrubLabel: {
    ...Typography.title3,
    fontSize: 13,
  },
  toggleAnimBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(244,196,48,0.15)',
  },
  toggleAnimText: {
    fontSize: 11,
    color: Colors.ruler,
    fontWeight: '700',
  },
  unfoldPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  unfoldStepPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  unfoldStepPillActive: {
    backgroundColor: Colors.ruler,
  },
  unfoldStepPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  pageToggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pageToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pageToggleBtnActive: {
    backgroundColor: 'rgba(59, 120, 240, 0.2)',
    borderColor: Colors.fold,
    borderWidth: 1,
  },
  pageToggleText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  pageToggleTextActive: {
    color: Colors.fold,
    fontWeight: '700',
  },
  sheetMockup: {
    backgroundColor: '#FFF',
    borderRadius: Radii.md,
    padding: Spacing.md,
    height: 180,
    justifyContent: 'space-between',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 4,
  },
  sheetTitleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  sheetRulerBox: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  sheetRulerText: {
    fontSize: 8,
    color: '#000',
    fontWeight: 'bold',
  },
  sheetPage1Body: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flex: 1,
    paddingTop: 8,
  },
  sheetCutoutBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E63946',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  sheetCutoutLabel: {
    fontSize: 9,
    color: '#333',
    fontWeight: '600',
  },
  sheetPage2Body: {
    flex: 1,
    paddingTop: 8,
    gap: 6,
  },
  stripMock: {
    borderWidth: 1,
    borderColor: '#3B78F0',
    borderStyle: 'dashed',
    backgroundColor: '#FDE7E9',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  stripLabel: {
    fontSize: 9,
    color: '#333',
    fontWeight: '600',
  },
  printActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  printBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.ruler,
  },
  printBtnPrimaryText: {
    fontWeight: '800',
    color: '#0D1210',
    fontSize: 14,
  },
  shareBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shareBtnSecondaryText: {
    fontWeight: '700',
    color: Colors.ink,
    fontSize: 14,
  },
  timerCircleBox: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  timerSecText: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.ruler,
    letterSpacing: -1,
  },
  timerSubText: {
    ...Typography.tag,
    color: Colors.muted,
    marginTop: 2,
  },
  timerStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.ruler,
  },
  timerStartText: {
    fontWeight: '800',
    color: '#0D1210',
    fontSize: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(20, 26, 23, 0.7)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  stepItemDone: {
    borderColor: 'rgba(46, 196, 182, 0.4)',
    backgroundColor: 'rgba(20, 36, 30, 0.8)',
  },
  stepCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepCheckboxDone: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  stepItemTitle: {
    ...Typography.title3,
    fontSize: 13,
  },
  stepItemTitleDone: {
    color: Colors.teal,
  },
  stepItemDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  finishCraftBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
