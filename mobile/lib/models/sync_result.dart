/// Result of a cloud sync operation
class CloudSyncResult {
  final int notesCount;
  final bool uploaded;
  final bool downloaded;
  final String timestamp;

  const CloudSyncResult({
    required this.notesCount,
    required this.uploaded,
    required this.downloaded,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'notesCount': notesCount,
        'uploaded': uploaded,
        'downloaded': downloaded,
        'timestamp': timestamp,
      };

  factory CloudSyncResult.fromJson(Map<String, dynamic> json) => CloudSyncResult(
        notesCount: json['notesCount'] as int? ?? 0,
        uploaded: json['uploaded'] as bool? ?? false,
        downloaded: json['downloaded'] as bool? ?? false,
        timestamp: json['timestamp'] as String? ?? DateTime.now().toUtc().toIso8601String(),
      );
}

/// Cloud sync configuration and account status
class CloudSyncConfig {
  final String? userEmail;
  final String? userName;
  final String? userPicture;
  final bool autoSync;
  final String? lastSyncTime;
  final bool isConnected;
  final bool isSyncing;
  final String? lastError;
  final String? fileId;
  final bool isReady;

  const CloudSyncConfig({
    this.userEmail,
    this.userName,
    this.userPicture,
    this.autoSync = true,
    this.lastSyncTime,
    this.isConnected = false,
    this.isSyncing = false,
    this.lastError,
    this.fileId,
    this.isReady = true,
  });

  CloudSyncConfig copyWith({
    String? userEmail,
    String? userName,
    String? userPicture,
    bool? autoSync,
    String? lastSyncTime,
    bool? isConnected,
    bool? isSyncing,
    String? lastError,
    String? fileId,
    bool? isReady,
  }) {
    return CloudSyncConfig(
      userEmail: userEmail ?? this.userEmail,
      userName: userName ?? this.userName,
      userPicture: userPicture ?? this.userPicture,
      autoSync: autoSync ?? this.autoSync,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      isConnected: isConnected ?? this.isConnected,
      isSyncing: isSyncing ?? this.isSyncing,
      lastError: lastError,
      fileId: fileId ?? this.fileId,
      isReady: isReady ?? this.isReady,
    );
  }
}
