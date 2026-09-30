// API base URL and environment-driven configuration.
//
// Normal builds use production. Local development requires an explicit override:
//   flutter run --dart-define API_URL=http://localhost:4000/api/v1
class AppConfig {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://37.60.238.125:3400/api/v1',
  );
}
