#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface AgoraASMShield : NSObject

/**
 * ACCIÓN ACTIVA — PT_DENY_ATTACH (Nivel Kernel)
 * Llama a ptrace(PT_DENY_ATTACH) en XNU. Mata cualquier debugger adjunto.
 * Llamar lo antes posible en el arranque de la app (antes de cualquier lógica).
 */
+ (void)activarAntiDebugger;

/**
 * CAPA 1 — Jailbreak via ARM64 ASM (svc #0x80 directo a XNU)
 * Comprueba rutas del sistema sin pasar por libc (que Frida puede hookear).
 * Detecta: Cydia, Sileo, Dopamine, Palera1n, unc0ver, ElectraJB y sus variantes Rootless.
 */
+ (BOOL)isDeviceCompromised;

/**
 * CAPA 2 — DYLD_INSERT_LIBRARIES
 * Todos los injectors (Frida, Cycript, Substitute, A-Bypass) usan esta variable.
 * Si está definida, hay código inyectado en el proceso.
 */
+ (BOOL)hasInjectedLibraries;

/**
 * CAPA 3 — Scanner de librerías dinámicas (dyld)
 * Detecta frida-agent.dylib, libsubstrate.dylib, cycript, tweakinject, etc.
 * Escanea TODOS los módulos cargados en memoria del proceso.
 */
+ (BOOL)hasSuspiciousDylib;

/**
 * CAPA 4 — Scanner de Threads Mach (Frida gum-js-loop)
 * Frida crea threads internos con el nombre "gum-js-loop" para su motor JS.
 * Usa task_threads() del Mach Kernel para enumerar todos los threads del proceso.
 * Extremadamente difícil de ocultar sin modificar el kernel.
 */
+ (BOOL)hasFridaThread;

/**
 * CAPA 5 — Scanner de Regiones de Memoria RWX
 * Un proceso iOS limpio NO tiene páginas RWX (Lectura+Escritura+Ejecución).
 * Frida necesita páginas RWX para su JIT. Las detectamos con vm_region_64().
 */
+ (BOOL)hasRWXMemoryRegion;

/**
 * VERIFICACIÓN COMBINADA — Todas las capas juntas
 * Ejecuta las 5 capas en orden de coste computacional (barato → caro).
 * Retorna YES en cuanto cualquier capa detecta manipulación.
 */
+ (BOOL)isEnvironmentCompromised;

@end

NS_ASSUME_NONNULL_END
