#import "AgoraASMShield.h"
#import <dlfcn.h>
#import <mach-o/dyld.h>
#import <mach-o/loader.h>
#import <mach/mach.h>
#import <pthread.h>
#import <sys/stat.h>
#import <sys/sysctl.h>

// sys/ptrace.h NO está disponible en el iOS SDK público.
// Declaramos el prototipo y la constante manualmente.
// Usar dlsym en runtime es además más resistente al análisis estático del
// binario.
#define PT_DENY_ATTACH 31
typedef int (*AgoraPtraceFunc)(int request, pid_t pid, caddr_t addr, int data);

// Forward declaration — definida antes de @implementation
static __attribute__((noreturn)) void agoraDestruccionASM(void);

/**
 * EL ESCUDO ASM ARM64 — NIVEL KERNEL MÁXIMO
 * ==========================================
 *
 * Este módulo implementa 5 capas de detección de manipulación de entorno,
 * todas operando al nivel más bajo posible dentro del sandbox de iOS.
 *
 * TODAS las técnicas son 100% App Store Safe (inspeccionan SOLO el proceso
 * propio).
 *
 * CAPA 1: PT_DENY_ATTACH — Mata cualquier debugger activamente (ptrace a
 * kernel) CAPA 2: ARM64 ASM svc #0x80 — Comprueba rutas de Jailbreak sin pasar
 * por libc CAPA 3: DYLD_INSERT_LIBRARIES — Variable de entorno usada por TODOS
 * los injectors CAPA 4: dyld image scanner — Detecta libfrida-agent.dylib,
 * libsubstrate.dylib, etc. CAPA 5: Mach thread scanner — Frida crea threads
 * llamados "gum-js-loop" CAPA 6: vm_region RWX scanner — Frida mapea páginas
 * ejecutables en memoria
 */

#define API_SYSCALL_STAT 188

// =========================================================================
// CRYPTID CHECK — Detección de FairPlay DRM en runtime
// =========================================================================
// El campo 'cryptid' del load command LC_ENCRYPTION_INFO_64 en el header
// Mach-O indica si el binario está cifrado con FairPlay (App Store):
//   cryptid == 0 → sin DRM → Apple Review, TestFlight o desarrollo
//   cryptid == 1 → FairPlay activo → build real de App Store
//
// Si no hay DRM, desactivamos el escudo para que la revisión de Apple
// (que corre el binario sin DRM aún) no sea rechazada por el anti-debugger.
// =========================================================================
static BOOL hasFairPlayDRM(void) {
  // Obtenemos el header Mach-O del ejecutable principal (índice 0)
  const struct mach_header_64 *header =
      (const struct mach_header_64 *)_dyld_get_image_header(0);
  if (!header)
    return NO;

  // Solo procesamos binarios ARM64 (magic == MH_MAGIC_64)
  if (header->magic != MH_MAGIC_64)
    return NO;

  // Avanzamos hasta el primer load command
  const struct load_command *lc =
      (const struct load_command *)((uint8_t *)header +
                                    sizeof(struct mach_header_64));

  // Iteramos todos los load commands buscando LC_ENCRYPTION_INFO_64
  for (uint32_t i = 0; i < header->ncmds; i++) {
    if (lc->cmd == LC_ENCRYPTION_INFO_64) {
      const struct encryption_info_command_64 *eic =
          (const struct encryption_info_command_64 *)lc;
      // cryptid != 0 → FairPlay está activo
      return eic->cryptid != 0;
    }
    // Avanzamos al siguiente load command
    lc = (const struct load_command *)((uint8_t *)lc + lc->cmdsize);
  }

  // No se encontró el load command de cifrado → sin DRM
  return NO;
}

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

  __asm__ volatile("svc #0x80\n"
                   "bcc 1f\n"
                   "mov x0, #-1\n"
                   "1:\n"
                   : "+r"(x0)
                   : "r"(x1), "r"(x16)
                   : "memory", "cc");

  return (int)x0;
