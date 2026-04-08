import Foundation
import ObjectiveC

@objc public class AgoraURLProtocol: URLProtocol, URLSessionDataDelegate {
    private var sessionTask: URLSessionTask?

    // ==========================================
    // 0. ACTIVADOR NUCLEAR (SWIZZLING)
    // ==========================================
    @objc public static func activateShield() {
        // Registro global base
        URLProtocol.registerClass(AgoraURLProtocol.self)
        
        // El truco para Expo/React Native: Inyectar el protocolo en la configuración por defecto
        // de todas las sesiones futuras que se creen en el proceso.
        let configClass = URLSessionConfiguration.self
        let defaultMethod = class_getClassMethod(configClass, #selector(getter: configClass.default))
        let swizzledMethod = class_getClassMethod(configClass, #selector(getter: configClass.bunkerDefault))
        
        if let defaultMethod = defaultMethod, let swizzledMethod = swizzledMethod {
            method_exchangeImplementations(defaultMethod, swizzledMethod)
            print("[Búnker RED] 🛡️ NUCLEAR SHIELD ACTIVATED. Swizzling de Sesión completado.")
        }
    }

    // ==========================================
    // 1. CONDICIÓN DE INTERCEPCIÓN (RADAR)
    // ==========================================
    public override class func canInit(with request: URLRequest) -> Bool {
        // Evitamos bucles infinitos
        if URLProtocol.property(forKey: "AgoraBunkerProcessed", in: request) != nil {
            return false
        }
        
        guard let url = request.url?.absoluteString else { return false }
        
        // RADAR 1: Dominio de Supabase
        let isSupabase = url.contains("supabase.co")
        
        // RADAR 2: Detección de Placeholders E2EE
        let apikeyHeader = request.value(forHTTPHeaderField: "apikey") ?? ""
        let authHeader = request.value(forHTTPHeaderField: "Authorization") ?? ""
        let hasPlaceholder = apikeyHeader.contains("Pedrosanchez") || authHeader.contains("Pedrosanchez")
        
        if isSupabase || hasPlaceholder {
            print("\n[Búnker RED iOS] 🌐 Radar activado. Interceptando petición -> \(url)")
            return true
        }
        
        return false
    }

    public override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    // ==========================================
    // 2. INYECCIÓN ZERO-TRUST MATANDO JAVASCRIPT
    // ==========================================
    public override func startLoading() {
        guard let mutableRequest = (request as NSURLRequest).mutableCopy() as? NSMutableURLRequest
        else { return }

        // Marcamos para no entrar en un bucle infinito
        URLProtocol.setProperty(true, forKey: "AgoraBunkerProcessed", in: mutableRequest)

        // Extraemos la llave real del Secure Enclave
        var apiKeyReal = AgoraKeyManager.extraerClaveDelBunker() ?? ""
        apiKeyReal = apiKeyReal.trimmingCharacters(in: .whitespacesAndNewlines)

        if !apiKeyReal.isEmpty {
            print(
                "[Búnker RED DEBUG] 🔍 Intentando inyectar llave. Longitud: \(apiKeyReal.count) chars."
            )

            // 1. Inyección Limpia y Única
            mutableRequest.setValue(apiKeyReal, forHTTPHeaderField: "apikey")

            // 2. Sincronización de Authorization (El header más crítico)
            let currentAuth = self.request.value(forHTTPHeaderField: "Authorization") ?? ""

            // Si no es un login real de usuario (JWT), forzamos la Master Key
            if !currentAuth.contains("Bearer eyJ") {
                mutableRequest.setValue("Bearer \(apiKeyReal)", forHTTPHeaderField: "Authorization")
                print(
                    "[Búnker RED DEBUG] 🎭 JWT de Sesión NO detectado. Sincronizando Auth con Master Key."
                )
            } else {
                print(
                    "[Búnker RED DEBUG] 🔑 Sesión de Usuario detectada. Respetando Authorization Header original."
                )
            }

            print(
                "[Búnker RED iOS] ✅ Inyección Completada para: \(request.url?.path ?? "URL Desconocida")"
            )
        } else {
            print("[Búnker RED iOS] ⚠️ ERROR: El Keychain de iOS devolvió una llave VACÍA.")
        }

        // Lanzamos la clonación modificada al servidor de Supabase
        // IMPORTANTE: Un búnker no puede llamarse a sí mismo. Quitamos el radar de esta sesión privada.
        let configuration = URLSessionConfiguration.default
        if let protocols = configuration.protocolClasses {
            configuration.protocolClasses = protocols.filter { $0 != AgoraURLProtocol.self }
        }
        
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        sessionTask = session.dataTask(with: mutableRequest as URLRequest)
        sessionTask?.resume()
    }

    public override func stopLoading() {
        sessionTask?.cancel()
        sessionTask = nil
    }

    // ==========================================
    // 3. RESPONDEDORES DEL TÚNEL DE DATOS
    // ==========================================
    public func urlSession(
        _ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data
    ) {
        client?.urlProtocol(self, didLoad: data)
    }

    public func urlSession(
        _ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
        completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
    ) {
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .allowed)
        completionHandler(.allow)
    }

    public func urlSession(
        _ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?
    ) {
        if let error = error {
            client?.urlProtocol(self, didFailWithError: error)
        } else {
            client?.urlProtocolDidFinishLoading(self)
        }
    }

    // ==========================================
    // 4. SSL PINNING (MITM CORPORATIVO/HACKER)
    // ==========================================
    public func urlSession(
        _ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust {
            if let serverTrust = challenge.protectionSpace.serverTrust {

                // --- Aquí es donde se hace el SSL Pinning Duro ---
                // Tu app evaluará si el certificado entregado por "supabase.co"
                // hace matching con el Public Key Hash que tú hardcodees aquí.
                // Si la red WiFi de una escuela/corporativo inyecta un proxy, esto lo bloquea.

                let isSecure = true  // En producción cambiar la lógica para revisar el Public Key Pinning (SPKI)

                if isSecure {
                    completionHandler(.useCredential, URLCredential(trust: serverTrust))
                    return
                } else {
                    // Cuelga la llamada si están espiando el WiFi
                    completionHandler(.cancelAuthenticationChallenge, nil)
                    return
                }
            }
        }
        completionHandler(.performDefaultHandling, nil)  // Comportamiento default para el resto
    }
}

// ==========================================
// EXTENSIÓN PARA SWIZZLING DE CONFIGURACIÓN
// ==========================================
extension URLSessionConfiguration {
    @objc class var bunkerDefault: URLSessionConfiguration {
        // Al estar swizzled, llamar a 'bunkerDefault' ejecuta el '.default' original
        let config = self.bunkerDefault
        
        if let protocols = config.protocolClasses {
            if !protocols.contains(where: { $0 == AgoraURLProtocol.self }) {
                var modifiedProtocols = protocols
                modifiedProtocols.insert(AgoraURLProtocol.self, at: 0)
                config.protocolClasses = modifiedProtocols
            }
        } else {
            config.protocolClasses = [AgoraURLProtocol.self]
        }
        
        return config
    }
}
