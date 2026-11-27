import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  PanResponder,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

import { Colors, Spacing } from '../constants/theme';
import {
  DEMO_SAMPLES,
  uploadScan,
  pollJobUntilDone,
  triggerPolish,
  fetchImageAsBase64,
  resolveApiUrl,
} from '../services/api';
import {
  saveCreation,
  updateCreation,
  checkAndUnlockBadges,
  CreationItem,
  getPaperPreference,
} from '../services/storage';

import { Stage1Capture } from '../components/workflow/Stage1Capture';
import { Stage2Lift } from '../components/workflow/Stage2Lift';
import { Stage3Preview3D } from '../components/workflow/Stage3Preview3D';
import { Stage4Unfold } from '../components/workflow/Stage4Unfold';
import { Stage5Print } from '../components/workflow/Stage5Print';
import { Stage6Build } from '../components/workflow/Stage6Build';
import { generatePrintHtml } from '../utils/pdfTemplate';

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
  const [uploadProgressDesc, setUploadProgressDesc] = useState<string>('');
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

  // Stage 5 (Print)
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [previewPage, setPreviewPage] = useState<1 | 2>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

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

  // Safe Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (currentStage > 1) {
        goToStage(currentStage - 1);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [currentStage]);

  // Glue Timer Interval Lifecycle
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
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
      setUploadProgressDesc('Uploading image to neural pipeline...');

      try {
        const uploadRes = await uploadScan(capturedUri, 'image/jpeg', 'upload.jpg');
        setProjectId(uploadRes.project_id);

        const completedJob = await pollJobUntilDone(uploadRes.job_id, (_progress, desc) => {
          setUploadProgressDesc(desc);
        });

        if (completedJob.status === 'done') {
          const resolvedCutout = resolveApiUrl(`/api/v1/projects/${uploadRes.project_id}/trimmed`);
          setCutoutUri(resolvedCutout);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      const res = await triggerPolish(projectId, ['bottom']);
      if (res.polished_url) {
        setCutoutUri(res.polished_url);
      }
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
      trimmedUrl: cutoutUri,
    });
  };

  // ── Stage 5 Print Actions ────────────────────────────────────────────────────

  const buildHtmlDocument = async (): Promise<string> => {
    const base64Artwork = cutoutUri ? await fetchImageAsBase64(cutoutUri) : null;
    const sampleEmoji =
      selectedSampleId === 'crossing'
        ? '🚸'
        : selectedSampleId === 'sneaker'
        ? '👟'
        : selectedSampleId === 'fox'
        ? '🦊'
        : '🧋';

    return generatePrintHtml({
      modelName,
      category,
      paperSize,
      heightCm,
      depthCm,
      edgeColorHex,
      cutoutBase64: base64Artwork,
      sampleEmoji,
    });
  };

  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = await buildHtmlDocument();
      await Print.printAsync({ html });
      await checkAndUnlockBadges(5);
    } catch (err) {
      console.warn('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    setIsSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = await buildHtmlDocument();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Foldly - ${modelName}.pdf`,
      });
      await checkAndUnlockBadges(5);
    } catch (err) {
      console.warn('Share failed:', err);
    } finally {
      setIsSharing(false);
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
        {currentStage === 1 && (
          <Stage1Capture
            capturedUri={capturedUri}
            selectedSampleId={selectedSampleId}
            modelName={modelName}
            category={category}
            onTakePhoto={takePhoto}
            onPickGallery={pickFromGallery}
            onSelectSample={loadSample}
            onConfirm={confirmCaptureAndLift}
          />
        )}

        {currentStage === 2 && (
          <Stage2Lift
            cutoutUri={cutoutUri}
            selectedSampleId={selectedSampleId}
            solidity={solidity}
            sharpness={sharpness}
            cropStatus={cropStatus}
            isPolishing={isPolishing}
            isProcessingUpload={isProcessingUpload}
            uploadProgressDesc={uploadProgressDesc}
            onPolish={handlePolish}
            onBack={() => goToStage(1)}
            onNext={() => goToStage(3)}
          />
        )}

        {currentStage === 3 && (
          <Stage3Preview3D
            rotationAngle={rotationAngle}
            panResponderHandlers={panResponder.panHandlers}
            selectedSampleId={selectedSampleId}
            moldStyle={moldStyle}
            heightCm={heightCm}
            depthCm={depthCm}
            edgeColorHex={edgeColorHex}
            onChangeMoldStyle={setMoldStyle}
            onChangeHeight={setHeightCm}
            onBack={() => goToStage(2)}
            onNext={() => goToStage(4)}
          />
        )}

        {currentStage === 4 && (
          <Stage4Unfold
            unfoldProgress={unfoldProgress}
            selectedSampleId={selectedSampleId}
            onChangeProgress={setUnfoldProgress}
            onBack={() => goToStage(3)}
            onNext={() => goToStage(5)}
          />
        )}

        {currentStage === 5 && (
          <Stage5Print
            modelName={modelName}
            paperSize={paperSize}
            selectedSampleId={selectedSampleId}
            previewPage={previewPage}
            isPrinting={isPrinting}
            isSharing={isSharing}
            onChangePage={setPreviewPage}
            onPrint={handlePrintPdf}
            onShare={handleSharePdf}
            onBack={() => goToStage(4)}
            onNext={() => goToStage(6)}
          />
        )}

        {currentStage === 6 && (
          <Stage6Build
            completedSteps={completedSteps}
            glueTimerSec={glueTimerSec}
            isTimerRunning={isTimerRunning}
            onToggleStep={toggleStep}
            onStartTimer={startGlueTimer}
            onFinish={handleFinishCraft}
          />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperCenter: {
    alignItems: 'center',
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  stepDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  stepDot: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  stepDotActive: {
    backgroundColor: Colors.ruler,
    width: 20,
  },
  stepDotCompleted: {
    backgroundColor: Colors.teal,
  },
  content: {
    padding: Spacing.lg,
  },
});