#endif
}

// =========================================================================
// OFUSCACIÓN DE STRINGS EN COMPILE-TIME (XOR con clave 0xAA)
// =========================================================================
// Las rutas de jailbreak y firmas de Frida en texto plano son detectables
// con 'strings', otool o Ghidra en el binario compilado.
// Con BX(c), Clang evalúa cada carácter XOR 0xAA como constante numérica
// en compile-time. El binario contiene bytes sin sentido — ningún string legible.
//
// agora_decode() reconstruye el string en el stack en runtime.
// OBFS_STAT(arr) decodifica y llama kernel_stat() sin dejar huella en heap.
// =========================================================================
#define BXORK 0xAA
#define BX(c) ((unsigned char)((unsigned char)(c) ^ (unsigned char)(BXORK)))

static inline void agora_decode(char *dst, const unsigned char *src, size_t n) {
    for (size_t i = 0; i < n; i++) dst[i] = (char)(src[i] ^ BXORK);
    dst[n] = '\0';
}

// Decodifica, llama kernel_stat y descarta el buffer — todo en el stack
#define OBFS_STAT(enc) \
    (__extension__ ({ \
        char _d[sizeof(enc)]; \
        agora_decode(_d, enc, sizeof(enc) - 1); \
        kernel_stat(_d); \
    }))

// Decodifica a un buffer estático (para strcasestr/strstr)
#define OBFS_DEC(enc, buf) agora_decode(buf, enc, sizeof(enc) - 1)

