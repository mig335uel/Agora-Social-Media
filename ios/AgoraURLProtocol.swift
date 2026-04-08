import Foundation

@objc public class AgoraURLProtocol: URLProtocol, URLSessionDataDelegate {
    private var sessionTask: URLSessionTask?
    
    // ==========================================
    // 1. CONDICIÓN DE INTERCEPCIÓN
    // ==========================================
    public override class func canInit(with request: URLRequest) -> Bool {
        // Solo atrapar misiles hacia Supabase que no hayamos procesado ya
        guard let url = request.url?.absoluteString else { return false }
        if url.contains("supabase.co") && URLProtocol.property(forKey: "AgoraBunkerProcessed", in: request) == nil {
            print("\n[Búnker RED iOS] 🌐 Radar activado. Deteniendo solicitud saliente hacia JS -> \(url)")
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
        guard let mutableRequest = (request as NSURLRequest).mutableCopy() as? NSMutableURLRequest else { return }
        
        // Marcamos para no entrar en un bucle infinito
        URLProtocol.setProperty(true, forKey: "AgoraBunkerProcessed", in: mutableRequest)
        
        // Extraemos JWT y public key reales nativamente y reescribimos el payload de React Native
        let apiKeyReal = AgoraKeyManager.extraerClaveDelBunker() ?? ""
        if !apiKeyReal.isEmpty {
            print("[Búnker RED iOS] 🛡️ Inyectando apikey nativo en Header...")
            mutableRequest.setValue(apiKeyReal, forHTTPHeaderField: "apikey")
            
            let fakeKeySentByJS = self.request.value(forHTTPHeaderField: "apikey") ?? ""
            let authHeader = self.request.value(forHTTPHeaderField: "Authorization")
            if let auth = authHeader, auth == "Bearer \(fakeKeySentByJS)" {
                print("[Búnker RED iOS] 🎭 Remplazando Token Web Anon con Token JWT Session Fuerte...")
                mutableRequest.setValue("Bearer \(apiKeyReal)", forHTTPHeaderField: "Authorization")
            }
            
            let isWebSocket = self.request.value(forHTTPHeaderField: "Upgrade")?.lowercased() == "websocket"
            let isRealtime = self.request.url?.absoluteString.contains("/realtime") == true
            if isWebSocket || isRealtime {
                if let secPubKey = AgoraKeyManager.generarYObtenerClavePublica() {
                    print("[Búnker RED iOS] 📡 WS Detectado! Inyectando RSA public_key al socket...")
                    mutableRequest.setValue(secPubKey, forHTTPHeaderField: "x-agora-publickey")
                }
            }
        }
        
        // Lanzamos la clonación modificada al servidor de Supabase
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
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
    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        client?.urlProtocol(self, didLoad: data)
    }

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .allowed)
        completionHandler(.allow)
    }

    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            client?.urlProtocol(self, didFailWithError: error)
        } else {
            client?.urlProtocolDidFinishLoading(self)
        }
    }
    
    // ==========================================
    // 4. SSL PINNING (MITM CORPORATIVO/HACKER)
    // ==========================================
    public func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust {
            if let serverTrust = challenge.protectionSpace.serverTrust {
                
                // --- Aquí es donde se hace el SSL Pinning Duro ---
                // Tu app evaluará si el certificado entregado por "supabase.co" 
                // hace matching con el Public Key Hash que tú hardcodees aquí.
                // Si la red WiFi de una escuela/corporativo inyecta un proxy, esto lo bloquea.
                
                let isSecure = true // En producción cambiar la lógica para revisar el Public Key Pinning (SPKI)
                
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
        completionHandler(.performDefaultHandling, nil) // Comportamiento default para el resto
    }
}
