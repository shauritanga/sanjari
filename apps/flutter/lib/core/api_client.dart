import 'package:dio/dio.dart';

import 'config.dart';

/// Error thrown for API failures. Mirrors the `{ data, message,
/// error: { message, code } }` envelope used by apps/mobile/src/api.ts.
class ApiException implements Exception {
  ApiException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

/// Thin Dio wrapper with bearer auth, single token-refresh retry on 401,
/// and envelope error mapping. Port of apps/mobile/src/api.ts.
class ApiClient {
  ApiClient({
    Future<String?> Function()? getAccessToken,
    Future<bool> Function()? refreshSession,
    void Function()? onAuthFailure,
    Dio? dio,
  })  : _getAccessToken = getAccessToken,
        _refreshSession = refreshSession,
        _onAuthFailure = onAuthFailure,
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AppConfig.apiUrl,
                headers: const {'Content-Type': 'application/json'},
              ),
            ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _getAccessToken?.call();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final retried = request.extra['retried'] == true;
          final isRefreshCall = request.path.endsWith('/auth/refresh');
          if (error.response?.statusCode == 401 && !retried && !isRefreshCall) {
            final refreshed = await _refreshSession?.call() ?? false;
            if (refreshed) {
              request.extra['retried'] = true;
              final token = await _getAccessToken?.call();
              if (token != null && token.isNotEmpty) {
                request.headers['Authorization'] = 'Bearer $token';
              }
              try {
                final response = await _dio.fetch<dynamic>(request);
                return handler.resolve(response);
              } on DioException catch (_) {
                // Fall through to the original error handling below.
              }
            }
            _onAuthFailure?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  final Future<String?> Function()? _getAccessToken;
  final Future<bool> Function()? _refreshSession;
  final void Function()? _onAuthFailure;
  final Dio _dio;

  static Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    return const <String, dynamic>{};
  }

  Never _throwEnvelope(Map<String, dynamic> body, String fallback) {
    final error = body['error'];
    final message = body['message'] as String? ??
        (error is Map<String, dynamic>
            ? error['message'] as String?
            : null) ??
        fallback;
    final code =
        error is Map<String, dynamic> ? error['code'] as String? : null;
    throw ApiException(message, code: code);
  }

  Never _throwDio(DioException e, String fallback) {
    _throwEnvelope(_asMap(e.response?.data), fallback);
  }

  Future<Map<String, dynamic>> get(String path) async {
    try {
      final response = await _dio.get<dynamic>(path);
      return _asMap(response.data);
    } on DioException catch (e) {
      _throwDio(e, 'Request failed.');
    }
  }

  Future<Map<String, dynamic>> post(String path, [Object? data]) async {
    try {
      final response = await _dio.post<dynamic>(path, data: data);
      return _asMap(response.data);
    } on DioException catch (e) {
      _throwDio(e, 'Request failed.');
    }
  }

  Future<Map<String, dynamic>> put(String path, [Object? data]) async {
    try {
      final response = await _dio.put<dynamic>(path, data: data);
      return _asMap(response.data);
    } on DioException catch (e) {
      _throwDio(e, 'Request failed.');
    }
  }

  Future<Map<String, dynamic>> patch(String path, [Object? data]) async {
    try {
      final response = await _dio.patch<dynamic>(path, data: data);
      return _asMap(response.data);
    } on DioException catch (e) {
      _throwDio(e, 'Request failed.');
    }
  }

  Future<void> remove(String path) async {
    try {
      await _dio.delete<dynamic>(path);
    } on DioException catch (e) {
      _throwDio(e, 'Request failed.');
    }
  }
}