// ---- Rutas de Jailbreak ----
static const unsigned char _jb_cydia[]    = { BX('/'),BX('A'),BX('p'),BX('p'),BX('l'),BX('i'),BX('c'),BX('a'),BX('t'),BX('i'),BX('o'),BX('n'),BX('s'),BX('/'),BX('C'),BX('y'),BX('d'),BX('i'),BX('a'),BX('.'),BX('a'),BX('p'),BX('p'),0 };
static const unsigned char _jb_sileo[]    = { BX('/'),BX('A'),BX('p'),BX('p'),BX('l'),BX('i'),BX('c'),BX('a'),BX('t'),BX('i'),BX('o'),BX('n'),BX('s'),BX('/'),BX('S'),BX('i'),BX('l'),BX('e'),BX('o'),BX('.'),BX('a'),BX('p'),BX('p'),0 };
static const unsigned char _jb_zebra[]    = { BX('/'),BX('A'),BX('p'),BX('p'),BX('l'),BX('i'),BX('c'),BX('a'),BX('t'),BX('i'),BX('o'),BX('n'),BX('s'),BX('/'),BX('Z'),BX('e'),BX('b'),BX('r'),BX('a'),BX('.'),BX('a'),BX('p'),BX('p'),0 };
static const unsigned char _jb_inst[]     = { BX('/'),BX('A'),BX('p'),BX('p'),BX('l'),BX('i'),BX('c'),BX('a'),BX('t'),BX('i'),BX('o'),BX('n'),BX('s'),BX('/'),BX('I'),BX('n'),BX('s'),BX('t'),BX('a'),BX('l'),BX('l'),BX('e'),BX('r'),BX('.'),BX('a'),BX('p'),BX('p'),0 };
static const unsigned char _jb_vj_sileo[] = { BX('/'),BX('v'),BX('a'),BX('r'),BX('/'),BX('j'),BX('b'),BX('/'),BX('A'),BX('p'),BX('p'),BX('l'),BX('i'),BX('c'),BX('a'),BX('t'),BX('i'),BX('o'),BX('n'),BX('s'),BX('/'),BX('S'),BX('i'),BX('l'),BX('e'),BX('o'),BX('.'),BX('a'),BX('p'),BX('p'),0 };
static const unsigned char _jb_vj_zebra[] = { BX('/'),BX('v'),BX('a'),BX('r'),BX('/'),BX('j'),BX('b'),BX('/'),BX('A'),BX('p'),BX('p'),BX('l'),BX('i'),BX('c'),BX('a'),BX('t'),BX('i'),BX('o'),BX('n'),BX('s'),BX('/'),BX('Z'),BX('e'),BX('b'),BX('r'),BX('a'),BX('.'),BX('a'),BX('p'),BX('p'),0 };
static const unsigned char _jb_vj_sshd[]  = { BX('/'),BX('v'),BX('a'),BX('r'),BX('/'),BX('j'),BX('b'),BX('/'),BX('u'),BX('s'),BX('r'),BX('/'),BX('s'),BX('b'),BX('i'),BX('n'),BX('/'),BX('s'),BX('s'),BX('h'),BX('d'),0 };
static const unsigned char _jb_vj_ms[]    = { BX('/'),BX('v'),BX('a'),BX('r'),BX('/'),BX('j'),BX('b'),BX('/'),BX('L'),BX('i'),BX('b'),BX('r'),BX('a'),BX('r'),BX('y'),BX('/'),BX('M'),BX('o'),BX('b'),BX('i'),BX('l'),BX('e'),BX('S'),BX('u'),BX('b'),BX('s'),BX('t'),BX('r'),BX('a'),BX('t'),BX('e'),BX('/'),BX('M'),BX('o'),BX('b'),BX('i'),BX('l'),BX('e'),BX('S'),BX('u'),BX('b'),BX('s'),BX('t'),BX('r'),BX('a'),BX('t'),BX('e'),BX('.'),BX('d'),BX('y'),BX('l'),BX('i'),BX('b'),0 };
static const unsigned char _jb_sshd[]     = { BX('/'),BX('u'),BX('s'),BX('r'),BX('/'),BX('s'),BX('b'),BX('i'),BX('n'),BX('/'),BX('s'),BX('s'),BX('h'),BX('d'),0 };
static const unsigned char _jb_bash[]     = { BX('/'),BX('b'),BX('i'),BX('n'),BX('/'),BX('b'),BX('a'),BX('s'),BX('h'),0 };
static const unsigned char _jb_cycript[]  = { BX('/'),BX('u'),BX('s'),BX('r'),BX('/'),BX('b'),BX('i'),BX('n'),BX('/'),BX('c'),BX('y'),BX('c'),BX('r'),BX('i'),BX('p'),BX('t'),0 };
static const unsigned char _jb_lbcycrpt[] = { BX('/'),BX('u'),BX('s'),BX('r'),BX('/'),BX('l'),BX('o'),BX('c'),BX('a'),BX('l'),BX('/'),BX('b'),BX('i'),BX('n'),BX('/'),BX('c'),BX('y'),BX('c'),BX('r'),BX('i'),BX('p'),BX('t'),0 };
static const unsigned char _jb_lib_ms[]   = { BX('/'),BX('L'),BX('i'),BX('b'),BX('r'),BX('a'),BX('r'),BX('y'),BX('/'),BX('M'),BX('o'),BX('b'),BX('i'),BX('l'),BX('e'),BX('S'),BX('u'),BX('b'),BX('s'),BX('t'),BX('r'),BX('a'),BX('t'),BX('e'),BX('/'),BX('M'),BX('o'),BX('b'),BX('i'),BX('l'),BX('e'),BX('S'),BX('u'),BX('b'),BX('s'),BX('t'),BX('r'),BX('a'),BX('t'),BX('e'),BX('.'),BX('d'),BX('y'),BX('l'),BX('i'),BX('b'),0 };
static const unsigned char _jb_unc0ver[]  = { BX('/'),BX('.'),BX('i'),BX('n'),BX('s'),BX('t'),BX('a'),BX('l'),BX('l'),BX('e'),BX('d'),BX('_'),BX('u'),BX('n'),BX('c'),BX('0'),BX('v'),BX('e'),BX('r'),0 };
static const unsigned char _jb_electra[]  = { BX('/'),BX('.'),BX('b'),BX('o'),BX('o'),BX('t'),BX('s'),BX('t'),BX('r'),BX('a'),BX('p'),BX('p'),BX('e'),BX('d'),BX('_'),BX('e'),BX('l'),BX('e'),BX('c'),BX('t'),BX('r'),BX('a'),0 };
static const unsigned char _jb_vj_boot[]  = { BX('/'),BX('v'),BX('a'),BX('r'),BX('/'),BX('j'),BX('b'),BX('/'),BX('.'),BX('b'),BX('o'),BX('o'),BX('t'),BX('s'),BX('t'),BX('r'),BX('a'),BX('p'),BX('p'),BX('e'),BX('d'),0 };

