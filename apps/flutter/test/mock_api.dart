import 'package:dio/dio.dart';
import 'package:sanjari/core/api_client.dart';

/// Builds an ApiClient whose HTTP layer is a canned responder, so
/// repository envelope handling and request shapes are tested without a
/// server. Dio itself is pure Dart, so this runs under `dart test`.
ApiClient mockApi(
  Map<String, dynamic> Function(RequestOptions options) respond, {
  List<RequestOptions>? seen,
}) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        seen?.add(options);
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
            data: respond(options),
          ),
        );
      },
    ),
  );
  return ApiClient(dio: dio, getAccessToken: () async => 'token');
}
