import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Generates PDF via expo-print and copies it into a readable Expo cache URI
 * before calling Sharing.shareAsync so Android never throws
 * "Not allowed to read file under given URL".
 */
export async function sharePrintablePdf(
  html: string,
  modelName: string,
  paperSize: 'A4' | 'Letter'
): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  const safeName = (modelName || 'foldly-craft')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'foldly-craft';

  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const destUri = `${baseDir}foldly-${safeName}-${paperSize}.pdf`;

  try {
    await FileSystem.deleteAsync(destUri, { idempotent: true });
  } catch {}

  await FileSystem.copyAsync({
    from: uri,
    to: destUri,
  });

  await Sharing.shareAsync(destUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save or Share Papercraft PDF',
    UTI: 'com.adobe.pdf',
  });

  return destUri;
}

export async function printHtmlDirectly(html: string): Promise<void> {
  await Print.printAsync({ html });
}