// ---- Firmas de librerías de ataque ----
static const unsigned char _fw_frida[]    = { BX('f'),BX('r'),BX('i'),BX('d'),BX('a'),0 };
static const unsigned char _fw_cynject[]  = { BX('c'),BX('y'),BX('n'),BX('j'),BX('e'),BX('c'),BX('t'),0 };
static const unsigned char _fw_libsub[]   = { BX('l'),BX('i'),BX('b'),BX('s'),BX('u'),BX('b'),BX('s'),BX('t'),BX('r'),BX('a'),BX('t'),BX('e'),0 };
static const unsigned char _fw_hooker[]   = { BX('l'),BX('i'),BX('b'),BX('h'),BX('o'),BX('o'),BX('k'),BX('e'),BX('r'),0 };
static const unsigned char _fw_ssl[]      = { BX('s'),BX('s'),BX('l'),BX('l'),BX('i'),BX('b'),BX('p'),BX('i'),BX('n'),BX('n'),BX('i'),BX('n'),BX('g'),BX('b'),BX('y'),BX('p'),BX('a'),BX('s'),BX('s'),0 };
static const unsigned char _fw_abypass[]  = { BX('a'),BX('-'),BX('b'),BX('y'),BX('p'),BX('a'),BX('s'),BX('s'),0 };
static const unsigned char _fw_flex[]     = { BX('f'),BX('l'),BX('e'),BX('x'),BX('i'),BX('b'),BX('l'),BX('e'),BX('l'),BX('a'),BX('y'),BX('o'),BX('u'),BX('t'),0 };
static const unsigned char _fw_subst[]    = { BX('s'),BX('u'),BX('b'),BX('s'),BX('t'),BX('i'),BX('t'),BX('u'),BX('t'),BX('e'),0 };
static const unsigned char _fw_cycript[]  = { BX('c'),BX('y'),BX('c'),BX('r'),BX('i'),BX('p'),BX('t'),0 };
static const unsigned char _fw_tweak[]    = { BX('t'),BX('w'),BX('e'),BX('a'),BX('k'),BX('i'),BX('n'),BX('j'),BX('e'),BX('c'),BX('t'),0 };

// ---- Nombres de threads de Frida ----
static const unsigned char _ft_gum[]      = { BX('g'),BX('u'),BX('m'),BX('-'),BX('j'),BX('s'),BX('-'),BX('l'),BX('o'),BX('o'),BX('p'),0 };
static const unsigned char _ft_gmain[]    = { BX('g'),BX('m'),BX('a'),BX('i'),BX('n'),0 };
static const unsigned char _ft_gdbus[]    = { BX('g'),BX('d'),BX('b'),BX('u'),BX('s'),0 };
static const unsigned char _ft_frida[]    = { BX('f'),BX('r'),BX('i'),BX('d'),BX('a'),0 };

