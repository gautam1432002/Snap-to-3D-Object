import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { X, ChevronLeft } from 'lucide-react-native';

import { Colors } from '../constants/theme';
import { CuttingMatBackground } from '../components/CuttingMatBackground';
import { ServerUrlModal } from '../components/ServerUrlModal';
import {
  uploadScanBase64,
  pollJobUntilDone,
  getProjectAssets,
  triggerPolish,
  triggerCutoutSheet,
  normalizeContourPoints,
  fetchImageAsBase64,
} from '../services/api';
import {
  saveCreation,
  updateCreation,
  getSavedCreations,
  checkAndUnlockBadges,
  incrementScanned,
  getPaperPreference,
  setPaperPreference,
  CreationItem,
} from '../services/storage';
import {
  ContourPoint,
  SAMPLE_TEMPLATES,
  svgMarkupToDataUri,
} from '../utils/sampleTemplates';
import { generatePrintHtml } from '../utils/pdfTemplate';
import { printHtmlDirectly, sharePrintablePdf } from '../utils/pdfExport';

import { Step1Snap } from '../components/workflow/Step1Snap';
import { Step2Cutout } from '../components/workflow/Step2Cutout';
import { Step3Studio3D } from '../components/workflow/Step3Studio3D';
import { Step4Print } from '../components/workflow/Step4Print';

const STEP_TITLES = [
  '',
  '1. Snap Object',
  '2. Crisp Cutout',
  '3. Crisp 3D & Unfold',
  '4. Print & Fold',
];

