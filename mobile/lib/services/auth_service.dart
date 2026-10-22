import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'storage_service.dart';

class AuthUser {
  final String email;
  final String name;
  final String? picture;

  const AuthUser({
    required this.email,
    required this.name,
    this.picture,
  });
}

class AuthService {
  static const String defaultAuthServerUrl = 'https://auth.noruj.com';
  static const String googleRevokeUrl = 'https://oauth2.googleapis.com/revoke';

  final StorageService _storage;
  final String authServerUrl;

  AuthService(this._storage, {this.authServerUrl = defaultAuthServerUrl});

  bool get isAuthenticated =>
      _storage.getRefreshToken() != null && _storage.getRefreshToken()!.isNotEmpty;

  String? get userEmail => _storage.getUserEmail();
  String? get userName => _storage.getUserName();
  String? get userPicture => _storage.getUserPicture();

  /// Starts the Google OAuth 2.0 PKCE flow.
  /// 1. Binds a local loopback server on an ephemeral port.
  /// 2. Launches the browser with the PKCE challenge.
  /// 3. Captures the authorization code.
  /// 4. Exchanges the code for tokens via the secure worker relay.
  Future<AuthUser> signInWithGoogle() async {
    // 1. Generate PKCE code verifier and challenge
    final random = Random.secure();
    final verifierBytes = List<int>.generate(32, (_) => random.nextInt(256));
    final codeVerifier = _base64UrlNoPad(verifierBytes);

    final sha256Digest = sha256.convert(utf8.encode(codeVerifier));
    final codeChallenge = _base64UrlNoPad(sha256Digest.bytes);

    final stateBytes = List<int>.generate(16, (_) => random.nextInt(256));
    final state = stateBytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

    // 2. Start loopback HTTP server
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final port = server.port;

    final authUrl = Uri.parse(
      '$authServerUrl/auth/login?port=$port&state=${Uri.encodeComponent(state)}&code_challenge=${Uri.encodeComponent(codeChallenge)}',
    );

    // 3. Launch browser
    final launched = await launchUrl(authUrl, mode: LaunchMode.externalApplication);
    if (!launched) {
      await server.close();
      throw Exception('Could not launch browser for Google sign-in');
    }

    final completer = Completer<String>();

    // 4. Listen for loopback callback (timeout after 5 minutes)
    final timer = Timer(const Duration(minutes: 5), () {
      if (!completer.isCompleted) {
        completer.completeError('Google sign-in timed out. Please try again.');
        server.close(force: true);
      }
    });

    server.listen((HttpRequest request) async {
      if (request.uri.path != '/callback') {
        request.response.statusCode = HttpStatus.notFound;
        request.response.write('Not found');
        await request.response.close();
        return;
      }

      final queryParams = request.uri.queryParameters;
      final retState = queryParams['state'];
      final error = queryParams['error'];
      final code = queryParams['code'];

      if (retState != state) {
        request.response.statusCode = HttpStatus.badRequest;
        request.response.write('Invalid state');
        await request.response.close();
        return;
      }

      if (error != null) {
        request.response.statusCode = HttpStatus.badRequest;
        request.response.headers.contentType = ContentType.html;
        request.response.write('''
          <html><body style="font-family:-apple-system,sans-serif;background:#0A0A0C;color:#FF453A;text-align:center;padding:60px 20px;">
            <h2>Authentication Cancelled</h2><p>${_escapeHtml(error)}</p>
          </body></html>
        ''');
        await request.response.close();
        if (!completer.isCompleted) {
          completer.completeError('Authentication cancelled: $error');
        }
        await server.close();
        return;
      }

      if (code == null || code.isEmpty) {
        request.response.statusCode = HttpStatus.badRequest;
        request.response.write('Missing authorization code');
        await request.response.close();
        if (!completer.isCompleted) {
          completer.completeError('Invalid response from Google');
        }
        await server.close();
        return;
      }

      // Success response to user
      request.response.statusCode = HttpStatus.ok;
      request.response.headers.contentType = ContentType.html;
      request.response.write('''
        <html>
          <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>MyNotes - Connected</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0A0A0C;color:#FFFFFF;text-align:center;padding:60px 20px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:50%;background:rgba(10,132,255,0.18);color:#0A84FF;font-size:36px;margin-bottom:24px;">✓</div>
            <h1 style="font-size:24px;font-weight:700;margin:0 0 12px 0;">Google Drive Connected!</h1>
            <p style="color:#9898A0;font-size:15px;line-height:1.5;max-width:340px;margin:0 auto 28px auto;">MyNotes is now securely linked to your Google Drive. You can return to the app.</p>
          </body>
        </html>
      ''');
      await request.response.close();

      if (!completer.isCompleted) {
        completer.complete(code);
      }
      await server.close();
    });

    final authCode = await completer.future;
    timer.cancel();

    // 5. Exchange code with worker relay
    final tokenRes = await http.post(
      Uri.parse('$authServerUrl/auth/token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'code': authCode,
        'codeVerifier': codeVerifier,
      }),
    );