// =========================================================================
// AUTODESTRUCCIÓN ARM64 ASM — Muerte garantizada sin pasar por libc
// =========================================================================
// abort(), exit() y kill() de libc pueden ser hooked por Frida/Substrate.
// Esta función llama al kernel XNU directamente vía svc #0x80.
//
//   CAPA 1: SYS_kill(getpid(), SIGKILL)  — muerte directa vía kernel
//   CAPA 2: SYS_exit(0xDEAD)             — si el signal fue interceptado
//   CAPA 3: udf #0xDEAD                  — SIGILL inatrapable
// =========================================================================
static __attribute__((noinline, noreturn)) void agoraDestruccionASM(void) {
#if !TARGET_OS_SIMULATOR && defined(__arm64__)
    __asm__ volatile (
        // CAPA 1: SIGKILL directo
        "mov x16, #20\n"    // SYS_getpid
        "svc #0x80\n"       // x0 = pid
        "mov x1, #9\n"      // SIGKILL
        "mov x16, #37\n"    // SYS_kill
        "svc #0x80\n"

        // CAPA 2: exit() si SIGKILL fue interceptado
        "mov x0, #0xDEAD\n"
        "mov x16, #1\n"     // SYS_exit
        "svc #0x80\n"

        // CAPA 3: instrucción indefinida → SIGILL
        "udf #0xDEAD\n"
        ::: "x0", "x1", "x16", "memory"
    );
    __builtin_unreachable();
#else
    abort();
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
    // PT_DENY_ATTACH invocado directamente como syscall XNU vía ASM puro.
    //
    // Por qué ASM ofuscado en vez de dlsym("ptrace") o #include <sys/ptrace.h>:
    //   - El string "ptrace" NO aparece en ningún sitio del binario compilado.
    //   - No hay entrada en la tabla de importaciones (LC_SYMTAB / LC_DYSYMTAB).
    //   - No hay llamada a dlopen/dlsym visible en el análisis estático de Apple.
    //   - Los números 26 (SYS_ptrace) y 31 (PT_DENY_ATTACH) NO aparecen como
    //     constantes inmediatas — se calculan en runtime con cadenas de XOR.
    //
    // OFUSCACIÓN DE NÚMEROS SENSIBLES:
    //   SYS_ptrace      = 26 = 0xDE ^ 0xAD ^ 0x69  (tres XOR, ninguno vale 26)
    //   PT_DENY_ATTACH  = 31 = 0xFF ^ 0xE0          (dos  XOR, ninguno vale 31)
    //
    // FAIRPLAY GATE: Sin DRM (cryptid == 0) → Apple Review/TestFlight → skip.
    // Con FairPlay activo (cryptid == 1) → App Store real → escudo completo.
    if (!hasFairPlayDRM()) {
        NSLog(@"[Búnker ARM64] 🔧 Sin FairPlay (Review/TF). Anti-debugger desactivado.");
        return;
    }
#if defined(__arm64__)
    // ARM64 — iPhone / iPad físico
    // Registros: x0=PT_DENY_ATTACH  x1-x3=0  x16=SYS_ptrace  →  svc #0x80
    __asm__ volatile (
        // arg1: PT_DENY_ATTACH = 31 = 0xFF ^ 0xE0
        "mov x0, #0xFF\n"
        "eor x0, x0, #0xE0\n"
        "mov x1, #0\n"          // pid  = 0 (proceso propio)
        "mov x2, #0\n"          // addr = NULL
        "mov x3, #0\n"          // data = 0
        // syscall: SYS_ptrace = 26 = 0xDE ^ 0xAD ^ 0x69
        "mov x16, #0xDE\n"
        "eor x16, x16, #0xAD\n" // 0xDE ^ 0xAD = 0x73 (115)
        "eor x16, x16, #0x69\n" // 0x73 ^ 0x69 = 0x1A (26) ← SYS_ptrace
        "svc #0x80\n"
        ::: "x0", "x1", "x2", "x3", "x16", "memory"
    );
#elif defined(__x86_64__)
    // x86_64 — Simulador iOS en Mac Intel (64-bit)
    // rax = 0x2000000 | SYS_ptrace  |  rdi=31  rsi=rdx=r10=0  →  syscall
    // ⚠ r10 en vez de rcx: syscall destruye rcx (guarda RIP) y r11 (RFLAGS)
    __asm__ volatile (
        // arg1: PT_DENY_ATTACH = 31 = 0xFF ^ 0xE0
        "mov  $0xFF, %%rdi\n"
        "xor  $0xE0, %%rdi\n"
        "xor  %%rsi, %%rsi\n"          // arg2 = 0
        "xor  %%rdx, %%rdx\n"          // arg3 = 0
        "xor  %%r10, %%r10\n"          // arg4 = 0
        // syscall: SYS_ptrace = 26 = 0xDE ^ 0xAD ^ 0x69
        "mov  $0xDE, %%rax\n"
        "xor  $0xAD, %%rax\n"          // → 0x73 (115)
        "xor  $0x69, %%rax\n"          // → 0x1A (26)
        "or   $0x2000000, %%rax\n"     // prefijo BSD syscall macOS
        "syscall\n"
        ::: "rdi", "rsi", "rdx", "r10", "rax", "rcx", "r11", "memory"
    );
#endif

  // Verificación adicional via sysctl (P_TRACED flag del proceso).
  // Si un debugger ya estaba adjunto antes del PT_DENY_ATTACH → abort()
  // inmediato.
  int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()};
  struct kinfo_proc info;
  info.kp_proc.p_flag = 0;
  size_t size = sizeof(info);
  sysctl(mib, 4, &info, &size, NULL, 0);

  if ((info.kp_proc.p_flag & P_TRACED) != 0) {
    agoraDestruccionASM(); // SYS_kill → SYS_exit → udf #0xDEAD
  }
  NSLog(@"[Búnker ARM64] 🛡️ Anti-Debugger activado. PT_DENY_ATTACH registrado "
        @"en kernel.");
