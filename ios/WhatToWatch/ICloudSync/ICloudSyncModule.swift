import Foundation
import React

@objc(ICloudSyncModule)
class ICloudSyncModule: NSObject {

  private static let backupSuffix = "-what-to-watch.json"
  private static let keepCount = 10
  private let queue = DispatchQueue(label: "ICloudSyncModule", qos: .utility)

  @objc(status:withRejecter:)
  func status(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      resolve(self.currentStatus().status)
    }
  }

  @objc(writeBackup:contents:withResolver:withRejecter:)
  func writeBackup(
    _ fileName: String,
    contents: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      guard let docs = self.currentStatus().documents else {
        reject("ICLOUD_UNAVAILABLE", "iCloud Drive is not available", nil)
        return
      }
      do {
        try FileManager.default.createDirectory(at: docs, withIntermediateDirectories: true)
        let target = docs.appendingPathComponent(fileName)
        var coordError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(writingItemAt: target, options: .forReplacing, error: &coordError) { url in
          do {
            try contents.data(using: .utf8)?.write(to: url, options: .atomic)
          } catch {
            writeError = error
          }
        }
        if let error = coordError ?? writeError { throw error }
        self.prune(docs)
        resolve(nil)
      } catch {
        reject("ICLOUD_WRITE_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(readLatest:withRejecter:)
  func readLatest(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      guard let docs = self.currentStatus().documents else {
        resolve(nil)
        return
      }
      let names = self.backupNames(in: docs)
      guard let latest = names.first else {
        resolve(nil)
        return
      }
      let url = docs.appendingPathComponent(latest)
      if !FileManager.default.fileExists(atPath: url.path) {
        try? FileManager.default.startDownloadingUbiquitousItem(at: url)
        resolve(nil)
        return
      }
      var coordError: NSError?
      var text: String?
      NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordError) { readURL in
        text = try? String(contentsOf: readURL, encoding: .utf8)
      }
      resolve(text)
    }
  }

  // Newest first. Includes ".<name>.icloud" placeholders under their real name.
  private func backupNames(in docs: URL) -> [String] {
    let entries = (try? FileManager.default.contentsOfDirectory(atPath: docs.path)) ?? []
    let names = entries.compactMap { entry -> String? in
      var name = entry
      if name.hasPrefix("."), name.hasSuffix(".icloud") {
        name = String(name.dropFirst().dropLast(".icloud".count))
      }
      return name.hasSuffix(Self.backupSuffix) ? name : nil
    }
    return Array(Set(names)).sorted(by: >)
  }

  private func prune(_ docs: URL) {
    let fm = FileManager.default
    for name in backupNames(in: docs).dropFirst(Self.keepCount) {
      try? fm.removeItem(at: docs.appendingPathComponent(name))
      try? fm.removeItem(at: docs.appendingPathComponent(".\(name).icloud"))
    }
  }

  private func currentStatus() -> (status: String, documents: URL?) {
    if let container = FileManager.default.url(forUbiquityContainerIdentifier: nil) {
      return ("available", container.appendingPathComponent("Documents"))
    }
    if !Self.isEntitled() { return ("notEntitled", nil) }
    if FileManager.default.ubiquityIdentityToken == nil { return ("driveOff", nil) }
    return ("notReady", nil)
  }

  // No embedded profile (App Store build) → assume entitled.
  private static func isEntitled() -> Bool {
    guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
          let data = try? Data(contentsOf: url),
          let raw = String(data: data, encoding: .isoLatin1),
          let start = raw.range(of: "<?xml"),
          let end = raw.range(of: "</plist>")
    else { return true }
    let xml = String(raw[start.lowerBound..<end.upperBound])
    guard let plistData = xml.data(using: .isoLatin1),
          let plist = try? PropertyListSerialization.propertyList(from: plistData, format: nil) as? [String: Any],
          let entitlements = plist["Entitlements"] as? [String: Any]
    else { return false }
    let containers = entitlements["com.apple.developer.ubiquity-container-identifiers"] as? [String]
    return !(containers ?? []).isEmpty
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
