#import "AgoraASMShield.h"
#import <sys/stat.h>

/**
 * EL ESCUDO ASM ARM64
 * ====================
 * Un Hook de Jailbreak normal (Substrate/Frida) altera la memoria de C en `libsystem_kernel.dylib`
 * haciendo que llamadas como `stat()` o `access()` siempre devuelvan "No existe" para ocultar a Cydia.
 * 
 * Al forzar instrucción `svc #0x80`, la CPU Apple Silicon ignora el entorno C y habla puro con XNU Darwin
 * (El modo Kernel absoluto). XNU nunca miente.
 */

#define API_SYSCALL_STAT 188

// Inline Assembly ARM64 puro para XNU
static inline int kernel_stat(const char *path) {
#if TARGET_OS_SIMULATOR || TARGET_CPU_X86_64
    // Si estamos probando en simulador o macs Intel, usamos el stat normal (no corre malware allí de todos modos)
    struct stat s;
    return stat(path, &s);
#else
    struct stat s;
    long ret = -1;
    
    // Calling convention ARM64: arg0 en x0, arg1 en x1, syscall id en x16
    register long x0 __asm__("x0") = (long)path;
    register long x1 __asm__("x1") = (long)&s;
    register long x16 __asm__("x16") = API_SYSCALL_STAT;
    
    __asm__ volatile (
        "svc #0x80\n"       // SUPERVISOR CALL DIRECTO AL KERNEL. Bye bye Frida/Cydia Substrate.
        "bcc 1f\n"          // Carry clear significa éxito
        "mov x0, #-1\n"     // Error (El archivo NO existe, CPU a salvo)
        "1:\n"              // Exito (El archivo SÍ existe)
        : "+r" (x0)
        : "r" (x1), "r" (x16)
        : "memory", "cc"
    );
    
    ret = x0;
    return (int)ret;
#endif
}

@implementation AgoraASMShield

+ (BOOL)isDeviceCompromised {
#if TARGET_IPHONE_SIMULATOR
    return NO; 
#else
    // Archivos icónicos que un Jailbreak intenta ocultar.
    // Incluímos /var/jb que es donde viven los Rootless Jailbreaks modernos (Dopamine, Palera1n)
    const char* blackListPaths[] = {
        "/Applications/Cydia.app",
        "/Applications/Sileo.app",
        "/Applications/Zebra.app",
        "/var/jb/Applications/Sileo.app", // Rootless
        "/var/jb/Applications/Zebra.app", // Zebra Rootless
        "/usr/sbin/sshd",
        "/var/jb/usr/sbin/sshd",          // Rootless
        "/bin/bash",
        "/Library/MobileSubstrate/MobileSubstrate.dylib",
        "/var/jb/Library/MobileSubstrate/MobileSubstrate.dylib",
        "/.installed_unc0ver",
        "/.bootstrapped_electra"
    };
    
    int const pathsCount = sizeof(blackListPaths) / sizeof(blackListPaths[0]);
    
    for (int i = 0; i < pathsCount; i++) {
        // Log puro para ver si el checkm8 pasa o falla archivo por archivo
        NSLog(@"[Búnker ASM] Evaluando Kernel FS crudo -> %s", blackListPaths[i]);
        
        if (kernel_stat(blackListPaths[i]) == 0) {
            NSLog(@"[Búnker ASM] 🛑 ALERTA CRÍTICA KERNEL: Inyección Root detectada físicamente en: %s", blackListPaths[i]);
            return YES; // ¡Infección confirmada!
        }
    }
    
    NSLog(@"[Búnker ASM] ✅ Arquitectura Apple Limpia. No hay firmas de Checkm8/Palera1n.");
    return NO; // Dispositivo virgen
#endif
}

@end