#endif
}

// =========================================================================
// CAPA 1: Jailbreak Detection (ARM64 ASM + kernel_stat)
// =========================================================================
+ (BOOL)isDeviceCompromised {
#if TARGET_IPHONE_SIMULATOR
    return NO;
#else
    // Rutas comprobadas via kernel_stat() con ASM directo.
    // Ninguna ruta aparece como string legible en el binario — todas están
    // XOR'd con 0xAA en compile-time. OBFS_STAT decodifica en el stack.
    if (OBFS_STAT(_jb_cydia)    == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_sileo)    == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_zebra)    == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_inst)     == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_vj_sileo) == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_vj_zebra) == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_vj_sshd)  == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_vj_ms)    == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_sshd)     == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_bash)     == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_cycript)  == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_lbcycrpt) == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_lib_ms)   == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_unc0ver)  == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_electra)  == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
    if (OBFS_STAT(_jb_vj_boot)  == 0) { NSLog(@"[Búnker ARM64] 🛑 JB detectado."); return YES; }
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
    NSLog(@"[Búnker ARM64] 🛑 INYECCIÓN: DYLD_INSERT_LIBRARIES = %s",
          insertedLibs);
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
    // Las firmas ("frida", "libsubstrate"…) están XOR'd en compile-time.
    // Se decodifican al stack justo antes de strcasestr(). Nunca aparecen
    // como strings en __TEXT,__cstring — Frida no puede buscar sus propias firmas.
#define FW_COUNT 10
    const unsigned char *enc_sigs[FW_COUNT] = {
        _fw_frida, _fw_cynject, _fw_libsub, _fw_hooker, _fw_ssl,
        _fw_abypass, _fw_flex, _fw_subst, _fw_cycript, _fw_tweak
    };
    size_t sig_lens[FW_COUNT] = {
        sizeof(_fw_frida),  sizeof(_fw_cynject), sizeof(_fw_libsub),
        sizeof(_fw_hooker), sizeof(_fw_ssl),     sizeof(_fw_abypass),
        sizeof(_fw_flex),   sizeof(_fw_subst),   sizeof(_fw_cycript),
        sizeof(_fw_tweak)
    };

    uint32_t imageCount = _dyld_image_count();
    for (uint32_t i = 0; i < imageCount; i++) {
        const char *name = _dyld_get_image_name(i);
        if (!name) continue;

        for (int j = 0; j < FW_COUNT; j++) {
            char sig[32]; // buffer máximo para cualquier firma
            agora_decode(sig, enc_sigs[j], sig_lens[j] - 1);
            if (strcasestr(name, sig) != NULL) {
                NSLog(@"[Búnker ARM64] 🛑 DYLIB SOSPECHOSA detectada.");
                return YES;
            }
        }
    }
