import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    URLCache.shared = ExpiringURLCache(
      memoryCapacity: 20 * 1024 * 1024,
      diskCapacity: 100 * 1024 * 1024,
      maxAge: 30 * 24 * 60 * 60
    )

    exposeBuildSettings()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }

  /// Build-time Info.plist values (scripts/install-config.sh), handed to JS through RN Settings.
  private func exposeBuildSettings() {
    let defaults = UserDefaults.standard
    for (defaultsKey, plistKey) in [
      ("appStoreRegion", "AppStoreRegion"),
      ("demo.tmdbKey", "WTWDemoTMDBKey"),
      ("demo.omdbKey", "WTWDemoOMDBKey"),
    ] {
      defaults.set(Bundle.main.object(forInfoDictionaryKey: plistKey) as? String ?? "", forKey: defaultsKey)
    }
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let factory = (UIApplication.shared.delegate as? AppDelegate)?.reactNativeFactory
    else { return }
    // Cold start: JS isn't listening yet and asks for it once it is.
    var launchURL =
      connectionOptions.userActivities.lazy.compactMap(SpotlightModule.url(forActivity:)).first
      ?? connectionOptions.urlContexts.first?.url
    #if SCREENSHOTS
    // `-openURL <link>` launch argument; only in builds passed SWIFT_ACTIVE_COMPILATION_CONDITIONS=SCREENSHOTS.
    launchURL = launchURL ?? UserDefaults.standard.string(forKey: "openURL").flatMap(URL.init(string:))
    #endif
    SpotlightModule.pendingURL = launchURL

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(withModuleName: "WhatToWatch", in: window, launchOptions: nil)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  /// A tapped Spotlight result: open its title like a whattowatch:// link.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let url = SpotlightModule.url(forActivity: userActivity) else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  }
}

/// Size-bounded (least recently used goes first) and drops responses older than maxAge.
class ExpiringURLCache: URLCache {
  private let maxAge: TimeInterval

  init(memoryCapacity: Int, diskCapacity: Int, maxAge: TimeInterval) {
    self.maxAge = maxAge
    // The directory: variant links a Swift symbol iOS 18 lacks, crashing at launch.
    super.init(memoryCapacity: memoryCapacity, diskCapacity: diskCapacity, diskPath: nil)
  }

  override func cachedResponse(for request: URLRequest) -> CachedURLResponse? {
    guard let cached = super.cachedResponse(for: request) else { return nil }
    if isExpired(cached) {
      removeCachedResponse(for: request)
      return nil
    }
    return cached
  }

  override func getCachedResponse(
    for dataTask: URLSessionDataTask,
    completionHandler: @escaping (CachedURLResponse?) -> Void
  ) {
    super.getCachedResponse(for: dataTask) { cached in
      guard let cached, self.isExpired(cached) else { return completionHandler(cached) }
      self.removeCachedResponse(for: dataTask)
      completionHandler(nil)
    }
  }

  private func isExpired(_ cached: CachedURLResponse) -> Bool {
    guard
      let date = (cached.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Date"),
      let fetchedAt = Self.httpDate.date(from: date)
    else { return false }
    return Date().timeIntervalSince(fetchedAt) > maxAge
  }

  private static let httpDate: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone(identifier: "GMT")
    f.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
    return f
  }()
}
