import { View, Text, useColorScheme, ScrollView, Linking, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// --- Sub-components ---

const SectionTitle = ({ number, title }: { number: string; title: string }) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <View className="flex-row items-center mt-6 mb-2">
            <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center mr-3">
                <Text className="text-white text-xs font-bold">{number}</Text>
            </View>
            <Text className={`text-sm font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </Text>
        </View>
    );
};

const Paragraph = ({ children }: { children: React.ReactNode }) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <Text className={`text-sm leading-6 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {children}
        </Text>
    );
};

const BulletItem = ({ bold, text }: { bold?: string; text: string }) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <View className="flex-row items-start mb-2 ml-1">
            <View className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 mr-3" />
            <Text className={`text-sm leading-6 flex-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {bold ? <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{bold} </Text> : null}
                {text}
            </Text>
        </View>
    );
};

const ShieldRow = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => {
    const isDark = useColorScheme() === 'dark';
    return (
        <View className={`flex-row items-start p-3 rounded-xl mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <Ionicons name={icon} size={18} color="#f97316" style={{ marginRight: 10, marginTop: 1 }} />
            <Text className={`text-sm leading-6 flex-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {text}
            </Text>
        </View>
    );
};

const Divider = () => {
    const isDark = useColorScheme() === 'dark';
    return <View className={`h-px my-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />;
};

// --- Main Screen ---

export default function PrivacyAndTerms() {
    const isDark = useColorScheme() === 'dark';

    return (
        <ScrollView
            className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'}`}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Intro banner */}
            <View className={`mx-4 mt-4 p-4 rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <View className="flex-row items-center mb-2">
                    <View className="w-9 h-9 rounded-full bg-orange-500 items-center justify-center mr-3">
                        <Ionicons name="shield-checkmark" size={19} color="#fff" />
                    </View>
                    <View className="flex-1">
                        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Política de Privacidad
                        </Text>
                        <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Última actualización: 23 de marzo de 2026
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    className="flex-row items-center mt-1"
                    onPress={() => Linking.openURL('mailto:gomezbenitezmiguelangel@gmail.com')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="mail-outline" size={14} color="#f97316" style={{ marginRight: 6 }} />
                    <Text className="text-orange-500 text-xs font-medium">
                        gomezbenitezmiguelangel@gmail.com
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Main content card */}
            <View className={`mx-4 mt-3 p-4 rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>

                {/* 1 */}
                <SectionTitle number="1" title="Nuestro compromiso con la privacidad y la seguridad" />
                <Paragraph>
                    En <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Agora</Text>, creemos que la libertad de expresión no está reñida con la privacidad.
                    Hemos diseñado nuestra plataforma con un principio claro:{" "}
                    <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>tus datos te pertenecen a ti, y solo a ti</Text>.
                    No almacenamos información personal que no sea estrictamente necesaria para el funcionamiento de la red social o para cumplir con la ley.
                    Toda la infraestructura de seguridad (AgoraShield) está construida para proteger tus comunicaciones, no para exponerlas.
                </Paragraph>

                <Divider />

                {/* 2 */}
                <SectionTitle number="2" title="Información que recopilamos" />
                <Paragraph>
                    A diferencia de otras redes sociales,{" "}
                    <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        no recopilamos nombres, correos electrónicos, números de teléfono ni datos de navegación con fines comerciales
                    </Text>. La información que procesamos es únicamente técnica y funcional:
                </Paragraph>
                <BulletItem
                    bold="Identificadores técnicos del dispositivo:"
                    text="Datos no nominales utilizados exclusivamente por Google Play Integrity (Android) y App Attest (iOS) para verificar que el dispositivo no está comprometido (root, jailbreak, emulador)."
                />
                <BulletItem
                    bold="Estado de integridad del sistema:"
                    text="Información sobre si el entorno de ejecución es seguro para inyectar las claves criptográficas que permiten el acceso a la plataforma."
                />
                <BulletItem
                    bold="Datos de registro (logs) técnicos:"
                    text="Direcciones IP, marcas de tiempo y tipo de dispositivo, conservados el tiempo estrictamente necesario para mantener la seguridad e impedir abusos."
                />
                <BulletItem
                    bold="Verificación de edad:"
                    text="La imagen del DNI se borra inmediatamente después de extraer la fecha de nacimiento. Solo se almacena el resultado (mayor/menor de edad) y la fecha de verificación."
                />
                <BulletItem
                    bold="Moderación de contenidos:"
                    text="La IA detecta discursos de odio real (amenazas, incitación a la violencia, acoso) en el momento de publicación. No se usa para censurar opiniones políticas ni para ningún otro fin."
                />

                <Divider />

                {/* 3 */}
                <SectionTitle number="3" title="Cómo protegemos tus datos: el sistema AgoraShield" />
                <Paragraph>
                    La seguridad de Agora no es un añadido, es la base de la plataforma.
                    <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>AgoraShield</Text> es nuestro sistema de protección interno, diseñado para garantizar que ni nosotros ni ningún tercero pueda comprometer tus credenciales o datos de acceso:
                </Paragraph>
                <ShieldRow
                    icon="lock-closed-outline"
                    text="Las credenciales de acceso nunca se almacenan en la aplicación. Solo se hacen disponibles bajo demanda, tras verificar que el dispositivo y la app son genuinos y no han sido manipulados."
                />
                <ShieldRow
                    icon="eye-off-outline"
                    text="Las credenciales se usan únicamente el tiempo necesario para completar la operación solicitada. Una vez hecho, se eliminan de la memoria activa. No hay persistencia innecesaria."
                />
                <ShieldRow
                    icon="hardware-chip-outline"
                    text="El material criptográfico reside en el hardware de seguridad del propio dispositivo. Ni el desarrollador, ni el sistema operativo, ni ninguna app externa puede extraerlo."
                />
                <ShieldRow
                    icon="shield-outline"
                    text="Todas las comunicaciones con nuestros servidores están blindadas. Cualquier intento de interceptar o suplantar la conexión es detectado y bloqueado automáticamente."
                />
                <ShieldRow
                    icon="checkmark-circle-outline"
                    text="La aplicación se autocomprueba continuamente. Si alguien intenta modificarla o manipular su entorno de ejecución, los servidores detectan la anomalía y deniegan el acceso."
                />
                <Paragraph>
                    Este nivel de protección es equivalente al que usan las aplicaciones de banca móvil y mensajería cifrada.
                    Lo hemos aplicado a Agora porque creemos que la libertad de expresión merece exactamente la misma protección que tus finanzas.
                </Paragraph>

                <Divider />

                {/* 4 */}
                <SectionTitle number="4" title="Servicios de terceros" />
                <BulletItem
                    bold="Google Play Integrity / Apple App Attest:"
                    text="Verifican que el dispositivo no está rooteado, no es un emulador y que la aplicación es original."
                />
                <BulletItem
                    bold="Supabase:"
                    text="Es nuestra base de datos y backend. Todas las peticiones se realizan con claves que residen en el TEE del dispositivo y nunca se transmiten en claro."
                />
                <BulletItem
                    bold="Gemini API (Google):"
                    text="Se utiliza exclusivamente para la verificación de edad mediante lectura de DNI. La imagen se procesa en tiempo real y se elimina inmediatamente."
                />
                <Paragraph>
                    Estos servicios pueden recopilar información según sus propias políticas de privacidad,
                    pero nosotros <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>no compartimos ni vendemos tus datos a terceros</Text>.
                </Paragraph>

                <Divider />

                {/* 5 */}
                <SectionTitle number="5" title="Cooperación con las autoridades" />
                <Paragraph>
                    En Agora cumplimos escrupulosamente con la legislación española y europea. Si recibimos un{" "}
                    <Text className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>requerimiento judicial firme</Text>{" "}
                    en el marco de una investigación por un presunto delito:
                </Paragraph>
                <BulletItem
                    bold="Colaboraremos plenamente,"
                    text="entregando toda la información técnica que obre en nuestro poder: logs de acceso, metadatos, publicaciones del usuario afectado y cualquier otro dato requerido."
                />
                <BulletItem
                    bold="No podemos entregar aquello que técnicamente no tenemos:"
                    text="las imágenes de los DNI (se borran inmediatamente), las claves privadas de los usuarios (residen en el hardware de sus dispositivos), ni el código fuente de la aplicación (protegido por propiedad intelectual)."
                />
                <View className={`border-l-4 border-orange-500 rounded-r-xl p-3 my-3 ${isDark ? 'bg-gray-800' : 'bg-orange-50'}`}>
                    <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                        Nota técnica
                    </Text>
                    <Text className={`text-xs leading-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Debido al diseño de cifrado y al almacenamiento de llaves en el hardware TEE/Secure Enclave del dispositivo, el desarrollador no tiene capacidad técnica para acceder al contenido cifrado por el usuario, limitándose la información disponible únicamente a datos técnicos de conexión y contenido público.
                    </Text>
                </View>

                <Divider />

                {/* 6 */}
                <SectionTitle number="6" title="Tus derechos (RGPD)" />
                <Paragraph>
                    Como usuario de Agora, tienes los siguientes derechos reconocidos por el Reglamento General de Protección de Datos:
                </Paragraph>
                <BulletItem bold="Acceso:" text="Puedes solicitar una copia de los datos que tenemos sobre ti (publicaciones y metadatos técnicos)." />
                <BulletItem bold="Rectificación:" text="Puedes corregir cualquier error en tus datos." />
                <BulletItem bold="Supresión:" text="Puedes solicitar la eliminación de tu cuenta y de todos tus datos." />
                <BulletItem bold="Oposición:" text="Puedes oponerte al tratamiento de tus datos para fines específicos." />
                <BulletItem bold="Portabilidad:" text="Puedes solicitar que tus datos sean transferidos a otro servicio." />
                <Paragraph>
                    Para ejercer estos derechos, escríbenos a{" "}
                    <Text
                        className="text-orange-500 font-medium"
                        onPress={() => Linking.openURL('mailto:gomezbenitezmiguelangel@gmail.com')}
                    >
                        gomezbenitezmiguelangel@gmail.com
                    </Text>{" "}
                    con el asunto "Protección de Datos".
                </Paragraph>

                <Divider />

                {/* 7 */}
                <SectionTitle number="7" title="Cambios en esta política" />
                <Paragraph>
                    Cualquier modificación a esta política será publicada en nuestra web y notificada a los usuarios a través de la propia aplicación. La fecha de la última actualización aparece al inicio de este documento.
                </Paragraph>

                <Divider />

                {/* 8 */}
                <SectionTitle number="8" title="Contacto" />
                <Paragraph>
                    Si tienes cualquier duda sobre esta política, sobre la seguridad de Agora o sobre cómo tratamos tus datos, no dudes en escribirnos:
                </Paragraph>
                <TouchableOpacity
                    className={`flex-row items-center justify-center border border-orange-500 rounded-xl py-3 mt-2 ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}
                    onPress={() => Linking.openURL('mailto:gomezbenitezmiguelangel@gmail.com')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="mail" size={16} color="#f97316" style={{ marginRight: 8 }} />
                    <Text className="text-orange-500 font-semibold text-sm">
                        gomezbenitezmiguelangel@gmail.com
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="mx-4 mt-4 items-center">
                <Text className={`text-xs text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    © 2026 Agora · La plaza pública digital
                </Text>
            </View>
        </ScrollView>
    );
}