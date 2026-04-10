#import "AgoraASMShield.h"
#import <sys/stat.h>
#import <sys/sysctl.h>
#import <mach/mach.h>
#import <mach-o/dyld.h>
#import <pthread.h>
#import <dlfcn.h>

// sys/ptrace.h NO está disponible en el iOS SDK público.
// Declaramos el prototipo y la constante manualmente.
// Usar dlsym en runtime es además más resistente al análisis estático del binario.
#define PT_DENY_ATTACH 31
typedef int (*AgoraPtraceFunc)(int request, pid_t pid, caddr_t addr, int data);

/**
 * EL ESCUDO ASM ARM64 — NIVEL KERNEL MÁXIMO
 * ==========================================
 *
 * Este módulo implementa 5 capas de detección de manipulación de entorno,
 * todas operando al nivel más bajo posible dentro del sandbox de iOS.
 *
 * TODAS las técnicas son 100% App Store Safe (inspeccionan SOLO el proceso propio).
 *
 * CAPA 1: PT_DENY_ATTACH — Mata cualquier debugger activamente (ptrace a kernel)
 * CAPA 2: ARM64 ASM svc #0x80 — Comprueba rutas de Jailbreak sin pasar por libc
 * CAPA 3: DYLD_INSERT_LIBRARIES — Variable de entorno usada por TODOS los injectors
 * CAPA 4: dyld image scanner — Detecta libfrida-agent.dylib, libsubstrate.dylib, etc.
 * CAPA 5: Mach thread scanner — Frida crea threads llamados "gum-js-loop"
 * CAPA 6: vm_region RWX scanner — Frida mapea páginas ejecutables en memoria
 */

#define API_SYSCALL_STAT 188

// =========================================================================
// MOTOR ARM64: Llamada directa al syscall de XNU sin pasar por libc
// Frida y Substrate hookean la versión de C de stat(). Esta no.
// =========================================================================
static inline int kernel_stat(const char *path) {
#if TARGET_OS_SIMULATOR || TARGET_CPU_X86_64
    struct stat s;
    return stat(path, &s);
#else
    struct stat s;
    register long x0 __asm__("x0") = (long)path;
    register long x1 __asm__("x1") = (long)&s;
    register long x16 __asm__("x16") = API_SYSCALL_STAT;
    
    __asm__ volatile (
        "svc #0x80\n"
        "bcc 1f\n"
        "mov x0, #-1\n"
        "1:\n"
        : "+r" (x0)
        : "r" (x1), "r" (x16)
        : "memory", "cc"
    );
    
    return (int)x0;
#endif
}

@implementation AgoraASMShield

// =========================================================================
// ACCIÓN ACTIVA: PT_DENY_ATTACH
// =========================================================================
// No es detección: es prevención. Le ordena al kernel XNU que destruya
// cualquier proceso que intente adjuntarse como debugger (ptrace/lldb/gdb).
// Si un debugger ya está adjunto cuando se llama, se produce SIGKILL inmediato.
//
// Es legal en App Store: Apple la usa en sus propias apps de DRM.
// =========================================================================
+ (void)activarAntiDebugger {
#if !TARGET_OS_SIMULATOR
    // Resolvemos ptrace en runtime via dlsym.
    // Ventaja vs. llamada directa:
    //   1. No requiere el header privado sys/ptrace.h
    //   2. El símbolo "ptrace" no aparece en la tabla de importaciones estáticas del binario
    //      → más difícil de detectar y parchear por herramientas de análisis estático.
    void *libSystem = dlopen("/usr/lib/libSystem.B.dylib", RTLD_LAZY);
    if (libSystem) {
        AgoraPtraceFunc ptraceFunc = (AgoraPtraceFunc)dlsym(libSystem, "ptrace");
        if (ptraceFunc) {
            ptraceFunc(PT_DENY_ATTACH, 0, 0, 0);
        }
        dlclose(libSystem);
    }
    
    // Verificación adicional via sysctl (P_TRACED flag del proceso)
    int mib[4] = { CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid() };
    struct kinfo_proc info;
    info.kp_proc.p_flag = 0;
    size_t size = sizeof(info);
    sysctl(mib, 4, &info, &size, NULL, 0);
    
    if ((info.kp_proc.p_flag & P_TRACED) != 0) {
        NSLog(@"[Búnker ARM64] 💀 DEBUGGER DETECTADO VÍA SYSCTL. Terminando proceso.");
        abort();
    }
    NSLog(@"[Búnker ARM64] 🛡️ Anti-Debugger activado. PT_DENY_ATTACH registrado en kernel.");
#endif
}