export default function WorkflowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    sampleId?: string;
    creationId?: string;
    autoPick?: string;
  }>();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [scrollLocked, setScrollLocked] = useState<boolean>(false);
  const [serverModalOpen, setServerModalOpen] = useState<boolean>(false);

  // Active Craft Metadata
  const [projectId, setProjectId] = useState<string>(`proj_${Date.now()}`);
  const [isRealPhoto, setIsRealPhoto] = useState<boolean>(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>('crossing');
  const [modelName, setModelName] = useState<string>(SAMPLE_TEMPLATES.crossing.name);
  const [category, setCategory] = useState<string>(SAMPLE_TEMPLATES.crossing.category);
  const [edgeColorHex, setEdgeColorHex] = useState<string>(SAMPLE_TEMPLATES.crossing.edgeColorHex);

  // Step 1 & Step 2 State
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [cutoutBase64, setCutoutBase64] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadProgressDesc, setUploadProgressDesc] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);

  // Step 3 State
  const [contour, setContour] = useState<ContourPoint[]>(SAMPLE_TEMPLATES.crossing.contour);
  const [perimeterMm, setPerimeterMm] = useState<number>(520);
  const [heightCm, setHeightCm] = useState<number>(18);
  const [depthCm, setDepthCm] = useState<number>(2.5);
  const [includeStand, setIncludeStand] = useState<boolean>(true);

  // Step 4 State
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [aiSheetBase64, setAiSheetBase64] = useState<string | null>(null);
  const [aiSheetWarning, setAiSheetWarning] = useState<string | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [glueTimerSec, setGlueTimerSec] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const activeSample =
    selectedSampleId && SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      : SAMPLE_TEMPLATES.crossing;
  const activeArtworkUri = cutoutBase64 || svgMarkupToDataUri(activeSample.svgMarkup);

  useEffect(() => {
    getPaperPreference().then(setPaperSize);

    const bootFromParams = async () => {
      if (params.creationId) {
        const saved = await getSavedCreations();
        const found = saved.find((c) => c.id === params.creationId);
        if (found) {
          applyCreationItem(found);
          setCurrentStep(3);
          return;
        }
      }
      if (params.sampleId && SAMPLE_TEMPLATES[params.sampleId as keyof typeof SAMPLE_TEMPLATES]) {
        applySampleTemplate(params.sampleId as keyof typeof SAMPLE_TEMPLATES);
        setCurrentStep(2);
        return;
      }
      if (params.autoPick === 'gallery') {
        pickFromGallery();
      }
    };
    bootFromParams();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (currentStep > 1) {
        setCurrentStep((s) => s - 1);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [currentStep]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && glueTimerSec > 0) {
      timer = setInterval(() => setGlueTimerSec((s) => s - 1), 1000);
    } else if (glueTimerSec === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, glueTimerSec]);

  const applySampleTemplate = (sampleKey: keyof typeof SAMPLE_TEMPLATES) => {
    const tpl = SAMPLE_TEMPLATES[sampleKey];
    setIsRealPhoto(false);
    setCapturedUri(null);
    setCapturedBase64(null);
    setUploadError(null);
    setSelectedSampleId(tpl.id);
    setProjectId(`sample_${tpl.id}_${Date.now()}`);
    setModelName(tpl.name);
    setCategory(tpl.category);
    setEdgeColorHex(tpl.edgeColorHex);
    setHeightCm(tpl.heightCm);
    setDepthCm(tpl.depthCm);
    setIncludeStand(tpl.suggestStand);
    setContour(tpl.contour);
    setCutoutBase64(svgMarkupToDataUri(tpl.svgMarkup));
    setAiSource(null);
    setAiWarning(null);
    setAiSheetBase64(null);
  };

  const applyCreationItem = (c: CreationItem) => {
    setProjectId(c.id);
    setIsRealPhoto(!c.sampleId);
    setSelectedSampleId(c.sampleId || null);
    setModelName(c.name);
    setCategory(c.category);
    setEdgeColorHex(c.edgeColorHex || '#2ec4b6');
    setHeightCm(c.heightCm || 18);
    setDepthCm(c.depthCm || 2.5);
    setIncludeStand(c.includeStand !== false);
    setAiSource(c.aiSource || null);
    setAiWarning(c.aiWarning || null);
    if (c.trimmedBase64 || c.trimmedUrl) {
      setCutoutBase64(c.trimmedBase64 || c.trimmedUrl || null);
    } else if (c.sampleId && SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]) {
      setCutoutBase64(
        svgMarkupToDataUri(SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES].svgMarkup)
      );
    }
    if (c.contour?.points?.length) {
      setContour(normalizeContourPoints(c.contour.points));
      setPerimeterMm(c.contour.perimeterMm || 520);
    } else if (c.sampleId && SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]) {
      setContour(SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES].contour);
    }
    if (c.sheetBase64) setAiSheetBase64(c.sheetBase64);
  };

  const persistProgress = async (
    nextStatus: 'Ready' | 'Building' | 'Built' = 'Ready',
    overrideStep?: number
  ) => {
    const stepVal = overrideStep ?? currentStep;
    await checkAndUnlockBadges(stepVal, nextStatus);
    await saveCreation({
      id: projectId,
      name: modelName,
      category,
      status: nextStatus,
      buildStep: nextStatus === 'Built' ? 5 : 0,
      totalSteps: 5,
      heightCm,
      depthCm,
      includeStand,
      sampleId: isRealPhoto ? null : selectedSampleId,
      updatedAt: Date.now(),
      edgeColorHex,
      aiSource,
      aiWarning,
      trimmedBase64: cutoutBase64?.startsWith('data:image/png') ? cutoutBase64 : undefined,
      sheetBase64: aiSheetBase64 || undefined,
      contour: {
        points: contour,
        perimeterMm,
        edgeColorHex,
        smoothness: 'Medium',
      },
    });
  };

  const goToStep = async (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(next);
    await persistProgress(next === 4 ? 'Building' : 'Ready', next);
  };

  // ── Step 1 Capture & Base64 Compression ─────────────────────────────────────

  const compressAndSetImage = async (uri: string) => {
    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      setCapturedUri(manip.uri);
      setCapturedBase64(manip.base64 || null);
      setIsRealPhoto(true);
      setSelectedSampleId(null);
      setUploadError(null);
      setAiSheetBase64(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      Alert.alert('Image Error', err?.message || 'Could not process selected photo.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera access is required to snap an object.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1 });
    if (!res.canceled && res.assets[0]) {
      await compressAndSetImage(res.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Photo library access is required to choose an image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 1 });
    if (!res.canceled && res.assets[0]) {
      await compressAndSetImage(res.assets[0].uri);
    }
  };

  // ── Step 2 JSON Base64 Upload & Assets Fetch ────────────────────────────────

  const runRealPhotoUpload = async () => {
    if (!capturedUri || !capturedBase64) return;
    setIsProcessingUpload(true);
    setUploadError(null);
    setUploadProgress(15);
    setUploadProgressDesc('Sending compressed photo to FastAPI...');

    try {
      const scanRes = await uploadScanBase64(capturedBase64, 'image/jpeg', 'scan.jpg');
      setProjectId(scanRes.project_id);

      await pollJobUntilDone(scanRes.job_id, (prog, desc) => {
        setUploadProgress(prog);
        setUploadProgressDesc(desc);
      });

      setUploadProgressDesc('Loading full-res transparent cutout...');
      const assets = await getProjectAssets(scanRes.project_id);

      // Prefer sharp full-res trimmed_base64 (up to 1024px) over 512px preview
      const sharpImg = assets.polished_base64 || assets.trimmed_base64 || assets.preview_base64;
      if (!sharpImg) {
        throw new Error('Server completed processing but returned no cutout PNG.');
      }

      setCutoutBase64(sharpImg);
      setModelName(assets.suggested_name || assets.object_name || 'Custom Craft');
      setCategory(assets.category || 'Everyday');
      setHeightCm(Math.max(12, Math.min(24, Math.round(assets.estimated_height_cm || 18))));
      setEdgeColorHex(assets.edge_color || '#2ec4b6');
      setAiSource(assets.ai_source || 'fallback');
      setAiWarning(assets.ai_warning || null);

      if (assets.contour?.points?.length) {
        setContour(normalizeContourPoints(assets.contour.points));
        setPerimeterMm(assets.perimeter_mm || assets.contour.perimeter_mm || 500);
      }

      await incrementScanned();
      await checkAndUnlockBadges(2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setUploadError(err?.message || 'Could not process real photo on server.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const confirmCaptureAndLift = async () => {
    if (isRealPhoto && capturedUri) {
      setCurrentStep(2);
      await runRealPhotoUpload();
    } else if (selectedSampleId) {
      applySampleTemplate(selectedSampleId as keyof typeof SAMPLE_TEMPLATES);
      await incrementScanned();
      await goToStep(2);
    }
  };

  const handlePolish = async () => {
    if (!isRealPhoto) return;
    setIsPolishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await triggerPolish(projectId, ['edges']);
      if (res.polished_base64) setCutoutBase64(res.polished_base64);
      if (res.contour?.points?.length) {
        setContour(normalizeContourPoints(res.contour.points));
        setPerimeterMm(res.contour.perimeter_mm || perimeterMm);
        setEdgeColorHex(res.contour.edge_color_hex || edgeColorHex);
      }
      setAiSource(res.ai_source || 'fallback');
      setAiWarning(res.ai_warning || null);
      if (res.ai_source === 'gemini') {
        Alert.alert('✨ AI Polish Applied', 'Cutout sharpened & edges healed!');
      } else if (res.ai_warning) {
        Alert.alert('AI Polish Notice', res.ai_warning);
      }
    } catch (err: any) {
      Alert.alert('Polish Error', err?.message || 'Failed to polish cutout.');
    } finally {
      setIsPolishing(false);
    }
  };

  // ── Step 4 Print, FileSystem Share & Gemini Sheet ───────────────────────────

  const handleGenerateAiSheet = async () => {
    setIsGeneratingSheet(true);
    setAiSheetWarning(null);
    try {
      if (isRealPhoto) {
        const res = await triggerCutoutSheet(projectId);
        if (res.sheet_base64) {
          setAiSheetBase64(res.sheet_base64);
        } else if (res.sheet_url) {
          const b64 = await fetchImageAsBase64(res.sheet_url);
          if (b64) setAiSheetBase64(b64);
        }
        setAiSheetWarning(res.ai_warning || null);
      } else {
        setAiSheetWarning(
          'Sample crafts use exact-scale Sheet 1 & Sheet 2 vectors; scan a real object with GEMINI_API_KEY configured for AI-illustrated sheets.'
        );
      }
    } catch (err: any) {
      setAiSheetWarning(err?.message || 'Could not generate AI sheet.');
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const buildPdfHtml = async (): Promise<string> => {
    const resolvedArt = cutoutBase64 || (await fetchImageAsBase64(activeArtworkUri)) || activeArtworkUri;
    return generatePrintHtml({
      modelName,
      category,
      paperSize,
      heightCm,
      depthCm,
      moldStyle: 'block',
      includeStand,
      edgeColorHex,
      perimeterMm,
      contour,
      artworkUri: resolvedArt,
      aiSheetBase64,
    });
  };

  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = await buildPdfHtml();
      await printHtmlDirectly(html);
      await checkAndUnlockBadges(4);
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not open system print dialog.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    setIsSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = await buildPdfHtml();
      await sharePrintablePdf(html, modelName, paperSize);
      await checkAndUnlockBadges(4);
    } catch (err: any) {
      Alert.alert('PDF Export Error', err?.message || 'Could not share PDF file.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleMarkDone = async () => {
    await updateCreation(projectId, { status: 'Built', buildStep: 5 });
    await persistProgress('Built', 4);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '🎉 Craft Complete!',
      `"${modelName}" is marked Built and saved in Creations!`,
      [{ text: 'View Creations', onPress: () => router.replace('/(tabs)/creations') }]
    );
  };

  return (
    <CuttingMatBackground showTopRuler={false}>
      <View style={styles.flexOne}>
        {/* Header with explicit SafeAreaInsets */}
        <View
          style={[
            styles.wfHeader,
            { paddingTop: Math.max(insets.top, 28) + 8 },
          ]}
        >
          <TouchableOpacity
            onPress={() => (currentStep > 1 ? setCurrentStep((s) => s - 1) : router.back())}
            style={styles.iconBtn}
          >
            <ChevronLeft size={20} color={Colors.inkOnMat} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.wfTitle} numberOfLines={1}>
              {STEP_TITLES[currentStep]}
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <X size={18} color={Colors.inkOnMat} />
          </TouchableOpacity>
        </View>

        {/* Clean 4-Step Progress Dots */}
        <View style={styles.stepperRow}>
          {[1, 2, 3, 4].map((st) => (
            <View
              key={st}
              style={[
                styles.stepDot,
                st < currentStep && styles.stepDotDone,
                st === currentStep && styles.stepDotActive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          scrollEnabled={!scrollLocked}
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && (
            <Step1Snap
              capturedUri={capturedUri}
              selectedSampleId={selectedSampleId}
              modelName={modelName}
              onTakePhoto={takePhoto}
              onPickGallery={pickFromGallery}
              onSelectSample={(id) => applySampleTemplate(id)}
              onRetake={() => {
                setCapturedUri(null);
                setCapturedBase64(null);
                setIsRealPhoto(false);
                setSelectedSampleId('crossing');
              }}
              onConfirm={confirmCaptureAndLift}
            />
          )}

          {currentStep === 2 && (
            <Step2Cutout
              cutoutUri={cutoutBase64}
              sampleId={selectedSampleId}
              isRealPhoto={isRealPhoto}
              modelName={modelName}
              aiSource={aiSource}
              aiWarning={aiWarning}
              isProcessingUpload={isProcessingUpload}
              uploadProgress={uploadProgress}
              uploadProgressDesc={uploadProgressDesc}
              isPolishing={isPolishing}
              uploadError={uploadError}
              onChangeName={setModelName}
              onPolish={handlePolish}
              onRetryScan={runRealPhotoUpload}
              onEditServerUrl={() => setServerModalOpen(true)}
              onRetake={() => setCurrentStep(1)}
              onNext={() => goToStep(3)}
            />
          )}

          {currentStep === 3 && (
            <Step3Studio3D
              artworkUri={activeArtworkUri}
              contour={contour}
              edgeColorHex={edgeColorHex}
              heightCm={heightCm}
              depthCm={depthCm}
              includeStand={includeStand}
              onChangeHeight={setHeightCm}
              onToggleStand={() => setIncludeStand((v) => !v)}
              onBack={() => setCurrentStep(2)}
              onNext={() => goToStep(4)}
              onScrollLock={setScrollLocked}
            />
          )}

          {currentStep === 4 && (
            <Step4Print
              modelName={modelName}
              category={category}
              paperSize={paperSize}
              heightCm={heightCm}
              depthCm={depthCm}
              includeStand={includeStand}
              edgeColorHex={edgeColorHex}
              perimeterMm={perimeterMm}
              contour={contour}
              artworkUri={activeArtworkUri}
              sampleId={selectedSampleId}
              isRealPhoto={isRealPhoto}
              aiSheetBase64={aiSheetBase64}
              aiSheetWarning={aiSheetWarning}
              isGeneratingSheet={isGeneratingSheet}
              isPrinting={isPrinting}
              isSharing={isSharing}
              glueTimerSec={glueTimerSec}
              isTimerRunning={isTimerRunning}
              onChangePaperSize={(sz) => {
                setPaperSize(sz);
                setPaperPreference(sz);
              }}
              onGenerateAiSheet={handleGenerateAiSheet}
              onPrint={handlePrintPdf}
              onShare={handleSharePdf}
              onStartTimer={() => {
                setGlueTimerSec(20);
                setIsTimerRunning(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
              onMarkDone={handleMarkDone}
              onBack={() => setCurrentStep(3)}
            />
          )}
        </ScrollView>

        <ServerUrlModal
          visible={serverModalOpen}
          onClose={() => setServerModalOpen(false)}
        />
      </View>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  wfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 10,
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(16, 38, 32, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  wfTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 15,
    paddingBottom: 12,
  },
  stepDot: {
    flex: 1,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  stepDotDone: {
    backgroundColor: Colors.teal,
  },
  stepDotActive: {
    backgroundColor: Colors.ruler,
  },
  scrollBody: {
    paddingHorizontal: 15,
    paddingTop: 4,
  },
});