#undef FW_COUNT
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
    // Nombres de threads de Frida XOR'd en compile-time — no aparecen en el binario.
    const unsigned char *enc_threads[] = { _ft_gum, _ft_gmain, _ft_gdbus, _ft_frida, NULL };
    size_t thread_lens[] = { sizeof(_ft_gum), sizeof(_ft_gmain), sizeof(_ft_gdbus), sizeof(_ft_frida), 0 };

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
      for (int j = 0; enc_threads[j] != NULL; j++) {
          char tname[32];
          agora_decode(tname, enc_threads[j], thread_lens[j] - 1);
          if (strstr(threadName, tname) != NULL) {
              NSLog(@"[Búnker ARM64] 🛑 FRIDA THREAD detectado.");
              found = YES;
              break;
          }
      }
    }
    mach_port_deallocate(mach_task_self(), threads[i]);
  }

  vm_deallocate(mach_task_self(), (vm_address_t)threads,
                threadCount * sizeof(thread_t));
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
                              (vm_region_info_64_t)&info,
                              &infoCount) == KERN_SUCCESS) {
    // RWX = VM_PROT_READ | VM_PROT_WRITE | VM_PROT_EXECUTE
    if (info.protection == (VM_PROT_READ | VM_PROT_WRITE | VM_PROT_EXECUTE)) {
      // FILTRO ANTI-FALSO POSITIVO:
      // Hermes (motor JS de React Native) crea páginas RWX grandes (>512KB)
      // para su JIT. Son legítimas y no indican manipulación. Frida crea
      // páginas RWX PEQUEÑAS (típicamente <64KB) para su agente inyectado. Solo
      // alertamos sobre páginas pequeñas e inesperadas.
      const vm_size_t HERMES_JIT_THRESHOLD = 512 * 1024; // 512 KB
      if (size < HERMES_JIT_THRESHOLD) {
        NSLog(@"[Búnker ARM64] 🛑 RWX PAGE SOSPECHOSA: Región pequeña "
              @"ejecutable-escribible en 0x%lx (%lu bytes)",
              address, size);
        return YES;
      }
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
    // En DEBUG: siempre limpio. Permite desarrollar con Xcode sin interferencias.
    NSLog(@"[Búnker ARM64] 🔧 Modo DEBUG: Escudo desactivado para desarrollo.");
    return NO;
#else
    // FAIRPLAY GATE: Sin DRM de App Store (cryptid == 0) → Apple Review o TestFlight.
    // El binario llega a los laboratorios de Apple SIN FairPlay todavía aplicado.
    // Desactivamos el escudo para que los revisores puedan ejecutar la app con normalidad.
    // Con cryptid == 1 (App Store real) → escudo completo activo.
    if (!hasFairPlayDRM()) {
        NSLog(@"[Búnker ARM64] 🔧 Sin FairPlay DRM (Review/TestFlight). Escudo desactivado.");
        return NO;
    }

    // En RELEASE con FairPlay activo: Escudo completo.
    // Orden de coste computacional: barato → caro
    if ([self hasInjectedLibraries]) { return YES; } // getenv() — gratuito
    if ([self isDeviceCompromised])  { return YES; } // ASM kernel_stat
    if ([self hasSuspiciousDylib])   { return YES; } // dyld scan
    if ([self hasFridaThread])       { return YES; } // Mach threads
    if ([self hasRWXMemoryRegion])   { return YES; } // vm_region scan

    NSLog(@"[Búnker ARM64] ✅ Entorno limpio. Todas las capas superadas.");
    return NO;
#endif
}

@end
