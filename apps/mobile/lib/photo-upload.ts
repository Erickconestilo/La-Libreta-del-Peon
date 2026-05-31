import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import type { PhotoContentType } from '@shared/types';

export interface PreparedPhoto {
  blob: Blob;
  contentType: PhotoContentType;
  fileSizeBytes: number;
  height: number;
  width: number;
}

export type PhotoSource = 'camera' | 'library';

const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.72;

const buildResizeActions = (width: number) => {
  if (!width || width <= MAX_IMAGE_WIDTH) {
    return [];
  }

  return [
    {
      resize: {
        width: MAX_IMAGE_WIDTH
      }
    }
  ];
};

const requestPhotoPermission = async (source: PhotoSource) => {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Necesitas permitir acceso a la cámara para hacer una foto.');
    }

    return;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);

  if (!permission.granted) {
    throw new Error('Necesitas permitir acceso a fotos para adjuntar una imagen.');
  }
};

const launchPhotoSource = async (source: PhotoSource) => {
  const options: ImagePicker.ImagePickerOptions = {
    allowsEditing: false,
    base64: false,
    exif: false,
    mediaTypes: ['images'],
    quality: 0.9,
    selectionLimit: 1
  };

  if (source === 'camera') {
    return ImagePicker.launchCameraAsync(options);
  }

  return ImagePicker.launchImageLibraryAsync(options);
};

export const pickAndCompressPhoto = async (source: PhotoSource): Promise<PreparedPhoto | null> => {
  await requestPhotoPermission(source);

  const pickerResult = await launchPhotoSource(source);

  if (pickerResult.canceled) {
    return null;
  }

  const asset = pickerResult.assets[0];

  if (!asset?.uri) {
    throw new Error('No se pudo leer la imagen seleccionada.');
  }

  const compressed = await ImageManipulator.manipulateAsync(
    asset.uri,
    buildResizeActions(asset.width),
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  try {
    const blobResponse = await fetch(compressed.uri);
    const blob = await blobResponse.blob();

    return {
      blob,
      contentType: 'image/jpeg',
      fileSizeBytes: blob.size,
      height: compressed.height,
      width: compressed.width
    };
  } finally {
    await FileSystem.deleteAsync(compressed.uri, { idempotent: true }).catch(() => undefined);
  }
};
