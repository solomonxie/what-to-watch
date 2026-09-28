import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

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

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "WhatToWatch",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
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
