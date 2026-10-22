import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../constants/app_colors.dart';

class IosTheme {
  IosTheme._();

  static CupertinoThemeData getCupertinoTheme({
    required bool isDark,
    required String palette,
  }) {
    final accent = AppColors.getAccent(palette, isDark);
    final bg = AppColors.getBackground(isDark);
    final barBg = (isDark ? const Color(0xE6141418) : const Color(0xE6F2F2F7));
    final label = AppColors.getLabel(isDark);

    return CupertinoThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      primaryColor: accent,
      primaryContrastingColor: CupertinoColors.white,
      scaffoldBackgroundColor: bg,
      barBackgroundColor: barBg,
      textTheme: CupertinoTextThemeData(
        primaryColor: label,
        textStyle: TextStyle(
          fontFamily: '.SF Pro Text',
          fontSize: 17,
          color: label,
          letterSpacing: -0.4,
        ),
        navTitleTextStyle: TextStyle(
          fontFamily: '.SF Pro Text',
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: label,
          letterSpacing: -0.4,
        ),
        navLargeTitleTextStyle: TextStyle(
          fontFamily: '.SF Pro Display',
          fontSize: 34,
          fontWeight: FontWeight.w700,
          color: label,
          letterSpacing: 0.37,
        ),
      ),
    );
  }

  static ThemeData getMaterialTheme({
    required bool isDark,
    required String palette,
  }) {
    final accent = AppColors.getAccent(palette, isDark);
    final bg = AppColors.getBackground(isDark);
    final cardBg = AppColors.getCardBackground(isDark);
    final label = AppColors.getLabel(isDark);

    return ThemeData(
      useMaterial3: true,
      brightness: isDark ? Brightness.dark : Brightness.light,
      primaryColor: accent,
      scaffoldBackgroundColor: bg,
      cardColor: cardBg,
      colorScheme: ColorScheme.fromSeed(
        seedColor: accent,
        brightness: isDark ? Brightness.dark : Brightness.light,
        surface: cardBg,
        onSurface: label,
        primary: accent,
      ),
      fontFamily: '.SF Pro Text',
      dividerTheme: DividerThemeData(
        color: AppColors.getSeparator(isDark),
        thickness: 0.5,
        space: 1,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        foregroundColor: label,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
      ),
    );
  }
}
