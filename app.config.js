module.exports = {
  expo: {
    name: 'LéNOR',
    slug: 'lenor',
    owner: "eloe_inc",
    version: '2.0.0',
    orientation: 'portrait',
    icon: './assets/lenor-icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#121212'
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lenor.app",
      buildNumber: "20",
      infoPlist: {
        NSMicrophoneUsageDescription: "LéNOR necesita acceder al micrófono para el modo voz.",
        NSSpeechRecognitionUsageDescription: "LéNOR necesita procesar tu voz para convertirla a texto.",
        NSPhotoLibraryUsageDescription: "LéNOR necesita acceder a tu galería para que puedas seleccionar fotos.",
        NSCameraUsageDescription: "LéNOR necesita acceder a tu cámara si deseas tomar una foto para enviarla.",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/lenor-icon.png',
        backgroundColor: '#121212'
      },
      package: "com.lenor.app",
      versionCode: 2,
      permissions: [
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ]
    },
    web: {
      favicon: './assets/lenor-icon.png'
    },
    extra: {
      eas: {
        projectId: "c311ef13-4c94-4b5d-8845-a15faa557627"
      }
    },
    plugins: [
      [
        "@react-native-voice/voice",
        {
          "microphonePermission": "LéNOR necesita acceder al micrófono para el modo voz.",
          "speechRecognitionPermission": "LéNOR necesita procesar tu voz para convertirla a texto."
        }
      ],
      "expo-font"
    ]
  }
};
