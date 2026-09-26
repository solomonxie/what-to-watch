#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ICloudSyncModule, NSObject)

RCT_EXTERN_METHOD(status
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(writeBackup
                  : (NSString *)fileName contents
                  : (NSString *)contents withResolver
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(readLatest
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

@end
