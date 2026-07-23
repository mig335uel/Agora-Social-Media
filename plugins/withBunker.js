const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withBunker = (config) => {
    config = withMainApplication(config, async (config) => {
        let content = config.modResults.contents;

        // Inyección de imports
        if (!content.includes('com.facebook.react.modules.network.OkHttpClientProvider')) {
            content = content.replace(
                'import android.app.Application',
                'import android.app.Application\nimport com.facebook.react.modules.network.OkHttpClientProvider\nimport com.facebook.react.modules.network.OkHttpClientFactory\nimport okhttp3.*\nimport kotlinx.coroutines.GlobalScope\nimport kotlinx.coroutines.launch'
            );
        }

        // Inicialización en onCreate
        if (!content.includes('AgoraKeyManager.inicializarBunker')) {
            const onCreateSearch = 'super.onCreate()';
            const onCreateInjection = `\n    super.onCreate()\n    GlobalScope.launch {\n      AgoraKeyManager.inicializarBunker(this@MainApplication)\n    }`;
            content = content.replace(onCreateSearch, onCreateInjection);
        }

        // Interceptor OkHttp
        if (!content.includes('OkHttpClientProvider.setOkHttpClientFactory')) {
            const interceptorCode = `
    OkHttpClientProvider.setOkHttpClientFactory(object : OkHttpClientFactory {
      override fun createNewNetworkModuleClient(): OkHttpClient {
        val builder = OkHttpClientProvider.createClientBuilder()
        return builder.addInterceptor { chain ->
            val request = chain.request()
            if (request.url.host.contains("supabase.co") || request.url.host.contains("database.agoras.es")) {
              val apiKeyReal = AgoraKeyManager.extraerClaveDelBunker(applicationContext) ?: ""
              if (apiKeyReal.isNotEmpty()) {
                  android.util.Log.i("Bunker", "Bunker: Petición a Supabase detectada. Inyectando llave...")
                  val secureRequestBuilder = request.newBuilder().header("apikey", apiKeyReal)
                  val fakeKeySentByJS = request.header("apikey")
                  val authHeader = request.header("Authorization")
                  if (authHeader != null && authHeader == "Bearer $fakeKeySentByJS") {
                      secureRequestBuilder.header("Authorization", "Bearer $apiKeyReal")
                  }
                  return@addInterceptor chain.proceed(secureRequestBuilder.build())
              }
            }
            return@addInterceptor chain.proceed(request)
          }
          .build()
      }
    })`;
            const insertionPoint = 'ApplicationLifecycleDispatcher.onApplicationCreate(this)';
            content = content.replace(insertionPoint, `${interceptorCode}\n\n    ${insertionPoint}`);
        }

        config.modResults.contents = content;
        return config;
    });

    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const packagePath = 'app/src/main/java/com/antihodio/agora';
            const targetDir = path.join(projectRoot, 'android', packagePath);
            const templateFile = path.join(projectRoot, 'plugins/android/AgoraKeyManager.kt.template');
            const targetFile = path.join(targetDir, 'AgoraKeyManager.kt');

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            if (fs.existsSync(templateFile)) {
                fs.copyFileSync(templateFile, targetFile);
            }

            return config;
        },
    ]);

    return config;
};

module.exports = withBunker;
