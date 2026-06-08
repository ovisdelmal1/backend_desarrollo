import { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../theme';

export function ImagePickerButton({ onImageSelected, image, label, error }) {
  const [loading, setLoading] = useState(false);

  async function handlePickImage() {
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        const filename = selectedImage.uri.split('/').pop() || 'image.jpg';
        onImageSelected({
          uri: selectedImage.uri,
          name: filename,
          type: 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('[ImagePickerButton]', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTakePhoto() {
    setLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        console.warn('[ImagePickerButton] Camera permission denied');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        const filename = selectedImage.uri.split('/').pop() || 'image.jpg';
        onImageSelected({
          uri: selectedImage.uri,
          name: filename,
          type: 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('[ImagePickerButton]', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[typography.labelMd, { marginBottom: spacing.xs }]}>
          {label}
        </Text>
      )}

      {image ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: image.uri }} style={styles.image} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onImageSelected(null)}
            disabled={loading}
          >
            <MaterialIcons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cameraButton]}
              onPress={handleTakePhoto}
              disabled={loading}
            >
              <MaterialIcons name="camera-alt" size={24} color={colors.white} />
              <Text style={[typography.labelSm, { color: colors.white, marginTop: spacing.xs }]}>
                Cámara
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.galleryButton]}
              onPress={handlePickImage}
              disabled={loading}
            >
              <MaterialIcons name="image" size={24} color={colors.white} />
              <Text style={[typography.labelSm, { color: colors.white, marginTop: spacing.xs }]}>
                Galería
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && (
        <Text style={[typography.captionMd, { color: colors.error, marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  imagePreview: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: { width: '100%', height: '100%' },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: 20,
    padding: 4,
  },
  placeholderContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.outline,
    borderStyle: 'dashed',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: { backgroundColor: colors.blue },
  galleryButton: { backgroundColor: colors.teal },
});
