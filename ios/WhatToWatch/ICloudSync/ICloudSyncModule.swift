import Foundation
import React
import UIKit

@objc(ICloudSyncModule)
class ICloudSyncModule: NSObject {

  private static let backupSuffixes = ["-what-to-watch.zip", "-what-to-watch.json"]
  // Reads can wait on iCloud downloads; they must never hold up a backup write.
  private let writeQueue = DispatchQueue(label: "ICloudSyncModule.write", qos: .utility)
  private let readQueue = DispatchQueue(label: "ICloudSyncModule.read", qos: .utility)

  private func trace<T>(_ name: String, _ work: () throws -> T) rethrows -> T {
    let start = Date()
    NSLog("[ICloudSync] %@ start", name)
    defer { NSLog("[ICloudSync] %@ end %.2fs", name, Date().timeIntervalSince(start)) }
    return try work()
  }

  @objc(status:withRejecter:)
  func status(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    readQueue.async { self.trace("status") {
      resolve(self.currentStatus().status)
    } }
  }

  /// `base64` is the file's bytes; today's name replaces today's file.
  @objc(writeBackup:base64:withResolver:withRejecter:)
  func writeBackup(
    _ fileName: String,
    base64: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    writeQueue.async { self.trace("writeBackup") {
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
            try Data(base64Encoded: base64)?.write(to: url, options: .atomic)
          } catch {
            writeError = error
          }
        }
        if let error = coordError ?? writeError { throw error }
        resolve(nil)
      } catch {
        reject("ICLOUD_WRITE_ERROR", error.localizedDescription, error)
      }
    } }
  }

  /// Adds `base64` bytes to the end of the file, creating it if absent.
  /// Refuses while only a placeholder is local, so the file is never replaced.
  @objc(appendFile:base64:withResolver:withRejecter:)
  func appendFile(
    _ fileName: String,
    base64: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    writeQueue.async { self.trace("appendFile") {
      guard let docs = self.currentStatus().documents else {
        reject("ICLOUD_UNAVAILABLE", "iCloud Drive is not available", nil)
        return
      }
      guard let bytes = Data(base64Encoded: base64) else {
        reject("ICLOUD_WRITE_ERROR", "Bad data", nil)
        return
      }
      let fm = FileManager.default
      let target = docs.appendingPathComponent(fileName)
      if !fm.fileExists(atPath: target.path),
         fm.fileExists(atPath: docs.appendingPathComponent(".\(fileName).icloud").path) {
        try? fm.startDownloadingUbiquitousItem(at: target)
        reject("ICLOUD_NOT_DOWNLOADED", "\(fileName) is still downloading", nil)
        return
      }
      do {
        try fm.createDirectory(at: docs, withIntermediateDirectories: true)
        var coordError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(writingItemAt: target, options: .forMerging, error: &coordError) { url in
          do {
            if !fm.fileExists(atPath: url.path) {
              try bytes.write(to: url)
              return
            }
            let handle = try FileHandle(forWritingTo: url)
            defer { try? handle.close() }
            try handle.seekToEnd()
            try handle.write(contentsOf: bytes)
          } catch {
            writeError = error
          }
        }
        if let error = coordError ?? writeError { throw error }
        resolve(nil)
      } catch {
        reject("ICLOUD_WRITE_ERROR", error.localizedDescription, error)
      }
    } }
  }

  /// Newest first: [{ name, size, modifiedAt, downloaded }].
  @objc(listBackups:withRejecter:)
  func listBackups(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    readQueue.async { self.trace("listBackups") {
      guard let docs = self.currentStatus().documents else {
        resolve([])
        return
      }
      let fm = FileManager.default
      resolve(self.backupNames(in: docs).map { name -> [String: Any] in
        let url = docs.appendingPathComponent(name)
        let downloaded = fm.fileExists(atPath: url.path)
        let path = downloaded ? url.path : docs.appendingPathComponent(".\(name).icloud").path
        let attrs = (try? fm.attributesOfItem(atPath: path)) ?? [:]
        let values = try? url.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey])
        let size = values?.fileSize ?? (attrs[.size] as? Int) ?? 0
        let modified = values?.contentModificationDate ?? (attrs[.modificationDate] as? Date)
        return [
          "name": name,
          "size": size,
          "modifiedAt": (modified?.timeIntervalSince1970 ?? 0) * 1000,
          "downloaded": downloaded,
        ]
      })
    } }
  }

  /// The file's bytes as base64; a coordinated read downloads it first if needed.
  @objc(readBackup:withResolver:withRejecter:)
  func readBackup(
    _ fileName: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    readQueue.async { self.trace("readBackup") {
      guard let docs = self.currentStatus().documents else {
        reject("ICLOUD_UNAVAILABLE", "iCloud Drive is not available", nil)
        return
      }
      let url = docs.appendingPathComponent(fileName)
      try? FileManager.default.startDownloadingUbiquitousItem(at: url)
      var coordError: NSError?
      var data: Data?
      NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordError) { readURL in
        data = try? Data(contentsOf: readURL)
      }
      if let data = data {
        resolve(data.base64EncodedString())
      } else {
        reject("ICLOUD_READ_ERROR", coordError?.localizedDescription ?? "Couldn't read \(fileName)", coordError)
      }
    } }
  }

  @objc(deleteBackup:withResolver:withRejecter:)
  func deleteBackup(
    _ fileName: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    writeQueue.async { self.trace("deleteBackup") {
      guard let docs = self.currentStatus().documents else {
        reject("ICLOUD_UNAVAILABLE", "iCloud Drive is not available", nil)
        return
      }
      let url = docs.appendingPathComponent(fileName)
      var coordError: NSError?
      var deleteError: Error?
      NSFileCoordinator().coordinate(writingItemAt: url, options: .forDeleting, error: &coordError) { target in
        do { try FileManager.default.removeItem(at: target) } catch { deleteError = error }
      }
      try? FileManager.default.removeItem(at: docs.appendingPathComponent(".\(fileName).icloud"))
      if let error = coordError ?? deleteError {
        reject("ICLOUD_DELETE_ERROR", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    } }
  }

  // Newest first. Includes ".<name>.icloud" placeholders under their real name.
  private func backupNames(in docs: URL) -> [String] {
    let entries = (try? FileManager.default.contentsOfDirectory(atPath: docs.path)) ?? []
    let names = entries.compactMap { entry -> String? in
      var name = entry
      if name.hasPrefix("."), name.hasSuffix(".icloud") {
        name = String(name.dropFirst().dropLast(".icloud".count))
      }
      return Self.backupSuffixes.contains(where: name.hasSuffix) ? name : nil
    }
    return Array(Set(names)).sorted(by: >)
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

  /// Asks iOS for time to finish a backup after the app leaves the screen.
  @objc(beginBackgroundTask:withRejecter:)
  func beginBackgroundTask(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      var id: UIBackgroundTaskIdentifier = .invalid
      id = UIApplication.shared.beginBackgroundTask(withName: "backup") {
        UIApplication.shared.endBackgroundTask(id)
      }
      resolve(id.rawValue)
    }
  }

  @objc(endBackgroundTask:)
  func endBackgroundTask(_ id: NSNumber) {
    DispatchQueue.main.async {
      let task = UIBackgroundTaskIdentifier(rawValue: id.intValue)
      if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
