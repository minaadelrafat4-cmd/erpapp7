import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { RoleGate } from '@components/RoleGate';
import { useThemeStore } from '@store/themeStore';
import { useResponsive } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import { fetchProductIdByBarcode } from '@services/erpService';
import type { ThemeColors } from '@apptypes';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export default function BarcodeScannerScreen() {
  const { colors } = useThemeStore();
  const router = useRouter();
  const layout = useResponsive();

  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const requestPermission = useCallback(async () => {
    try {
      const response = await requestCameraPermission();
      const status = response.granted ? 'granted' : 'denied';
      setPermission(status);
      if (status === 'granted') {
        setScanning(true);
      }
    } catch {
      setPermission('denied');
    }
  }, [requestCameraPermission]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || searching) return;
      setScanned(true);
      setScanning(false);
      await lookupBarcode(data);
    },
    [scanned, searching],
  );

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      const trimmed = barcode.trim();
      if (!trimmed) {
        Alert.alert('Invalid Barcode', 'The barcode is empty. Try scanning again or enter it manually.');
        setScanned(false);
        setScanning(true);
        return;
      }
      setSearching(true);
      try {
        const productId = await fetchProductIdByBarcode(trimmed);
        if (productId) {
          router.push({ pathname: '/(app)/products/[id]', params: { id: productId } } as never);
        } else {
          Alert.alert(
            'No Matching Product',
            `No product found for barcode "${trimmed}". Check the barcode or try another.`,
            [
              { text: 'OK', onPress: () => { setScanned(false); setScanning(true); setManualBarcode(''); } },
            ],
          );
        }
      } catch {
        Alert.alert(
          'Lookup Failed',
          'Could not search for the product. Check your connection and try again.',
          [{ text: 'OK', onPress: () => { setScanned(false); setScanning(true); } }],
        );
      } finally {
        setSearching(false);
      }
    },
    [router],
  );

  const handleManualSubmit = useCallback(() => {
    const code = manualBarcode.trim();
    if (!code) {
      Alert.alert('Empty', 'Please enter a barcode.');
      return;
    }
    lookupBarcode(code);
  }, [manualBarcode, lookupBarcode]);

  const handleRescan = useCallback(() => {
    setScanned(false);
    setScanning(true);
    setManualBarcode('');
  }, []);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && permission === 'granted' && !scanned) {
        setScanning(true);
      } else if (state !== 'active') {
        setScanning(false);
      }
    });
    return () => subscription.remove();
  }, [permission, scanned]);

  const renderCameraView = () => {
    if (permission === 'undetermined') {
      return (
        <View style={[styles.permissionContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.surfaceElevated }]}>
            <MaterialCommunityIcons name={getIconName('scan')} size={48} color={colors.gold} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>Camera Permission Needed</Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
            This app needs camera access to scan product barcodes and QR codes.
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.gold }]}
            onPress={requestPermission}
            activeOpacity={0.7}
          >
            <Text style={[styles.permissionBtnText, { color: colors.ink }]}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (permission === 'denied') {
      return (
        <View style={[styles.permissionContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.surfaceElevated }]}>
            <MaterialCommunityIcons name="camera-off" size={48} color={colors.error} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>Camera Access Denied</Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
            Camera permission was denied. You can still search for products by entering the barcode manually below.
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.gold }]}
            onPress={requestPermission}
            activeOpacity={0.7}
          >
            <Text style={[styles.permissionBtnText, { color: colors.ink }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            enableTorch={torchOn}
            onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
                'code128', 'code39', 'code93', 'codabar',
                'pdf417', 'datamatrix', 'itf14', 'aztec',
              ],
            }}
          />
          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={[styles.scanFrame, { borderColor: colors.gold }]}>
              <View style={[styles.scanCorner, styles.cornerTL, { borderColor: colors.gold }]} />
              <View style={[styles.scanCorner, styles.cornerTR, { borderColor: colors.gold }]} />
              <View style={[styles.scanCorner, styles.cornerBL, { borderColor: colors.gold }]} />
              <View style={[styles.scanCorner, styles.cornerBR, { borderColor: colors.gold }]} />
            </View>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: colors.surface }]}
              onPress={() => setTorchOn((v) => !v)}
            >
              <MaterialCommunityIcons name={torchOn ? 'flashlight' : 'flashlight-off'} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            {scanned && (
              <TouchableOpacity
                style={[styles.cameraBtn, { backgroundColor: colors.gold }]}
                onPress={handleRescan}
              >
                <MaterialCommunityIcons name="refresh" size={20} color={colors.ink} />
                <Text style={[styles.rescanText, { color: colors.ink }]}>Rescan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {searching && (
          <View style={styles.searchingOverlay}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={[styles.searchingText, { color: colors.textPrimary }]}>Looking up product…</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <RoleGate minRank={navMinRank('products')}>
      <ScreenWrapper>
        <AppHeader title="Barcode Scanner" subtitle="Scan to find products" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          {renderCameraView()}

          <View style={[styles.manualContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.manualTitle, { color: colors.textPrimary }]}>Manual Entry</Text>
            <Text style={[styles.manualDesc, { color: colors.textMuted }]}>
              Enter the barcode manually if scanning fails or the camera is unavailable.
            </Text>
            <View style={styles.manualInputRow}>
              <TextInput
                style={[styles.manualInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary, borderColor: colors.border }]}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholder="Enter barcode…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="search"
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: colors.gold }]}
                onPress={handleManualSubmit}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color={colors.ink} />
                ) : (
                  <MaterialCommunityIcons name="magnify" size={20} color={colors.ink} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 16 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, borderRadius: 16 },
  permissionIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  permissionTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permissionDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  permissionBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  permissionBtnText: { fontSize: 15, fontWeight: '600' },
  cameraContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 300 },
  camera: { flex: 1 },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 220, height: 220, borderWidth: 1, borderRadius: 12, backgroundColor: 'transparent' },
  scanCorner: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  cornerTL: { top: -1, left: -1, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: -1, right: -1, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: -1, left: -1, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -1, right: -1, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },
  cameraControls: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  rescanText: { fontSize: 14, fontWeight: '600' },
  searchingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.5)' },
  searchingText: { fontSize: 15, fontWeight: '600' },
  manualContainer: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  manualTitle: { fontSize: 15, fontWeight: '700' },
  manualDesc: { fontSize: 13, lineHeight: 18 },
  manualInputRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  manualInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  manualBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
