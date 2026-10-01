import CoreSpotlight
import Foundation
import React
import UniformTypeIdentifiers

/// Puts titles in iOS Spotlight; a tapped result opens whattowatch://title/<id>.
@objc(SpotlightModule)
class SpotlightModule: NSObject {

  /// Set by AppDelegate when a Spotlight tap launches the app, read once by JS.
  static var pendingURL: URL?

  private static let batchSize = 500

  static func url(forActivity activity: NSUserActivity) -> URL? {
    guard
      activity.activityType == CSSearchableItemActionType,
      let id = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
      let encoded = id.addingPercentEncoding(withAllowedCharacters: .alphanumerics)
    else { return nil }
    return URL(string: "whattowatch://title/\(encoded)")
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(isAvailable:withRejecter:)
  func isAvailable(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    resolve(CSSearchableIndex.isIndexingAvailable())
  }

  /// items: [{ id, domain, title, description?, keywords?, rankingHint? }]
  @objc(index:withResolver:withRejecter:)
  func index(
    _ items: [[String: Any]],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let searchable = items.compactMap(Self.searchableItem)
    let batches = stride(from: 0, to: searchable.count, by: Self.batchSize).map {
      Array(searchable[$0..<min($0 + Self.batchSize, searchable.count)])
    }
    Self.run(batches, reject: reject, resolve: resolve) { batch, done in
      CSSearchableIndex.default().indexSearchableItems(batch, completionHandler: done)
    }
  }

  @objc(remove:withResolver:withRejecter:)
  func remove(
    _ ids: [String],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    CSSearchableIndex.default().deleteSearchableItems(withIdentifiers: ids) { error in
      if let error { reject("SPOTLIGHT_REMOVE", error.localizedDescription, error) } else { resolve(nil) }
    }
  }

  @objc(removeAll:withRejecter:)
  func removeAll(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    CSSearchableIndex.default().deleteAllSearchableItems { error in
      if let error { reject("SPOTLIGHT_REMOVE", error.localizedDescription, error) } else { resolve(nil) }
    }
  }

  @objc(takeInitialURL:withRejecter:)
  func takeInitialURL(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    resolve(Self.pendingURL?.absoluteString)
    Self.pendingURL = nil
  }

  private static func searchableItem(_ item: [String: Any]) -> CSSearchableItem? {
    guard let id = item["id"] as? String, let title = item["title"] as? String else { return nil }
    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.title = title
    attributes.displayName = title
    attributes.contentDescription = item["description"] as? String
    attributes.keywords = item["keywords"] as? [String]
    if let hint = item["rankingHint"] as? NSNumber { attributes.rankingHint = hint }
    let searchable = CSSearchableItem(
      uniqueIdentifier: id,
      domainIdentifier: item["domain"] as? String,
      attributeSet: attributes
    )
    // Default is 30 days; JS re-syncs, so keep items until it removes them.
    searchable.expirationDate = .distantFuture
    return searchable
  }

  private static func run(
    _ batches: [[CSSearchableItem]],
    reject: @escaping RCTPromiseRejectBlock,
    resolve: @escaping RCTPromiseResolveBlock,
    step: @escaping ([CSSearchableItem], @escaping (Error?) -> Void) -> Void
  ) {
    guard let first = batches.first else { return resolve(nil) }
    step(first) { error in
      if let error { return reject("SPOTLIGHT_INDEX", error.localizedDescription, error) }
      Self.run(Array(batches.dropFirst()), reject: reject, resolve: resolve, step: step)
    }
  }
}
