#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface AgoraASMShield : NSObject

/**
 * Escáner físico de Kernel.
 * Retorna YES si la CPU en Anillo-0 descubre inyección (Jailbreak) o NO si está limpio.
 */
+ (BOOL)isDeviceCompromised;

@end

NS_ASSUME_NONNULL_END
