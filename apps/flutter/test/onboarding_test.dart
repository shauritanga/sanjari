import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/onboarding/onboarding_models.dart';
import 'package:sanjari/features/onboarding/onboarding_options.dart';
import 'package:sanjari/features/onboarding/onboarding_repository.dart';
import 'package:sanjari/features/onboarding/locations_repository.dart';
import 'package:sanjari/features/onboarding/onboarding_steps.dart';
import 'package:sanjari/widgets/chip_selection.dart';
import 'package:sanjari/widgets/stepper_value.dart';

import 'mock_api.dart';

Map<String, dynamic> hydratePayload() => {
      'data': {
        'onboardingStatus': 'in_progress',
        'onboardingStep': 8,
        'completionScore': 42,
        'age': 27,
        'profile': {
          'displayName': 'Amina',
          'gender': 'woman',
          'interestedIn': ['man'],
          'relationshipIntentions': ['marriage'],
          'biography': 'Hello',
          'city': 'Dar es Salaam',
          'cityId': 'c1',
          'cityName': 'Dar es Salaam',
          'countryCode': 'TZ',
          'interests': ['music', 'travel'],
          'languages': ['en', 'sw'],
          'voiceIntroKey': 'voice/1.m4a',
          'visibilitySettings': {
            'hideAge': true,
            'hideOnlineStatus': false,
            'hideReadReceipts': true,
          },
          'photos': [
            {
              'id': 'p1',
              'position': 0,
              'isPrimary': true,
              'moderationStatus': 'approved',
              'url': 'https://cdn/x.jpg',
            },
          ],
        },
      },
    };

