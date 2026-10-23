import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/note.dart';
import '../models/app_settings.dart';
import '../models/attachment.dart';

/// Local offline storage service for fast startup and offline edits.
class StorageService {
  static const String _keyNotes = 'mynotes_local_notes';
  static const String _keySettings = 'mynotes_app_settings';
  static const String _keyAttachments = 'mynotes_local_attachments';
  static const String _keySyncToken = 'mynotes_sync_access_token';
  static const String _keyRefreshToken = 'mynotes_sync_refresh_token';
  static const String _keyTokenExpiry = 'mynotes_sync_token_expiry';
  static const String _keyUserEmail = 'mynotes_sync_user_email';
  static const String _keyUserName = 'mynotes_sync_user_name';
  static const String _keyUserPicture = 'mynotes_sync_user_picture';
  static const String _keyLastSyncTime = 'mynotes_sync_last_time';
  static const String _keyFileId = 'mynotes_sync_file_id';
  static const String _keyAutoSync = 'mynotes_sync_auto_sync';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  // --- Notes ---
  List<Note> loadNotes() {
    final raw = _prefs.getString(_keyNotes);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => Note.fromJson(item))
          .where((note) => !loadDeletedNoteIds().contains(note.id))
          .toList();
    } catch (e) {
      print('Error reading local notes: $e');
      return [];
    }
  }

  Future<bool> saveNotes(List<Note> notes) async {
    final raw = jsonEncode(notes.map((n) => n.toJson()).toList());
    return _prefs.setString(_keyNotes, raw);
  }

  Set<String> loadDeletedNoteIds() =>
      (_prefs.getStringList('mynotes_deleted_note_ids') ?? []).toSet();

  Future<bool> saveDeletedNoteIds(Set<String> ids) =>
      _prefs.setStringList('mynotes_deleted_note_ids', ids.toList());

  Set<String> loadDeletedAttachmentIds() =>
      (_prefs.getStringList('mynotes_deleted_attachment_ids') ?? []).toSet();

  Future<bool> saveDeletedAttachmentIds(Set<String> ids) =>
      _prefs.setStringList('mynotes_deleted_attachment_ids', ids.toList());

  // --- Attachments ---
  Map<String, List<NoteAttachmentRow>> loadAttachments() {
    final raw = _prefs.getString(_keyAttachments);
    if (raw == null || raw.isEmpty) return {};
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final result = <String, List<NoteAttachmentRow>>{};
      map.forEach((k, v) {
        if (v is List) {
          result[k] = v
              .whereType<Map<String, dynamic>>()
              .map((row) => NoteAttachmentRow.fromJson(row))
              .toList();
        }
      });
      return result;
    } catch (e) {
      return {};
    }
  }

  Future<bool> saveAttachments(Map<String, List<NoteAttachmentRow>> map) async {
    final encodable = <String, dynamic>{};
    map.forEach((k, v) {
      encodable[k] = v.map((a) => a.toJson()).toList();
    });
    return _prefs.setString(_keyAttachments, jsonEncode(encodable));
  }

  // --- App Settings ---
  AppSettings loadSettings() {
    final raw = _prefs.getString(_keySettings);
    if (raw == null || raw.isEmpty) return const AppSettings();
    try {
      return AppSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return const AppSettings();
    }
  }

  Future<bool> saveSettings(AppSettings settings) async {
    return _prefs.setString(_keySettings, jsonEncode(settings.toJson()));
  }

  // --- Auth & Sync Credentials ---
  String? getAccessToken() => _prefs.getString(_keySyncToken);
  Future<void> setAccessToken(String? token) async {
    if (token == null) {
      await _prefs.remove(_keySyncToken);
    } else {
      await _prefs.setString(_keySyncToken, token);
    }
  }

  String? getRefreshToken() => _prefs.getString(_keyRefreshToken);
  Future<void> setRefreshToken(String? token) async {
    if (token == null) {
      await _prefs.remove(_keyRefreshToken);
    } else {
      await _prefs.setString(_keyRefreshToken, token);
    }
  }

  int getTokenExpiry() => _prefs.getInt(_keyTokenExpiry) ?? 0;
  Future<void> setTokenExpiry(int timestamp) =>
      _prefs.setInt(_keyTokenExpiry, timestamp);

  String? getUserEmail() => _prefs.getString(_keyUserEmail);
  Future<void> setUserEmail(String? email) async {
    if (email == null) {
      await _prefs.remove(_keyUserEmail);
    } else {
      await _prefs.setString(_keyUserEmail, email);
    }
  }

  String? getUserName() => _prefs.getString(_keyUserName);
  Future<void> setUserName(String? name) async {
    if (name == null) {
      await _prefs.remove(_keyUserName);
    } else {
      await _prefs.setString(_keyUserName, name);
    }
  }

  String? getUserPicture() => _prefs.getString(_keyUserPicture);
  Future<void> setUserPicture(String? pic) async {
    if (pic == null) {
      await _prefs.remove(_keyUserPicture);
    } else {
      await _prefs.setString(_keyUserPicture, pic);
    }
  }

  String? getLastSyncTime() => _prefs.getString(_keyLastSyncTime);
  Future<void> setLastSyncTime(String? time) async {
    if (time == null) {
      await _prefs.remove(_keyLastSyncTime);
    } else {
      await _prefs.setString(_keyLastSyncTime, time);
    }
  }

  String? getFileId() => _prefs.getString(_keyFileId);
  Future<void> setFileId(String? id) async {
    if (id == null) {
      await _prefs.remove(_keyFileId);
    } else {
      await _prefs.setString(_keyFileId, id);
    }
  }

  bool getAutoSync() => _prefs.getBool(_keyAutoSync) ?? true;
  Future<void> setAutoSync(bool enabled) =>
      _prefs.setBool(_keyAutoSync, enabled);

  Future<void> clearAuth() async {
    await _prefs.remove(_keySyncToken);
    await _prefs.remove(_keyRefreshToken);
    await _prefs.remove(_keyTokenExpiry);
    await _prefs.remove(_keyUserEmail);
    await _prefs.remove(_keyUserName);
    await _prefs.remove(_keyUserPicture);
    await _prefs.remove(_keyFileId);
  }
}
