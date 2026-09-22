import CloudKit
import Foundation

@objc(ICloudSyncModule)
class ICloudSyncModule: NSObject {

  @objc(isAvailable:withRejecter:)
  func isAvailable(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    CKContainer.default().accountStatus { status, error in
      if let error = error {
        reject("ICLOUD_STATUS_ERROR", error.localizedDescription, error)
        return
      }
      resolve(status == .available)
    }
  }

  @objc(getSyncStatus:withRejecter:)
  func getSyncStatus(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve("disabled")
  }

  @objc(setEnabled:withResolver:withRejecter:)
  func setEnabled(
    _ enabled: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(nil)
  }

  @objc(syncNow:withRejecter:)
  func syncNow(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    NSLog("ICloudSyncModule.syncNow: not implemented yet")
    resolve(nil)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
