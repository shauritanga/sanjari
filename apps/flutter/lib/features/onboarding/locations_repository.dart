import '../../core/api_client.dart';

/// Location catalogue entries from GET /catalog/locations, shared by the
/// country/city onboarding steps. Port of the CountryOption/CityOption
/// interfaces in apps/mobile/app/onboarding/country.tsx and city.tsx.
class CatalogCity {
  CatalogCity({required this.id, required this.name});

  final String id;
  final String name;

  factory CatalogCity.fromJson(Map<String, dynamic> json) {
    return CatalogCity(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}

class CatalogCountry {
  CatalogCountry({
    required this.code,
    required this.name,
    List<CatalogCity>? cities,
  }) : cities = cities ?? const [];

  final String code;
  final String name;
  final List<CatalogCity> cities;

  factory CatalogCountry.fromJson(Map<String, dynamic> json) {
    return CatalogCountry(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      cities: (json['cities'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(CatalogCity.fromJson)
              .toList() ??
          const [],
    );
  }
}

/// Typed wrapper over GET /catalog/locations.
class LocationsRepository {
  LocationsRepository(this._api);

  final ApiClient _api;

  Future<List<CatalogCountry>> fetchCountries() async {
    final body = await _api.get('/catalog/locations');
    final data = body['data'];
    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(CatalogCountry.fromJson)
          .toList();
    }
    return const [];
  }
}
