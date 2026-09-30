import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/discover/discovery_repository.dart';
import 'package:sanjari/features/likes/like_received.dart';
import 'package:sanjari/features/matches/match.dart';
import 'package:sanjari/features/matches/matches_repository.dart';

import 'mock_api.dart';

void main() {
  group('LikeReceived.fromJson', () {
    test('parses a priority like with comment and photo', () {
      final like = LikeReceived.fromJson({
        'likeId': 'like-1',
        'userId': 'user-7',
        'comment': 'Hello!',
        'priority': true,
        'createdAt': '2026-09-01T10:00:00.000Z',
        'displayName': 'Zawadi',
        'city': 'Arusha',
        'verificationStatus': 'verified',
        'primaryPhoto': {'id': 'p-1', 'url': 'https://x/y.jpg'},
      });

      expect(like.safeName, 'Zawadi');
      expect(like.priority, isTrue);
      expect(like.comment, 'Hello!');
      expect(like.verificationStatus, 'verified');
      expect(like.primaryPhoto?.url, 'https://x/y.jpg');
      expect(like.initials(), 'Z');
    });

    test('tolerates missing display details', () {
      final like = LikeReceived.fromJson({
        'likeId': 'like-2',
        'userId': 'user-8',
      });

      expect(like.safeName, 'Sanjari member');
      expect(like.initials(), '?');
      expect(like.priority, isFalse);
      expect(like.primaryPhoto, isNull);
    });
  });

  group('Match', () {
    test('parses a match with conversation', () {
      final match = Match.fromJson({
        'id': 'match-1',
        'createdAt': '2026-09-09T10:00:00.000Z',
        'conversationId': 'conv-1',
        'user': {
          'id': 'user-3',
          'profile': {'displayName': 'Neema', 'city': 'Mwanza'},
        },
      });

      expect(match.safeName, 'Neema');
      expect(match.canOpen, isTrue);
    });

    test('a match without conversation cannot open', () {
      final match = Match.fromJson({
        'id': 'match-2',
        'createdAt': '2026-09-09T10:00:00.000Z',
        'conversationId': null,
        'user': {'id': 'user-4', 'profile': null},
      });

      expect(match.safeName, 'Sanjari member');
      expect(match.canOpen, isFalse);
    });

    test('new-badge window is 48 hours', () {
      final now = DateTime.utc(2026, 9, 10, 12);
      expect(
        isNewMatch(DateTime.utc(2026, 9, 9, 12, 0, 1), now),
        isTrue,
      );
      expect(
        isNewMatch(DateTime.utc(2026, 9, 8, 11, 59, 59), now),
        isFalse,
      );
    });
  });

  group('likes/matches repositories', () {
    test('fetchLikesReceived parses the envelope array', () async {
      final seen = <RequestOptions>[];
      final repo = DiscoveryRepository(
        mockApi(
          (_) => {
            'data': [
              {
                'likeId': 'like-1',
                'userId': 'user-7',
                'displayName': 'Zawadi',
                'priority': true,
              },
            ],
          },
          seen: seen,
        ),
      );

      final likes = await repo.fetchLikesReceived();

      expect(likes, hasLength(1));
      expect(likes.single.safeName, 'Zawadi');
      expect(seen.single.path, endsWith('/discovery/likes-received'));
    });

    test('fetchMatches and unmatch hit the expected endpoints', () async {
      final seen = <RequestOptions>[];
      final repo = MatchesRepository(
        mockApi(
          (_) => {
            'data': [
              {
                'id': 'match-1',
                'createdAt': '2026-09-09T10:00:00.000Z',
                'conversationId': 'conv-1',
                'user': {
                  'id': 'user-3',
                  'profile': {'displayName': 'Neema'},
                },
              },
            ],
          },
          seen: seen,
        ),
      );

      final matches = await repo.fetchMatches();
      expect(matches.single.safeName, 'Neema');
      expect(seen.single.path, endsWith('/matches'));

      await repo.unmatch('match-1');
      expect(seen.last.path, endsWith('/matches/match-1/unmatch'));
      expect(
        (seen.last.data as Map)['reason'],
        'User initiated unmatch.',
      );
    });
  });
}
