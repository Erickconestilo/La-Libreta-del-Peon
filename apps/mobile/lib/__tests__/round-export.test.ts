import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiRequestError } from '../api';
import { getRoundExportErrorMessage, shareRoundExport, type RoundExportDependencies } from '../round-export';

const mockDownload = jest.fn<RoundExportDependencies['download']>();
const mockWriteBase64 = jest.fn<RoundExportDependencies['writeBase64']>();
const mockIsAvailable = jest.fn<RoundExportDependencies['isAvailable']>();
const mockShare = jest.fn<RoundExportDependencies['share']>();

const dependencies: RoundExportDependencies = {
  directory: 'file:///cache/',
  download: mockDownload,
  isAvailable: mockIsAvailable,
  share: mockShare,
  writeBase64: mockWriteBase64
};

describe('round export sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads an authenticated export and opens the native share sheet', async () => {
    mockDownload.mockResolvedValueOnce({
      body: new Uint8Array([84, 111, 112, 111]).buffer,
      contentType: 'text/csv'
    });
    mockIsAvailable.mockResolvedValueOnce(true);
    mockShare.mockResolvedValueOnce(undefined);

    await shareRoundExport('round/one', 'csv', dependencies);

    expect(mockDownload).toHaveBeenCalledWith('/rounds/round%2Fone/export?format=csv');
    expect(mockWriteBase64).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/topofield-ronda-roundone-/),
      expect.any(String)
    );
    expect(mockShare).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/topofield-ronda-roundone-/),
      expect.objectContaining({ mimeType: 'text/csv' })
    );
  });

  it('stops without writing when the device has no share target', async () => {
    mockDownload.mockResolvedValueOnce({ body: new ArrayBuffer(0), contentType: null });
    mockIsAvailable.mockResolvedValueOnce(false);

    await expect(shareRoundExport('round-1', 'xlsx', dependencies)).rejects.toThrow('no permite compartir');
    expect(mockWriteBase64).not.toHaveBeenCalled();
  });

  it('shows safe HTTP diagnostics for an API failure', () => {
    const message = getRoundExportErrorMessage(new ApiRequestError(500, 'No se pudo completar la operación.', {
      code: 'ROUND_EXPORT_FAILED',
      rawMessage: 'database details must not be displayed',
      requestId: '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812'
    }));

    expect(message).toBe(
      'No se pudo completar la operación. (HTTP 500 · ROUND_EXPORT_FAILED · Código de soporte: 6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812)'
    );
    expect(message).not.toContain('database details');
  });

  it('does not display an untrusted support id', () => {
    const message = getRoundExportErrorMessage(new ApiRequestError(403, 'No tienes permiso.', {
      code: 'READ_ONLY_PROJECT_MEMBERSHIP',
      requestId: 'token-or-body'
    }));

    expect(message).toBe('No tienes permiso. (HTTP 403 · READ_ONLY_PROJECT_MEMBERSHIP)');
  });

});
