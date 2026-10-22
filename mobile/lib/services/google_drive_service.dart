import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/backup_manifest.dart';
import 'auth_service.dart';

class GoogleDriveService {
  static const String driveFilesUrl = 'https://www.googleapis.com/drive/v3/files';
  static const String driveUploadUrl = 'https://www.googleapis.com/upload/drive/v3/files';
  static const String vaultFilename = 'mynotes_vault.json';

  final AuthService _authService;

  GoogleDriveService(this._authService);

  /// Search for an existing `mynotes_vault.json` in `appDataFolder`
  Future<String?> findVaultFileId() async {
    final token = await _authService.getValidAccessToken();
    final url = Uri.parse(
      '$driveFilesUrl?spaces=appDataFolder&q=name+%3D+%27$vaultFilename%27+and+trashed+%3D+false&fields=files(id%2Cname)',
    );

    final res = await http.get(
      url,
      headers: {'Authorization': 'Bearer $token'},
    );

    if (res.statusCode != 200) {
      throw Exception('Drive search failed (${res.statusCode}): ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final files = data['files'] as List? ?? [];
    if (files.isNotEmpty) {
      final first = files.first as Map<String, dynamic>;
      return first['id'] as String?;
    }
    return null;
  }

  /// Download the remote BackupManifest vault file from Google Drive
  Future<BackupManifest?> downloadVault(String fileId) async {
    final token = await _authService.getValidAccessToken();
    final url = Uri.parse('$driveFilesUrl/$fileId?alt=media');

    final res = await http.get(
      url,
      headers: {'Authorization': 'Bearer $token'},
    );

    if (res.statusCode != 200) {
      throw Exception('Drive download failed (${res.statusCode}): ${res.body}');
    }

    final decoded = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    return BackupManifest.fromJson(decoded);
  }

  /// Create a new vault file in `appDataFolder` via multipart upload
  Future<String> createVaultFile(BackupManifest manifest) async {
    final token = await _authService.getValidAccessToken();
    final manifestBytes = utf8.encode(jsonEncode(manifest.toJson()));

    final boundary = '----MyNotesBoundary${DateTime.now().millisecondsSinceEpoch}';
    final metadata = jsonEncode({
      'name': vaultFilename,
      'parents': ['appDataFolder'],
    });

    final bodyBytes = <int>[];
    bodyBytes.addAll(utf8.encode('--$boundary\r\n'));
    bodyBytes.addAll(utf8.encode('Content-Type: application/json; charset=UTF-8\r\n\r\n'));
    bodyBytes.addAll(utf8.encode('$metadata\r\n'));

    bodyBytes.addAll(utf8.encode('--$boundary\r\n'));
    bodyBytes.addAll(utf8.encode('Content-Type: application/json\r\n\r\n'));
    bodyBytes.addAll(manifestBytes);
    bodyBytes.addAll(utf8.encode('\r\n--$boundary--\r\n'));

    final url = Uri.parse('$driveUploadUrl?uploadType=multipart');
    final res = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'multipart/related; boundary=$boundary',
        'Content-Length': bodyBytes.length.toString(),
      },
      body: bodyBytes,
    );

    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Drive upload failed (${res.statusCode}): ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return data['id'] as String;
  }

  /// Update an existing vault file in Google Drive via media patch
  Future<void> updateVaultFile(String fileId, BackupManifest manifest) async {
    final token = await _authService.getValidAccessToken();
    final manifestBytes = utf8.encode(jsonEncode(manifest.toJson()));

    final url = Uri.parse('$driveUploadUrl/$fileId?uploadType=media');
    final res = await http.patch(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: manifestBytes,
    );

    if (res.statusCode != 200) {
      throw Exception('Drive patch update failed (${res.statusCode}): ${res.body}');
    }
  }
}