// =========================================================================
// CAPA 1: Jailbreak Detection (ARM64 ASM + kernel_stat)
// =========================================================================
+ (BOOL)isDeviceCompromised {
#if TARGET_IPHONE_SIMULATOR
    return NO;
#else
    const char* blackListPaths[] = {
        // Package Managers (Rootful)
        "/Applications/Cydia.app",
        "/Applications/Sileo.app",
        "/Applications/Zebra.app",
        "/Applications/Installer.app",
        // Rootless (iOS 15+ — Dopamine, Palera1n)
        "/var/jb/Applications/Sileo.app",
        "/var/jb/Applications/Zebra.app",
        "/var/jb/usr/sbin/sshd",
        "/var/jb/Library/MobileSubstrate/MobileSubstrate.dylib",
        // Binarios de sistema no presentes en iOS limpio
        "/usr/sbin/sshd",
        "/bin/bash",
        "/usr/bin/cycript",
        "/usr/local/bin/cycript",
        // Librerías de inyección
        "/Library/MobileSubstrate/MobileSubstrate.dylib",
        // Marcadores de bootstraps
        "/.installed_unc0ver",
        "/.bootstrapped_electra",
        "/var/jb/.bootstrapped",
    };
    
    int pathsCount = sizeof(blackListPaths) / sizeof(blackListPaths[0]);
    for (int i = 0; i < pathsCount; i++) {
        if (kernel_stat(blackListPaths[i]) == 0) {
            NSLog(@"[Búnker ARM64] 🛑 JAILBREAK: Ruta comprometida detectada por XNU: %s", blackListPaths[i]);
            return YES;
        }
    }
    return NO;
#endif
}

// =========================================================================
// CAPA 2: DYLD_INSERT_LIBRARIES check
// =========================================================================
// TODOS los injectors (Frida, Substrate, Electra, unc0ver) funcionan
// inyectando librerías via esta variable de entorno. Si está definida,
// hay algo inyectado en el proceso. Punto.
// =========================================================================
+ (BOOL)hasInjectedLibraries {
    const char *insertedLibs = getenv("DYLD_INSERT_LIBRARIES");
    if (insertedLibs != NULL) {
        NSLog(@"[Búnker ARM64] 🛑 INYECCIÓN: DYLD_INSERT_LIBRARIES = %s", insertedLibs);
        return YES;
    }
    return NO;
}

// =========================================================================
// CAPA 3: Scanner de librerías dinámicas (dyld image scan)
// =========================================================================
// Frida inyecta frida-agent.dylib. Substrate inyecta libsubstrate.dylib.
// Escaneamos TODOS los módulos cargados en el proceso.
// =========================================================================
+ (BOOL)hasSuspiciousDylib {
    uint32_t imageCount = _dyld_image_count();
    for (uint32_t i = 0; i < imageCount; i++) {
        const char *name = _dyld_get_image_name(i);
        if (!name) continue;
        
        // Lista de firmas de librerías de ataque conocidas
        const char *suspiciousNames[] = {
            "frida",
            "cynject",
            "libsubstrate",
            "libhooker",
            "ssllibpinningbypass",
            "a-bypass",
            "flexiblelayout",
            "substitute",
            "cycript",
            "tweakinject",
            NULL
        };
        
        for (int j = 0; suspiciousNames[j] != NULL; j++) {
            if (strcasestr(name, suspiciousNames[j]) != NULL) {
                NSLog(@"[Búnker ARM64] 🛑 DYLIB SOSPECHOSA: %s contiene firma '%s'", name, suspiciousNames[j]);
                return YES;
            }
        }
    }
    return NO;
}

