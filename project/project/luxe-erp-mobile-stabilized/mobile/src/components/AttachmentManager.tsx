import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@store/themeStore';
import { getIconName } from '@config/icons';
import { supabase } from '@lib/supabase';
import type { FileAttachment, AttachmentEntityType } from '@apptypes/erp';
import { formatFileSize, formatDateTime } from '@lib/format';

interface AttachmentManagerProps {
  entityType: AttachmentEntityType;
  entityId: string;
  attachments: FileAttachment[];
  onRefresh: () => void;
}

export function AttachmentManager({ entityType, entityId, attachments, onRefresh }: AttachmentManagerProps) {
  const { colors } = useThemeStore();
  const [uploading, setUploading] = React.useState(false);

  const pickAndUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      const fileExt = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${entityType}/${entityId}/${Date.now()}.${fileExt}`;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, blob, { contentType: mimeType });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
      const fileUrl = urlData.publicUrl;

      const fileType = mimeType.startsWith('image/') ? 'image' : mimeType.includes('pdf') ? 'pdf' : 'document';

      const { error: insertError } = await supabase.from('file_attachments').insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: asset.fileName ?? fileName.split('/').pop() ?? 'file',
        file_url: fileUrl,
        file_type: fileType,
        mime_type: mimeType,
        file_size: asset.fileSize ?? null,
        uploaded_by: userId ?? null,
      });

      if (insertError) throw insertError;

      onRefresh();
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload file.');
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = (attachment: FileAttachment) => {
    Alert.alert('Delete Attachment', `Remove "${attachment.file_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const filePath = attachment.file_url.split('/attachments/').pop();
            if (filePath) {
              await supabase.storage.from('attachments').remove([filePath]);
            }
            await supabase.from('file_attachments').delete().eq('id', attachment.id);
            onRefresh();
          } catch {
            Alert.alert('Error', 'Could not delete attachment.');
          }
        },
      },
    ]);
  };

  const getAttachmentIcon = (fileType: string): string => {
    if (fileType === 'image') return 'image';
    if (fileType === 'pdf') return 'file-pdf-box';
    return 'file-document-outline';
  };

  const renderItem = ({ item }: { item: FileAttachment }) => (
    <View style={[styles.attachmentItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={getAttachmentIcon(item.file_type) as never} size={28} color={colors.gold} />
      <View style={styles.attachmentInfo}>
        <Text style={[styles.attachmentName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text style={[styles.attachmentMeta, { color: colors.textMuted }]}>
          {formatFileSize(item.file_size)} · {formatDateTime(item.created_at)}
        </Text>
      </View>
      <TouchableOpacity onPress={() => deleteAttachment(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.textMuted }]}>ATTACHMENTS</Text>
      <TouchableOpacity
        style={[styles.uploadBtn, { borderColor: colors.gold }]}
        onPress={pickAndUpload}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.gold} />
        ) : (
          <MaterialCommunityIcons name={getIconName('paperclip')} size={16} color={colors.gold} />
        )}
        <Text style={[styles.uploadText, { color: colors.gold }]}>
          {uploading ? 'Uploading…' : 'Add File'}
        </Text>
      </TouchableOpacity>
    </View>

      {attachments.length === 0 && !uploading ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No attachments yet.</Text>
      ) : (
        <FlatList
          data={attachments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  uploadText: { fontSize: 12, fontWeight: '600' },
  list: { gap: 8 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  attachmentInfo: { flex: 1, gap: 2 },
  attachmentName: { fontSize: 13, fontWeight: '500' },
  attachmentMeta: { fontSize: 11 },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
});