    if (tokenRes.statusCode != 200) {
      throw Exception('Failed to exchange auth token: ${tokenRes.body}');
    }

    final tokenData = jsonDecode(tokenRes.body) as Map<String, dynamic>;
    if (tokenData['success'] != true || tokenData['accessToken'] == null) {
      throw Exception(tokenData['error'] ?? 'Token exchange failed');
    }

    final accessToken = tokenData['accessToken'] as String;
    final refreshToken = tokenData['refreshToken'] as String?;
    final expiresIn = tokenData['expiresIn'] as int? ?? 3600;
    final email = tokenData['email'] as String? ?? 'User';
    final name = tokenData['name'] as String? ?? email;
    final picture = tokenData['picture'] as String?;

    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final expiry = now + expiresIn;

    await _storage.setAccessToken(accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.setRefreshToken(refreshToken);
    }
    await _storage.setTokenExpiry(expiry);
    await _storage.setUserEmail(email);
    await _storage.setUserName(name);
    await _storage.setUserPicture(picture);

    return AuthUser(email: email, name: name, picture: picture);
  }

  /// Returns a valid Google access token, refreshing if necessary.
  Future<String> getValidAccessToken() async {
    final refreshToken = _storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw Exception('Not signed in to Google Drive');
    }

    final expiry = _storage.getTokenExpiry();
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    // If still valid for at least 60 seconds, reuse
    if (expiry > now + 60) {
      final token = _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        return token;
      }
    }

    // Refresh token via relay
    final res = await http.post(
      Uri.parse('$authServerUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (res.statusCode != 200) {
      throw Exception('Auth relay refresh failed: ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['success'] != true || data['accessToken'] == null) {
      if (data['error'] == 'invalid_grant') {
        await _storage.clearAuth();
        throw Exception('Google Drive access expired. Please sign in again.');
      }
      throw Exception(data['error'] ?? 'Token refresh failed');
    }

    final newAccessToken = data['accessToken'] as String;
    final expiresIn = data['expiresIn'] as int? ?? 3600;
    final newExpiry = (DateTime.now().millisecondsSinceEpoch ~/ 1000) + expiresIn;

    await _storage.setAccessToken(newAccessToken);
    await _storage.setTokenExpiry(newExpiry);

    return newAccessToken;
  }

  /// Signs out and revokes the grant at Google
  Future<void> signOut() async {
    final refreshToken = _storage.getRefreshToken();
    await _storage.clearAuth();

    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await http.post(
          Uri.parse(googleRevokeUrl),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: {'token': refreshToken},
        ).timeout(const Duration(seconds: 5));
      } catch (_) {
        // Ignore network failure when revoking offline
      }
    }
  }

  String _base64UrlNoPad(List<int> bytes) {
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  String _escapeHtml(String text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
  }
}
