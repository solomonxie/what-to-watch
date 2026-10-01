#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SpotlightModule, NSObject)

RCT_EXTERN_METHOD(isAvailable
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(index
                  : (NSArray *)items withResolver
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(remove
                  : (NSArray *)ids withResolver
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeAll
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(takeInitialURL
                  : (RCTPromiseResolveBlock)resolve withRejecter
                  : (RCTPromiseRejectBlock)reject)

@end
