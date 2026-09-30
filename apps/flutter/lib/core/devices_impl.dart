import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import 'devices.dart';

// Plugin implementations of the device seams. These need platform
// channels, so they live apart from devices.dart (which is what
// `dart test` exercises) — the same split as passcode.dart vs
// passcode_devices.dart. None of this runs without android/ios
// scaffolding and on-device smoke, which are still open.

Future<List<int>> _readPicked(XFile file, String fallbackMime) async {
  return file.readAsBytes();
}

class PluginMediaPicker implements MediaPicker {
  PluginMediaPicker({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<bool> ensureGalleryAccess() async {
    final status = await Permission.photos.request();
    return status.isGranted || status.isLimited;
  }

  @override
  Future<bool> ensureCameraAccess() async {
    return (await Permission.camera.request()).isGranted;
  }

  Future<PickedMedia?> _toMedia(XFile? file) async {
    if (file == null) return null;
    final bytes = await _readPicked(file, 'image/jpeg');
    return PickedMedia(
      bytes: bytes,
      mimeType: file.mimeType ?? 'image/jpeg',
      sizeBytes: await file.length(),
    );
  }

  @override
  Future<PickedMedia?> pickImage() =>
      _picker.pickImage(source: ImageSource.gallery).then(_toMedia);

  @override
  Future<List<PickedMedia>> pickImages({int limit = 10}) async {
    final files = await _picker.pickMultiImage(limit: limit);
    final media = <PickedMedia>[];
    for (final file in files) {
      final picked = await _toMedia(file);
      if (picked != null) media.add(picked);
    }
    return media;
  }

  @override
  Future<PickedMedia?> takePhoto({bool front = false}) =>
      _picker
          .pickImage(
            source: ImageSource.camera,
            preferredCameraDevice:
                front ? CameraDevice.front : CameraDevice.rear,
          )
          .then(_toMedia);
}

class DioBinaryUploader implements BinaryUploader {
  DioBinaryUploader({Dio? dio}) : _dio = dio ?? Dio();

  final Dio _dio;

  @override
  Future<void> put(String url, List<int> bytes, String mimeType) async {
    final response = await _dio.put<dynamic>(
      url,
      data: bytes,
      options: Options(contentType: mimeType),
    );
    final status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      throw Exception('Upload failed with status $status.');
    }
  }
}

class RecordVoiceRecorder implements VoiceRecorder {
  RecordVoiceRecorder({AudioRecorder? recorder})
      : _recorder = recorder ?? AudioRecorder();

  final AudioRecorder _recorder;
  final _progress = StreamController<Duration>.broadcast();
  Timer? _ticker;
  DateTime? _startedAt;

  @override
  Future<bool> ensureMicAccess() => _recorder.hasPermission();

  @override
  Future<void> start() async {
    await _recorder.start(const RecordConfig(), path: '');
    _startedAt = DateTime.now();
    _ticker?.cancel();
    _ticker = Timer.periodic(
      const Duration(milliseconds: 200),
      (_) {
        final started = _startedAt;
        if (started != null) _progress.add(DateTime.now().difference(started));
      },
    );
  }

  @override
  Future<VoiceTake> stop() async {
    _ticker?.cancel();
    final path = await _recorder.stop();
    final started = _startedAt;
    _startedAt = null;
    if (path == null) throw EmptyRecording();
    return VoiceTake(
      path: path,
      durationMs: started == null
          ? 0
          : DateTime.now().difference(started).inMilliseconds,
    );
  }

  @override
  Stream<Duration> get progress => _progress.stream;
}

class AudioPlayersSound implements SoundPlayer {
  AudioPlayersSound({AudioPlayer? player})
      : _player = player ?? AudioPlayer();

  final AudioPlayer _player;

  @override
  Future<void> play(String path) =>
      _player.play(DeviceFileSource(path));

  @override
  Future<void> pause() => _player.pause();

  @override
  Stream<bool> get playing => _player.onPlayerStateChanged
      .map((state) => state == PlayerState.playing);
}

class GeolocatorService implements LocationService {
  @override
  Future<bool> ensureAccess() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  @override
  Future<GeoFix> current() async {
    final position = await Geolocator.getCurrentPosition();
    return GeoFix(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracy.round(),
    );
  }
}

class FlutterContactsReader implements ContactsReader {
  @override
  Future<bool> ensureAccess() async {
    return (await Permission.contacts.request()).isGranted;
  }

  @override
  Future<List<String>> fetchPhoneNumbers() async {
    final contacts = await FlutterContacts.getContacts(
      withProperties: true,
    );
    return [
      for (final contact in contacts)
        for (final phone in contact.phones) phone.number,
    ];
  }
}

class FirebasePushRegistrar implements PushRegistrar {
  @override
  Future<bool> ensureAccess() async {
    try {
      final settings =
          await FirebaseMessaging.instance.requestPermission();
      return settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
    } catch (_) {
      // Firebase is not configured in this build (no google-services
      // files yet) — denial copy still applies.
      return false;
    }
  }

  @override
  Future<String?> fetchToken() async {
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }
}
