import 'package:flutter/cupertino.dart';
import '../models/app_settings.dart';
import '../services/storage_service.dart';

class SettingsProvider extends ChangeNotifier {
  final StorageService _storage;
  AppSettings _settings;

  SettingsProvider(this._storage) : _settings = _storage.loadSettings();

  AppSettings get settings => _settings;
  String get theme => _settings.theme;
  String get palette => _settings.palette;
  String get fontClass => _settings.fontClass;
  bool get fullWidthDefault => _settings.fullWidthDefault;

  bool isDarkMode(BuildContext context) {
    if (_settings.theme == 'dark') return true;
    if (_settings.theme == 'light') return false;
    final brightness = MediaQuery.of(context).platformBrightness;
    return brightness == Brightness.dark;
  }

  Future<void> updateTheme(String theme) async {
    _settings = _settings.copyWith(theme: theme);
    await _storage.saveSettings(_settings);
    notifyListeners();
  }

  Future<void> updatePalette(String palette) async {
    _settings = _settings.copyWith(palette: palette);
    await _storage.saveSettings(_settings);
    notifyListeners();
  }

  Future<void> updateFont(String fontClass) async {
    _settings = _settings.copyWith(fontClass: fontClass);
    await _storage.saveSettings(_settings);
    notifyListeners();
  }

  Future<void> updateFullWidthDefault(bool value) async {
    _settings = _settings.copyWith(fullWidthDefault: value);
    await _storage.saveSettings(_settings);
    notifyListeners();
  }
}
