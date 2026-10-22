/// Matches desktop AppSettings model
class AppSettings {
  final String theme; // 'system' | 'light' | 'dark'
  final String palette; // 'blue' | 'purple' | 'amber' | 'emerald' | 'rose'
  final String fontClass;
  final bool fullWidthDefault;
  final int autoSaveDelay;

  const AppSettings({
    this.theme = 'system',
    this.palette = 'blue',
    this.fontClass = 'font-sans-editor',
    this.fullWidthDefault = false,
    this.autoSaveDelay = 800,
  });

  AppSettings copyWith({
    String? theme,
    String? palette,
    String? fontClass,
    bool? fullWidthDefault,
    int? autoSaveDelay,
  }) {
    return AppSettings(
      theme: theme ?? this.theme,
      palette: palette ?? this.palette,
      fontClass: fontClass ?? this.fontClass,
      fullWidthDefault: fullWidthDefault ?? this.fullWidthDefault,
      autoSaveDelay: autoSaveDelay ?? this.autoSaveDelay,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'theme': theme,
      'palette': palette,
      'fontClass': fontClass,
      'fullWidthDefault': fullWidthDefault,
      'autoSaveDelay': autoSaveDelay,
    };
  }

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      theme: json['theme'] as String? ?? 'system',
      palette: json['palette'] as String? ?? 'blue',
      fontClass: json['fontClass'] as String? ?? 'font-sans-editor',
      fullWidthDefault: json['fullWidthDefault'] as bool? ?? false,
      autoSaveDelay: json['autoSaveDelay'] as int? ?? 800,
    );
  }
}
