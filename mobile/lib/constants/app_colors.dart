import 'package:flutter/cupertino.dart';

/// Apple Human Interface Guidelines dynamic system colors and palette tokens
class AppColors {
  AppColors._();

  // Primary Apple iOS System Colors (Light)
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSecondaryBackground = Color(0xFFF2F2F7);
  static const Color lightTertiaryBackground = Color(0xFFE5E5EA);
  static const Color lightCardBackground = Color(0xFFFFFFFF);
  static const Color lightSeparator = Color(0xFFC6C6C8);
  static const Color lightLabel = Color(0xFF000000);
  static const Color lightSecondaryLabel = Color(0xFF8E8E93);
  static const Color lightTertiaryLabel = Color(0xFFC7C7CC);

  // Deep OLED Dark Mode (iOS HIG)
  static const Color darkBackground = Color(0xFF0A0A0C);
  static const Color darkSecondaryBackground = Color(0xFF141418);
  static const Color darkTertiaryBackground = Color(0xFF1E1E24);
  static const Color darkCardBackground = Color(0xFF16161B);
  static const Color darkSeparator = Color(0xFF2C2C35);
  static const Color darkLabel = Color(0xFFF8F9FA);
  static const Color darkSecondaryLabel = Color(0xFF9898A0);
  static const Color darkTertiaryLabel = Color(0xFF5A5A65);

  // Palettes (Matching desktop app)
  // Blue (Default iOS System Blue)
  static const Color blueLight = Color(0xFF007AFF);
  static const Color blueDark = Color(0xFF0A84FF);

  // Purple
  static const Color purpleLight = Color(0xFFAF52DE);
  static const Color purpleDark = Color(0xFFBF5AF2);

  // Amber / Orange
  static const Color amberLight = Color(0xFFFF9500);
  static const Color amberDark = Color(0xFFFF9F0A);

  // Emerald / Green
  static const Color emeraldLight = Color(0xFF34C759);
  static const Color emeraldDark = Color(0xFF30D158);

  // Rose / Red
  static const Color roseLight = Color(0xFFFF2D55);
  static const Color roseDark = Color(0xFFFF375F);

  static Color getAccent(String paletteName, bool isDark) {
    switch (paletteName.toLowerCase()) {
      case 'purple':
        return isDark ? purpleDark : purpleLight;
      case 'amber':
        return isDark ? amberDark : amberLight;
      case 'emerald':
        return isDark ? emeraldDark : emeraldLight;
      case 'rose':
        return isDark ? roseDark : roseLight;
      case 'blue':
      default:
        return isDark ? blueDark : blueLight;
    }
  }

  static Color getCardBackground(bool isDark) =>
      isDark ? darkCardBackground : lightCardBackground;

  static Color getBackground(bool isDark) =>
      isDark ? darkBackground : lightBackground;

  static Color getSecondaryBackground(bool isDark) =>
      isDark ? darkSecondaryBackground : lightSecondaryBackground;

  static Color getSeparator(bool isDark) =>
      isDark ? darkSeparator : lightSeparator;

  static Color getLabel(bool isDark) =>
      isDark ? darkLabel : lightLabel;

  static Color getSecondaryLabel(bool isDark) =>
      isDark ? darkSecondaryLabel : lightSecondaryLabel;
}
