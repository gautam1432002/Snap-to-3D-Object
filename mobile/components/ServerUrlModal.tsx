import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { PaperSheet } from './PaperSheet';
import { CraftButton } from './CraftButton';
import {
  checkBackendHealth,
  getActiveApiBaseUrl,
  getEnvDefaultApiUrl,
  saveActiveApiBaseUrl,
} from '../services/api';

interface ServerUrlModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (newUrl: string, isOnline: boolean) => void;
}

export function ServerUrlModal({ visible, onClose, onSaved }: ServerUrlModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      getActiveApiBaseUrl().then((u) => setUrlInput(u));
      setStatusMsg(null);
    }
  }, [visible]);

  const handleTestAndSave = async () => {
    const clean = urlInput.trim().replace(/\/+$/, '');
    if (!clean) {
      setStatusOk(false);
      setStatusMsg('Please enter a valid URL like http://192.168.1.5:8000');
      return;
    }
    setTesting(true);
    setStatusMsg('Checking FastAPI /health...');
    const res = await checkBackendHealth(clean);
    await saveActiveApiBaseUrl(clean);
    setTesting(false);
    setStatusOk(res.ok);
    setStatusMsg(
      res.ok
        ? `Connected to ${res.url} (${res.statusText})`
        : `Saved ${res.url}, but /health failed: ${res.statusText}`
    );
    onSaved?.(clean, res.ok);
  };

  const handleReset = async () => {
    const def = getEnvDefaultApiUrl();
    setUrlInput(def);
    await saveActiveApiBaseUrl(null);
    const res = await checkBackendHealth(def);
    setStatusOk(res.ok);
    setStatusMsg(`Reset to default ${def} (${res.ok ? 'Online' : res.statusText})`);
    onSaved?.(def, res.ok);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <PaperSheet style={styles.card}>
          <Text style={styles.title}>Backend Server URL</Text>
          <Text style={styles.sub}>
            Set your PC's Wi-Fi IPv4 address (with FastAPI running on port 8000).
          </Text>

          <TextInput
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://192.168.1.5:8000"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />

          {statusMsg && (
            <View style={[styles.statusBox, statusOk ? styles.statusOk : styles.statusErr]}>
              <Text style={[styles.statusText, statusOk ? styles.textOk : styles.textErr]}>
                {statusMsg}
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <CraftButton
              title="Reset"
              variant="paper"
              small
              onPress={handleReset}
              style={{ flex: 0.7 }}
            />
            <CraftButton
              title={testing ? 'Testing...' : 'Save & Test'}
              variant="teal"
              small
              loading={testing}
              onPress={handleTestAndSave}
              style={{ flex: 1.3 }}
            />
          </View>

          <CraftButton
            title="Done"
            variant="primary"
            small
            onPress={onClose}
            style={{ width: '100%', marginTop: 8 }}
          />
        </PaperSheet>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 16, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  sub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 17,
  },
  input: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#cbd5d1',
    backgroundColor: '#ffffff',
    color: Colors.ink,
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  statusBox: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1.2,
    marginBottom: 10,
  },
  statusOk: {
    backgroundColor: '#d4f5ee',
    borderColor: Colors.teal,
  },
  statusErr: {
    backgroundColor: '#fee2e2',
    borderColor: Colors.cut,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  textOk: { color: '#0f5c52' },
  textErr: { color: '#991b1b' },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
});
