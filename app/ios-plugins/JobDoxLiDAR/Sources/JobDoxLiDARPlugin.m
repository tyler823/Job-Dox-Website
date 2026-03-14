/*
  Objective-C bridge for Capacitor plugin registration.
  This file is required by Capacitor to discover the Swift plugin.
*/

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(JobDoxLiDARPlugin, "JobDoxLiDAR",
  CAP_PLUGIN_METHOD(checkSupport, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(scanRoom, CAPPluginReturnPromise);
)