void main() {
  group('onboarding steps', () {
    test('catalogue holds the 23 Expo steps in order', () {
      expect(totalOnboardingSteps, 23);
      expect(onboardingSteps.first.key, 'age');
      expect(onboardingSteps.last.key, 'publish');
      expect(stepNumber('birthday'), 4);
      expect(pathForStep('photos'), '/onboarding/photos');
      expect(
        pathForStep('discovery-preferences'),
        '/onboarding/discovery-preferences',
      );
    });

    test('unknown keys fall back like the TS helpers', () {
      expect(stepNumber('nope'), 1);
      expect(pathForStep('nope'), '/onboarding/age');
      expect(nextStepPath('nope'), '/onboarding/age');
    });

    test('nextStepPath chains and ends at publish', () {
      expect(nextStepPath('birthday'), '/onboarding/gender');
      expect(nextStepPath('publish'), isNull);
    });

    test('resume clamps to birthday and passes through later steps', () {
      expect(resumeOnboardingPath(1), '/onboarding/birthday');
      expect(resumeOnboardingPath(3), '/onboarding/birthday');
      expect(resumeOnboardingPath(8), '/onboarding/photos');
      expect(resumeOnboardingPath(999), '/onboarding/birthday');
    });
  });

  group('chip selection', () {
    test('multi-select adds and removes', () {
      expect(toggleChipSelection(['a'], 'b'), ['a', 'b']);
      expect(toggleChipSelection(['a', 'b'], 'a'), ['b']);
    });

    test('max cap blocks further adds but allows removal', () {
      expect(toggleChipSelection(['a', 'b', 'c'], 'd', max: 3), ['a', 'b', 'c']);
      expect(toggleChipSelection(['a', 'b', 'c'], 'a', max: 3), ['b', 'c']);
    });

    test('single mode toggles between one value and empty', () {
      expect(toggleChipSelection(['a'], 'b', multiple: false), ['b']);
      expect(toggleChipSelection(['a'], 'a', multiple: false), isEmpty);
      expect(toggleChipSelection([], 'a', multiple: false), ['a']);
    });
  });

  group('stepper value', () {
    test('clamps at the ends and steps by stride', () {
      expect(stepperNext(18, -1, min: 18, max: 99), 18);
      expect(stepperNext(99, 1, min: 18, max: 99), 99);
      expect(stepperNext(20, 1, min: 18, max: 99), 21);
      expect(stepperNext(50, -1, min: 1, max: 500, step: 5), 45);
      expect(stepperNext(3, -1, min: 1, max: 500, step: 5), 1);
      expect(stepperNext(498, 1, min: 1, max: 500, step: 5), 500);
    });
  });

  group('onboarding options', () {
    test('values match the API enum strings', () {
      expect(
        genderOptions.map((option) => option.value),
        ['woman', 'man'],
      );
      expect(
        whoToMeetOptions.map((option) => option.value),
        ['woman', 'man', 'everyone'],
      );
      expect(
        intentionOptions.map((option) => option.value),
        containsAll(['long_term', 'marriage', 'open_to_anything']),
      );
      expect(interestOptions, hasLength(25));
      expect(
        languageOptions.map((option) => option.value),
        ['en', 'sw', 'fr', 'es', 'ar', 'pt', 'de', 'zh', 'hi', 'ru'],
      );
      expect(childrenOptions.map((option) => option.value),
          contains('dont_want'));
    });
  });

  group('OnboardingDraft', () {
    test('hydrate parses the profile with store fallbacks', () {
      final draft = OnboardingDraft.hydrated(
        hydratePayload()['data'] as Map<String, dynamic>,
      );

      expect(draft.hydrated, isTrue);
      expect(draft.onboardingStatus, 'in_progress');
      expect(draft.onboardingStep, 8);
      expect(draft.completionScore, 42);
      expect(draft.age, 27);
      expect(draft.displayName, 'Amina');
      expect(draft.interestedIn, ['man']);
      expect(draft.cityId, 'c1');
      expect(draft.interests, ['music', 'travel']);
      expect(draft.voiceIntroKey, 'voice/1.m4a');
      expect(draft.hideAge, isTrue);
      expect(draft.hideOnlineStatus, isFalse);
      expect(draft.hideReadReceipts, isTrue);
      expect(draft.photos.single.id, 'p1');
      expect(draft.photos.single.isPrimary, isTrue);
    });

    test('hydrate tolerates a missing profile envelope', () {
      final draft = OnboardingDraft.hydrated(const {});

      expect(draft.hydrated, isTrue);
      expect(draft.onboardingStatus, 'not_started');
      expect(draft.displayName, '');
      expect(draft.age, isNull);
      expect(draft.photos, isEmpty);
      expect(draft.discoveryPreference.minAge, 18);
    });

    test('applySave merges fields and the progress triple', () {
      final draft = OnboardingDraft(cityId: 'old');
      draft.applySave(
        {'displayName': 'Zara', 'interests': ['tech']},
        {
          'completionScore': 55,
          'onboardingStep': 9,
          'onboardingStatus': 'in_progress',
        },
      );

      expect(draft.displayName, 'Zara');
      expect(draft.interests, ['tech']);
      expect(draft.cityId, 'old');
      expect(draft.completionScore, 55);
      expect(draft.onboardingStep, 9);
    });
  });

  group('LocationsRepository', () {
    test('fetchCountries parses the catalogue envelope', () async {
      final seen = <RequestOptions>[];
      final repo = LocationsRepository(
        mockApi(
          (_) => {
            'data': [
              {
                'code': 'TZ',
                'name': 'Tanzania',
                'cities': [
                  {'id': 'c1', 'name': 'Dar es Salaam'},
                ],
              },
              {'code': 'KE', 'name': 'Kenya'},
            ],
          },
          seen: seen,
        ),
      );

      final countries = await repo.fetchCountries();

      expect(countries, hasLength(2));
      expect(countries.first.code, 'TZ');
      expect(countries.first.cities.single.name, 'Dar es Salaam');
      expect(countries.last.cities, isEmpty);
      expect(seen.single.path, '/catalog/locations');
    });

    test('fetchCountries falls back to empty without an envelope', () async {
      final repo = LocationsRepository(mockApi((_) => {}));
      expect(await repo.fetchCountries(), isEmpty);
    });
  });

  group('OnboardingRepository', () {
    test('hydrate parses profile and preferences', () async {
      final seen = <RequestOptions>[];
      final repo = OnboardingRepository(
        mockApi(
          (options) => options.path.endsWith('discovery-preferences')
              ? {
                  'data': {'minAge': 21, 'maxAge': 40}
                }
              : hydratePayload(),
          seen: seen,
        ),
      );

      final draft = await repo.hydrate();

      expect(draft.displayName, 'Amina');
      expect(draft.discoveryPreference.minAge, 21);
      expect(draft.discoveryPreference.maxAge, 40);
      expect(
        seen.map((request) => request.path),
        ['/onboarding', '/onboarding/discovery-preferences'],
      );
    });

    test('hydrate keeps preference defaults when that fetch fails', () async {
      final repo = OnboardingRepository(
        mockApi((options) {
          if (options.path.endsWith('discovery-preferences')) {
            throw DioException(
              requestOptions: options,
              response: Response(
                requestOptions: options,
                statusCode: 404,
                data: {'message': 'Not started'},
              ),
              type: DioExceptionType.badResponse,
            );
          }
          return hydratePayload();
        }),
      );

      final draft = await repo.hydrate();

      expect(draft.displayName, 'Amina');
      expect(draft.discoveryPreference.maxDistanceKm, 50);
    });

    test('saveOnboarding PUTs fields plus step', () async {
      final seen = <RequestOptions>[];
      final repo = OnboardingRepository(
        mockApi(
          (_) => {
            'data': {
              'completionScore': 60,
              'onboardingStep': 10,
              'onboardingStatus': 'in_progress',
            },
          },
          seen: seen,
        ),
      );

      final result = await repo.saveOnboarding({'gender': 'woman'}, 5);

      expect(result['onboardingStep'], 10);
      final request = seen.single;
      expect(request.path, '/onboarding');
      expect(request.data['gender'], 'woman');
      expect(request.data['step'], 5);
    });

    test('fetchPrompts requests the English catalogue', () async {
      final seen = <RequestOptions>[];
      final repo = OnboardingRepository(
        mockApi(
          (_) => {
            'data': [
              {'id': 'q1', 'prompt': 'My ideal weekend...', 'locale': 'en'},
            ],
          },
          seen: seen,
        ),
      );

      final prompts = await repo.fetchPrompts();

      expect(prompts.single.id, 'q1');
      expect(prompts.single.prompt, 'My ideal weekend...');
      expect(seen.single.path, contains('/onboarding/prompts'));
      expect(seen.single.path, contains('locale=en'));
    });

    test('publish POSTs an empty body to the publish endpoint', () async {
      final seen = <RequestOptions>[];
      final repo = OnboardingRepository(
        mockApi((_) => {'data': {}} as Map<String, dynamic>, seen: seen),
      );

      await repo.publish();

      expect(seen.single.path, '/onboarding/publish');
      expect(seen.single.method, 'POST');
    });

    test('prompt answers and preferences PUT the merged payloads', () async {
      final seen = <RequestOptions>[];
      final repo = OnboardingRepository(
        mockApi((_) => {'data': {}} as Map<String, dynamic>, seen: seen),
      );

      await repo.setPromptAnswers([
        PromptAnswerDraft(promptId: 'q1', answer: 'Tea over coffee'),
      ]);
      await repo.setDiscoveryPreference(
        DiscoveryPreferenceDraft(minAge: 21, maxAge: 40),
      );

      expect(seen[0].path, '/onboarding/prompts');
      expect(seen[0].data['answers'].single['promptId'], 'q1');
      expect(seen[1].path, '/onboarding/discovery-preferences');
      expect(seen[1].data['minAge'], 21);
      expect(seen[1].data['showDistance'], isTrue);
    });
  });
}