// =========================================================================
// CAPA 4: Mach Thread Scanner (Frida gum-js-loop)
// =========================================================================
// Frida crea threads internos con el nombre "gum-js-loop" para su motor JS.
// Usamos la API Mach directa para enumerar todos los threads del proceso
// y comparar sus nombres. Extremadamente difícil de ocultar sin parchear XNU.
// =========================================================================
+ (BOOL)hasFridaThread {
#if TARGET_OS_SIMULATOR
    return NO;
#else
    const char *fridaThreadNames[] = {
        "gum-js-loop",
        "gmain",
        "gdbus",
        "frida",
        NULL
    };
    
    thread_act_array_t threads;
    mach_msg_type_number_t threadCount = 0;
    
    if (task_threads(mach_task_self(), &threads, &threadCount) != KERN_SUCCESS) {
        return NO; // No podemos enumerar, asumimos limpio
    }
    
    BOOL found = NO;
    char threadName[64];
    
    for (mach_msg_type_number_t i = 0; i < threadCount && !found; i++) {
        // Intentamos obtener el nombre del thread via pthread
        pthread_t pt = pthread_from_mach_thread_np(threads[i]);
        if (pt && pthread_getname_np(pt, threadName, sizeof(threadName)) == 0) {
            for (int j = 0; fridaThreadNames[j] != NULL; j++) {
                if (strstr(threadName, fridaThreadNames[j]) != NULL) {
                    NSLog(@"[Búnker ARM64] 🛑 FRIDA THREAD: '%s' detectado en la lista de threads del proceso", threadName);
                    found = YES;
                    break;
                }
            }
        }
        mach_port_deallocate(mach_task_self(), threads[i]);
    }
    
    vm_deallocate(mach_task_self(), (vm_address_t)threads, threadCount * sizeof(thread_t));
    return found;
#endif
}

// =========================================================================
// CAPA 5: Scanner de Regiones de Memoria RWX
// =========================================================================
// Un proceso iOS normal NO tiene páginas de memoria con permisos
// de Lectura + Escritura + Ejecución simultáneos (RWX).
// Frida necesita páginas RWX para escribir y ejecutar su código nativo.
// Usamos vm_region_64() del Mach Kernel para escanear el mapa de memoria.
// =========================================================================
+ (BOOL)hasRWXMemoryRegion {
#if TARGET_OS_SIMULATOR
    return NO;
#else
    vm_address_t address = 0;
    vm_size_t size = 0;
    uint32_t depth = 1;
    struct vm_region_submap_info_64 info;
    mach_msg_type_number_t infoCount = VM_REGION_SUBMAP_INFO_COUNT_64;
    
    while (vm_region_recurse_64(mach_task_self(), &address, &size, &depth,
                                 (vm_region_info_64_t)&info, &infoCount) == KERN_SUCCESS) {
        // RWX = VM_PROT_READ | VM_PROT_WRITE | VM_PROT_EXECUTE
        if (info.protection == (VM_PROT_READ | VM_PROT_WRITE | VM_PROT_EXECUTE)) {
            NSLog(@"[Búnker ARM64] 🛑 RWX PAGE: Región de memoria ejecutable-escribible detectada en 0x%lx (tamaño: %lu bytes)", address, size);
            return YES;
        }
        address += size;
    }
    return NO;
#endif
}

// =========================================================================
// VERIFICACIÓN COMBINADA — Todas las capas juntas
// =========================================================================
+ (BOOL)isEnvironmentCompromised {
#if DEBUG
    // En DEBUG: Siempre limpio. Permite desarrollar con Xcode sin interferencias.
    NSLog(@"[Búnker ARM64] 🔧 Modo DEBUG: Escudo desactivado para desarrollo.");
    return NO;
#else
    // En RELEASE (TestFlight/App Store): Escudo completo activado.
    // Orden de coste computacional: barato → caro
    
    if ([self hasInjectedLibraries]) {    // getenv() - casi gratuito
        return YES;
    }
    if ([self isDeviceCompromised]) {     // ASM kernel_stat x16 rutas
        return YES;
    }
    if ([self hasSuspiciousDylib]) {      // dyld scan - rápido
        return YES;
    }
    if ([self hasFridaThread]) {          // Mach threads - moderado
        return YES;
    }
    if ([self hasRWXMemoryRegion]) {      // vm_region scan - más lento
        return YES;
    }
    
    NSLog(@"[Búnker ARM64] ✅ Entorno completamente limpio. Todas las capas superadas.");
    return NO;
#endif
}

@end
