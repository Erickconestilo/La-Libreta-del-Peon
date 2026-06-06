import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Image, Platform } from 'react-native';

import type { PhotoContentType } from '@shared/types';

export interface PreparedPhoto {
  contentType: PhotoContentType;
  fileSizeBytes: number;
  height: number;
  localUri: string;
  width: number;
}

export type PhotoSource = 'camera' | 'library';

const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.72;
const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;
const CONTENT_URI_PREFIX = 'content://';

type PickedPhoto = {
  uri: string;
  width?: number;
};

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

  if (Platform.OS === 'android') {
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
    quality: 1,
    selectionLimit: 1
  };

  if (source === 'camera') {
    return ImagePicker.launchCameraAsync(options);
  }

  return ImagePicker.launchImageLibraryAsync(options);
};

const pickAndroidLibraryPhoto = async (): Promise<PickedPhoto | null> => {
  const result = await File.pickFileAsync({
    mimeTypes: ['image/*']
  });

  if (result.canceled) {
    return null;
  }

  if (!result.result?.uri) {
    throw new Error('No se pudo leer la imagen seleccionada.');
  }

  return {
    uri: result.result.uri
  };
};

const pickImagePickerPhoto = async (source: PhotoSource): Promise<PickedPhoto | null> => {
  let pickerResult: ImagePicker.ImagePickerResult;

  try {
    pickerResult = await launchPhotoSource(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.includes("Uri lacks 'file' scheme") || message.includes('ExponentImagePicker.launchImageLibraryAsync')) {
      throw new Error('No se pudo abrir la imagen seleccionada. Reintenta desde Galería o haz una foto nueva.');
    }

    throw error;
  }

  if (pickerResult.canceled) {
    return null;
  }

  const asset = pickerResult.assets[0];

  if (!asset?.uri) {
    throw new Error('No se pudo leer la imagen seleccionada.');
  }

  return {
    uri: asset.uri,
    width: asset.width
  };
};

const pickPhotoSource = async (source: PhotoSource): Promise<PickedPhoto | null> => {
  if (source === 'library' && Platform.OS === 'android') {
    return pickAndroidLibraryPhoto();
  }

  return pickImagePickerPhoto(source);
};

const buildTemporaryPhotoUri = () => {
  if (!LegacyFileSystem.cacheDirectory) {
    throw new Error('No se pudo acceder a la caché local para preparar la imagen.');
  }

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${LegacyFileSystem.cacheDirectory}topofield-photo-source-${uniqueSuffix}.jpg`;
};

const prepareAssetUriForCompression = async (uri: string) => {
  if (!uri.startsWith(CONTENT_URI_PREFIX)) {
    return {
      shouldDelete: false,
      uri
    };
  }

  const localUri = buildTemporaryPhotoUri();

  try {
    await LegacyFileSystem.copyAsync({
      from: uri,
      to: localUri
    });
  } catch (error) {
    throw new Error('No se pudo copiar la imagen seleccionada desde Galería. Prueba con otra foto o con Cámara.');
  }

  return {
    shouldDelete: true,
    uri: localUri
  };
};

const deleteTemporaryUri = async (uri: string) => {
  try {
    await LegacyFileSystem.deleteAsync(uri, {
      idempotent: true
    });
  } catch {
    // Temporary gallery copies are safe to leave if Android refuses cleanup.
  }
};

const getImageWidth = async (uri: string) =>
  new Promise<number>((resolve) => {
    Image.getSize(
      uri,
      (width) => {
        resolve(width);
      },
      () => {
        resolve(0);
      }
    );
  });

export const pickAndCompressPhoto = async (source: PhotoSource): Promise<PreparedPhoto | null> => {
  await requestPhotoPermission(source);

  const pickedPhoto = await pickPhotoSource(source);

  if (!pickedPhoto) {
    return null;
  }

  const sourceForCompression = await prepareAssetUriForCompression(pickedPhoto.uri);
  let compressed: ImageManipulator.ImageResult;

  try {
    const imageWidth = pickedPhoto.width ?? (await getImageWidth(sourceForCompression.uri));

    compressed = await ImageManipulator.manipulateAsync(
      sourceForCompression.uri,
      buildResizeActions(imageWidth),
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );
  } finally {
    if (sourceForCompression.shouldDelete) {
      await deleteTemporaryUri(sourceForCompression.uri);
    }
  }

  const compressedFile = new File(compressed.uri);

  if (!compressedFile.exists || compressedFile.size <= 0) {
    throw new Error('No se pudo preparar la imagen comprimida.');
  }

  return {
    contentType: 'image/jpeg',
    fileSizeBytes: compressedFile.size,
    height: compressed.height,
    localUri: compressedFile.uri,
    width: compressed.width
  };
};

export const deletePreparedPhoto = async (preparedPhoto: PreparedPhoto | null) => {
  try {
    if (!preparedPhoto) {
      return;
    }

    const file = new File(preparedPhoto.localUri);

    if (file.exists) {
      file.delete();
    }
  } catch {
    // Temporary camera/cache files are safe to leave if Android refuses cleanup.
  }
};

export const uploadPreparedPhotoToSignedUrl = async (
  signedUrl: string,
  preparedPhoto: PreparedPhoto,
  options?: {
    timeoutMessage?: string;
    timeoutMs?: number;
  }
) => {
  const uploadFile = new File(preparedPhoto.localUri);

  if (!uploadFile.exists) {
    throw new Error('No se encontró el archivo temporal de la imagen para subirlo.');
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
  const timeoutMessage = options?.timeoutMessage ?? 'La subida de la imagen tardó demasiado. Reintenta con buena conexión.';
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await uploadFile.upload(signedUrl, {
      headers: {
        'cache-control': 'max-age=31536000',
        'content-type': preparedPhoto.contentType,
        'x-upsert': 'false'
      },
      httpMethod: 'PUT',
      signal: controller.signal,
      uploadType: UploadType.BINARY_CONTENT
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
