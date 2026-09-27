#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ICloudSyncModule, NSObject)

RCT_EXTERN_METHOD(status
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(writeBackup
                  : (NSString *)fileName base64
                  : (NSString *)base64 withResolver
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(listBackups
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(readBackup
                  : (NSString *)fileName withResolver
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteBackup
                  : (NSString *)fileName withResolver
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(beginBackgroundTask
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endBackgroundTask : (nonnull NSNumber *)taskId)

@end
