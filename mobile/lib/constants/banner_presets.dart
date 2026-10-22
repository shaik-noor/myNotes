import 'package:flutter/cupertino.dart';

class CoverPreset {
  final String id;
  final String name;
  final List<Color> colors;

  const CoverPreset({
    required this.id,
    required this.name,
    required this.colors,
  });
}

class BannerPresets {
  BannerPresets._();

  static const List<CoverPreset> gradients = [
    CoverPreset(
      id: 'bg-gradient-purple-horizon',
      name: 'Purple Horizon',
      colors: [Color(0xFF7C3AED), Color(0xFF4F46E5), Color(0xFF06B6D4)],
    ),
    CoverPreset(
      id: 'bg-gradient-aurora',
      name: 'Aurora',
      colors: [Color(0xFF10B981), Color(0xFF0D9488), Color(0xFF4F46E5)],
    ),
    CoverPreset(
      id: 'bg-gradient-sunset',
      name: 'Sunset Glow',
      colors: [Color(0xFFFB923C), Color(0xFFEC4899), Color(0xFFF43F5E)],
    ),
    CoverPreset(
      id: 'bg-gradient-ocean',
      name: 'Ocean Breeze',
      colors: [Color(0xFF38BDF8), Color(0xFF3B82F6), Color(0xFF4F46E5)],
    ),
    CoverPreset(
      id: 'bg-gradient-forest',
      name: 'Deep Forest',
      colors: [Color(0xFF064E3B), Color(0xFF042F2E), Color(0xFF111827)],
    ),
    CoverPreset(
      id: 'bg-gradient-crimson',
      name: 'Crimson Amber',
      colors: [Color(0xFFEF4444), Color(0xFFF59E0B)],
    ),
    CoverPreset(
      id: 'bg-gradient-slate',
      name: 'Slate Minimal',
      colors: [Color(0xFF334155), Color(0xFF1E293B)],
    ),
  ];

  static const List<String> presetEmojis = [
    '📝', '💻', '🚀', '💡', '📅', '🎯',
    '🎨', '🧪', '📁', '🔑', '📈', '💬',
    '⚠️', '✅', '📌', '🔒', '🌍', '🧠',
    '🏢', '⚡', '🔍', '🛠️', '📊', '✨',
    '🔥', '⭐', '📚', '☕', '💡', '🏆',
  ];

  static CoverPreset? findPreset(String? coverImage) {
    if (coverImage == null || coverImage.isEmpty) return null;
    try {
      return gradients.firstWhere((g) => g.id == coverImage || coverImage.contains(g.id));
    } catch (_) {
      return null;
    }
  }
}
