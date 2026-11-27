import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { X, ChevronLeft } from 'lucide-react-native';

import { Colors } from '../constants/theme';
import { CuttingMatBackground } from '../components/CuttingMatBackground';
import { ServerUrlModal } from '../components/ServerUrlModal';
import {
  uploadScan,
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

import { Stage1Capture } from '../components/workflow/Stage1Capture';
import { Stage2Lift } from '../components/workflow/Stage2Lift';
import { Stage3Preview3D } from '../components/workflow/Stage3Preview3D';
import { Stage4Unfold } from '../components/workflow/Stage4Unfold';
import { Stage5Print } from '../components/workflow/Stage5Print';
import { Stage6Build } from '../components/workflow/Stage6Build';

const STAGE_TITLES = [
  '',
  '1. Capture Object',
  '2. Neural Subject Lift',
  '3. Crisp 3D Model',
  '4. Unfold 3D → 2D',
  '5. Printable Layout',
  '6. 7-Step Build Guide',
];

export default function WorkflowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sampleId?: string;
    creationId?: string;
    autoPick?: string;
  }>();

  const [currentStage, setCurrentStage] = useState<number>(1);
  const [scrollLocked, setScrollLocked] = useState<boolean>(false);
  const [serverModalOpen, setServerModalOpen] = useState<boolean>(false);

  // Active Craft Metadata
  const [projectId, setProjectId] = useState<string>(`proj_${Date.now()}`);
  const [isRealPhoto, setIsRealPhoto] = useState<boolean>(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>('crossing');
  const [modelName, setModelName] = useState<string>(SAMPLE_TEMPLATES.crossing.name);
  const [category, setCategory] = useState<string>(SAMPLE_TEMPLATES.crossing.category);
  const [estMinutes, setEstMinutes] = useState<number>(SAMPLE_TEMPLATES.crossing.estMinutes);
  const [buildTip, setBuildTip] = useState<string>(SAMPLE_TEMPLATES.crossing.buildTip);
  const [edgeColorHex, setEdgeColorHex] = useState<string>(SAMPLE_TEMPLATES.crossing.edgeColorHex);

  // Stage 1 & Stage 2 State
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [cutoutBase64, setCutoutBase64] = useState<string | null>(null);
  const [dieCutBorder, setDieCutBorder] = useState<boolean>(false);
  const [engineUsed, setEngineUsed] = useState<string>('Studio Sample');
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [solidity, setSolidity] = useState<number>(94);
  const [sharpness, setSharpness] = useState<number>(96);
  const [cropStatus, setCropStatus] = useState<string>('Clean ✓');
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadProgressDesc, setUploadProgressDesc] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);

  // Stage 3 & Stage 4 State
  const [contour, setContour] = useState<ContourPoint[]>(SAMPLE_TEMPLATES.crossing.contour);
  const [perimeterMm, setPerimeterMm] = useState<number>(520);
  const [moldStyle, setMoldStyle] = useState<'block' | 'standee'>('block');
  const [heightCm, setHeightCm] = useState<number>(18);
  const [depthCm, setDepthCm] = useState<number>(2.5);
  const [smoothness, setSmoothness] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [includeStand, setIncludeStand] = useState<boolean>(true);
  const [unfoldProgress, setUnfoldProgress] = useState<number>(0);

  // Stage 5 State
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [aiSheetBase64, setAiSheetBase64] = useState<string | null>(null);
  const [aiSheetWarning, setAiSheetWarning] = useState<string | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Stage 6 State
  const [buildStepIdx, setBuildStepIdx] = useState<number>(0);
  const [glueTimerSec, setGlueTimerSec] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Active artwork URI for 3D, Unfold, and PDF
  const activeSample =
    selectedSampleId && SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      ? SAMPLE_TEMPLATES[selectedSampleId as keyof typeof SAMPLE_TEMPLATES]
      : SAMPLE_TEMPLATES.crossing;
  const activeArtworkUri =
    cutoutBase64 || svgMarkupToDataUri(activeSample.svgMarkup);

  // Load initial preferences / route params
  useEffect(() => {
    getPaperPreference().then(setPaperSize);

    const bootFromParams = async () => {
      if (params.creationId) {
        const saved = await getSavedCreations();
        const found = saved.find((c) => c.id === params.creationId);
        if (found) {
          applyCreationItem(found);
          setCurrentStage(found.status === 'Building' ? 6 : 3);
          return;
        }
      }
      if (params.sampleId && SAMPLE_TEMPLATES[params.sampleId as keyof typeof SAMPLE_TEMPLATES]) {
        const sId = params.sampleId as keyof typeof SAMPLE_TEMPLATES;
        applySampleTemplate(sId);
        setCurrentStage(2);
        return;
      }
      if (params.autoPick === 'gallery') {
        pickFromGallery();
      }
    };
    bootFromParams();
  }, []);

  // Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (currentStage > 1) {
        setCurrentStage((s) => s - 1);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [currentStage]);

  // Glue Timer Interval
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
    setUploadError(null);
    setSelectedSampleId(tpl.id);
    setProjectId(`sample_${tpl.id}_${Date.now()}`);
    setModelName(tpl.name);
    setCategory(tpl.category);
    setEstMinutes(tpl.estMinutes);
    setBuildTip(tpl.buildTip);
    setEdgeColorHex(tpl.edgeColorHex);
    setHeightCm(tpl.heightCm);
    setDepthCm(tpl.depthCm);
    setMoldStyle(tpl.moldStyle);
    setIncludeStand(tpl.suggestStand);
    setContour(tpl.contour);
    setCutoutBase64(svgMarkupToDataUri(tpl.svgMarkup));
    setEngineUsed('Studio Sample');
    setAiSource(null);
    setAiWarning(null);
    setSolidity(96);
    setSharpness(98);
    setCropStatus('Clean ✓');
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
    setMoldStyle(c.moldStyle || 'block');
    setSmoothness(c.smoothness || 'Medium');
    setIncludeStand(c.includeStand !== false);
    setBuildStepIdx(c.buildStep || 0);
    if (c.buildTip) setBuildTip(c.buildTip);
    if (c.estMinutes) setEstMinutes(c.estMinutes);
    if (c.engineUsed) setEngineUsed(c.engineUsed);
    setAiSource(c.aiSource || null);
    setAiWarning(c.aiWarning || null);
    if (c.trimmedBase64 || c.trimmedUrl) {
      setCutoutBase64(c.trimmedBase64 || c.trimmedUrl || null);
    } else if (c.sampleId && SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]) {
      setCutoutBase64(svgMarkupToDataUri(SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES].svgMarkup));
    }
    if (c.contour?.points?.length) {
      setContour(normalizeContourPoints(c.contour.points));
      setPerimeterMm(c.contour.perimeterMm || 520);
    } else if (c.sampleId && SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES]) {
      setContour(SAMPLE_TEMPLATES[c.sampleId as keyof typeof SAMPLE_TEMPLATES].contour);
    }
  };

  // ── Persist helper ───────────────────────────────────────────────────────────

  const persistProgress = async (
    nextStatus: 'Ready' | 'Building' | 'Built' = 'Ready',
    overrideStage?: number
  ) => {
    const stageVal = overrideStage ?? currentStage;
    await checkAndUnlockBadges(stageVal, nextStatus);
    await saveCreation({
      id: projectId,
      name: modelName,
      category,
      status: nextStatus,
      buildStep: buildStepIdx,
      totalSteps: 7,
      moldStyle,
      heightCm,
      depthCm,
      smoothness,
      includeStand,
      sampleId: isRealPhoto ? null : selectedSampleId,
      updatedAt: Date.now(),
      edgeColorHex,
      estMinutes,
      buildTip,
      engineUsed,
      aiSource,
      aiWarning,
      trimmedBase64: cutoutBase64?.startsWith('data:image/png') ? cutoutBase64 : undefined,
      sheetBase64: aiSheetBase64 || undefined,
      contour: {
        points: contour,
        perimeterMm,
        edgeColorHex,
        smoothness,
      },
    });
  };

  const goToStage = async (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStage(next);
    await persistProgress(next === 6 ? 'Building' : 'Ready', next);
  };

  // ── Stage 1 Actions ──────────────────────────────────────────────────────────

  const compressAndSetImage = async (uri: string) => {
    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCapturedUri(manip.uri);
      setIsRealPhoto(true);
      setSelectedSampleId(null);
      setUploadError(null);
      setAiSheetBase64(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      setCapturedUri(uri);
      setIsRealPhoto(true);
      setSelectedSampleId(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera access is required to scan an object.');
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
      Alert.alert('Permission Needed', 'Photo library access is required to upload a photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 1 });
    if (!res.canceled && res.assets[0]) {
      await compressAndSetImage(res.assets[0].uri);
    }
  };

  const runRealPhotoUpload = async () => {
    if (!capturedUri) return;
    setIsProcessingUpload(true);
    setUploadError(null);
    setUploadProgress(10);
    setUploadProgressDesc('Uploading photo to FastAPI segmentation pipeline...');

    try {
      const scanRes = await uploadScan(capturedUri, 'image/jpeg', 'scan.jpg');
      setProjectId(scanRes.project_id);

      await pollJobUntilDone(scanRes.job_id, (prog, desc) => {
        setUploadProgress(prog);
        setUploadProgressDesc(desc);
      });

      setUploadProgressDesc('Downloading transparent cutout & vector contour...');
      const assets = await getProjectAssets(scanRes.project_id);

      const finalImg = assets.polished_base64 || assets.trimmed_base64 || assets.preview_base64;
      if (!finalImg) {
        throw new Error('Server finished pipeline but did not return a cutout PNG.');
      }

      setCutoutBase64(finalImg);
      setModelName(assets.suggested_name || assets.object_name || 'Custom Paper Craft');
      setCategory(assets.category || 'Everyday');
      setHeightCm(Math.max(10, Math.min(35, Math.round(assets.estimated_height_cm || 18))));
      setEdgeColorHex(assets.edge_color || '#2ec4b6');
      setEngineUsed(assets.engine_used || 'RMBG-ONNX');
      setAiSource(assets.ai_source || 'fallback');
      setAiWarning(assets.ai_warning || null);

      if (assets.quality_metrics) {
        setSolidity(Math.round((assets.quality_metrics.solidity || 0.85) * 100));
        setSharpness(Math.round(assets.quality_metrics.sharpness || 85));
        const cropQual = assets.quality_metrics.crop_edge_quality ?? 1;
        setCropStatus(cropQual >= 0.85 ? 'Clean ✓' : 'Edge Cropped');
      }

      if (assets.contour?.points?.length) {
        setContour(normalizeContourPoints(assets.contour.points));
        setPerimeterMm(assets.perimeter_mm || assets.contour.perimeter_mm || 500);
      }

      await incrementScanned();
      await checkAndUnlockBadges(2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      // NEVER silently fall back to Demo Mode on a real photo
      setUploadError(err?.message || 'Failed to upload or process photo on backend.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const confirmCaptureAndLift = async () => {
    if (isRealPhoto && capturedUri) {
      setCurrentStage(2);
      await runRealPhotoUpload();
    } else if (selectedSampleId) {
      applySampleTemplate(selectedSampleId as keyof typeof SAMPLE_TEMPLATES);
      await incrementScanned();
      await goToStage(2);
    }
  };

  // ── Stage 2 Polish ───────────────────────────────────────────────────────────

  const handlePolish = async () => {
    if (!isRealPhoto) return;
    setIsPolishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await triggerPolish(projectId, cropStatus.includes('Clean') ? [] : ['edges']);
      if (res.polished_base64) {
        setCutoutBase64(res.polished_base64);
      }
      if (res.contour?.points?.length) {
        setContour(normalizeContourPoints(res.contour.points));
        setPerimeterMm(res.contour.perimeter_mm || perimeterMm);
        setEdgeColorHex(res.contour.edge_color_hex || edgeColorHex);
      }
      setAiSource(res.ai_source || 'fallback');
      setAiWarning(res.ai_warning || null);
      if (res.ai_source === 'gemini') {
        setCropStatus('Healed ✓');
        Alert.alert('✨ Gemini Polish Applied', 'Cropped edges healed & cutout colors sharpened!');
      } else if (res.ai_warning) {
        Alert.alert('Gemini Polish Notice', res.ai_warning);
      }
    } catch (err: any) {
      Alert.alert('Polish Error', err?.message || 'Failed to run Gemini polish.');
    } finally {
      setIsPolishing(false);
    }
  };

  // ── Stage 3 Smoothness Change ────────────────────────────────────────────────

  const handleChangeSmoothness = async (nextSmooth: 'Easy' | 'Medium' | 'Hard') => {
    setSmoothness(nextSmooth);
    if (isRealPhoto && projectId) {
      try {
        const assets = await getProjectAssets(projectId, {
          smoothness: nextSmooth,
          heightCm,
        });
        if (assets.contour?.points?.length) {
          setContour(normalizeContourPoints(assets.contour.points));
          setPerimeterMm(assets.perimeter_mm || assets.contour.perimeter_mm || perimeterMm);
        }
      } catch {}
    }
  };

  // ── Stage 5 Print & AI Sheet ─────────────────────────────────────────────────

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
        // Sample template preview sheet
        setAiSheetWarning('Demo template uses vector Pages 1 & 2; scan a real object with GEMINI_API_KEY configured to generate an AI illustrated sheet.');
        setAiSheetBase64(null);
      }
    } catch (err: any) {
      setAiSheetWarning(err?.message || 'Failed to generate AI cutout sheet.');
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
      moldStyle,
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
      await Print.printAsync({ html });
      await checkAndUnlockBadges(5);
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
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Foldly - ${modelName} (${paperSize}).pdf`,
      });
      await checkAndUnlockBadges(5);
    } catch (err: any) {
      Alert.alert('PDF Export Error', err?.message || 'Could not generate PDF file.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleFinishCraft = async () => {
    await updateCreation(projectId, { status: 'Built', buildStep: 6 });
    await persistProgress('Built', 6);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '🎉 Awesome Craft!',
      `"${modelName}" is finished and saved to My Creations!`,
      [{ text: 'View Creations', onPress: () => router.replace('/(tabs)/creations') }]
    );
  };

  return (
    <CuttingMatBackground showTopRuler={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Workflow Header */}
        <View style={styles.wfHeader}>
          <TouchableOpacity
            onPress={() => (currentStage > 1 ? setCurrentStage((s) => s - 1) : router.back())}
            style={styles.iconBtn}
          >
            <ChevronLeft size={20} color={Colors.inkOnMat} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.wfTitle} numberOfLines={1}>
              {STAGE_TITLES[currentStage]}
            </Text>
            <Text style={styles.wfSub} numberOfLines={1}>
              Neural Lift → Crisp 3D → Exact-Scale Print
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <X size={18} color={Colors.inkOnMat} />
          </TouchableOpacity>
        </View>

        {/* 6-Dot Stage Stepper */}
        <View style={styles.stageStepper}>
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <View
              key={st}
              style={[
                styles.stageDot,
                st < currentStage && styles.stageDotDone,
                st === currentStage && styles.stageDotActive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          scrollEnabled={!scrollLocked}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {currentStage === 1 && (
            <Stage1Capture
              capturedUri={capturedUri}
              selectedSampleId={selectedSampleId}
              modelName={modelName}
              onTakePhoto={takePhoto}
              onPickGallery={pickFromGallery}
              onSelectSample={(id) => applySampleTemplate(id)}
              onRetake={() => {
                setCapturedUri(null);
                setIsRealPhoto(false);
                setSelectedSampleId('crossing');
              }}
              onConfirm={confirmCaptureAndLift}
            />
          )}

          {currentStage === 2 && (
            <Stage2Lift
              originalPhotoUri={capturedUri}
              cutoutUri={cutoutBase64}
              sampleId={selectedSampleId}
              isRealPhoto={isRealPhoto}
              modelName={modelName}
              category={category}
              estMinutes={estMinutes}
              edgeColorHex={edgeColorHex}
              engineUsed={engineUsed}
              aiSource={aiSource}
              aiWarning={aiWarning}
              solidity={solidity}
              sharpness={sharpness}
              cropStatus={cropStatus}
              dieCutBorder={dieCutBorder}
              isProcessingUpload={isProcessingUpload}
              uploadProgress={uploadProgress}
              uploadProgressDesc={uploadProgressDesc}
              isPolishing={isPolishing}
              uploadError={uploadError}
              onToggleDieCut={() => setDieCutBorder((v) => !v)}
              onRename={(name) => setModelName(name)}
              onPolish={handlePolish}
              onRetryScan={runRealPhotoUpload}
              onEditServerUrl={() => setServerModalOpen(true)}
              onBack={() => setCurrentStage(1)}
              onNext={() => goToStage(3)}
              onScrollLock={setScrollLocked}
            />
          )}

          {currentStage === 3 && (
            <Stage3Preview3D
              artworkUri={activeArtworkUri}
              contour={contour}
              edgeColorHex={edgeColorHex}
              moldStyle={moldStyle}
              heightCm={heightCm}
              depthCm={depthCm}
              smoothness={smoothness}
              includeStand={includeStand}
              onChangeMoldStyle={setMoldStyle}
              onChangeHeight={setHeightCm}
              onChangeDepth={setDepthCm}
              onChangeSmoothness={handleChangeSmoothness}
              onToggleStand={() => setIncludeStand((v) => !v)}
              onBack={() => setCurrentStage(2)}
              onNext={() => goToStage(4)}
              onScrollLock={setScrollLocked}
            />
          )}

          {currentStage === 4 && (
            <Stage4Unfold
              artworkUri={activeArtworkUri}
              edgeColorHex={edgeColorHex}
              includeStand={includeStand}
              unfoldProgress={unfoldProgress}
              onChangeProgress={setUnfoldProgress}
              onBack={() => setCurrentStage(3)}
              onNext={() => goToStage(5)}
              onScrollLock={setScrollLocked}
            />
          )}

          {currentStage === 5 && (
            <Stage5Print
              modelName={modelName}
              category={category}
              paperSize={paperSize}
              heightCm={heightCm}
              depthCm={depthCm}
              moldStyle={moldStyle}
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
              onChangePaperSize={(sz) => {
                setPaperSize(sz);
                setPaperPreference(sz);
              }}
              onGenerateAiSheet={handleGenerateAiSheet}
              onPrint={handlePrintPdf}
              onShare={handleSharePdf}
              onBack={() => setCurrentStage(4)}
              onNext={() => {
                setBuildStepIdx(0);
                goToStage(6);
              }}
            />
          )}

          {currentStage === 6 && (
            <Stage6Build
              modelName={modelName}
              paperSize={paperSize}
              moldStyle={moldStyle}
              includeStand={includeStand}
              buildTip={buildTip}
              buildStepIdx={buildStepIdx}
              glueTimerSec={glueTimerSec}
              isTimerRunning={isTimerRunning}
              onChangeStep={(idx) => {
                setBuildStepIdx(idx);
                setGlueTimerSec(20);
                setIsTimerRunning(false);
                updateCreation(projectId, { buildStep: idx, status: 'Building' });
              }}
              onStartTimer={() => {
                setGlueTimerSec(20);
                setIsTimerRunning(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
              onFinish={handleFinishCraft}
            />
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        <ServerUrlModal
          visible={serverModalOpen}
          onClose={() => setServerModalOpen(false)}
        />
      </SafeAreaView>
    </CuttingMatBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  wfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(16, 38, 32, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  wfTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.inkOnMat,
  },
  wfSub: {
    fontSize: 10.5,
    color: Colors.sage,
    marginTop: 1,
  },
  stageStepper: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  stageDot: {
    flex: 1,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  stageDotDone: {
    backgroundColor: Colors.teal,
  },
  stageDotActive: {
    backgroundColor: Colors.ruler,
  },
  scrollBody: {
    paddingHorizontal: 15,
    paddingTop: 4,
    paddingBottom: 28,
  },
});
