import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    useColorScheme,
    Alert,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createReport } from "@/Services/ReportService";
import { ReportContext } from "@/Types/Reports";

// ─── Motivos predefinidos ────────────────────────────────────────────────────
const POST_REASONS = [
    { label: "Es spam",                   icon: "alert-circle-outline"          },
    { label: "Desnudez o actividad sexual", icon: "eye-off-outline"             },
    { label: "Discurso de odio",           icon: "warning-outline"              },
    { label: "Violencia o contenido dañino", icon: "skull-outline"             },
    { label: "Acoso o intimidación",       icon: "person-remove-outline"        },
    { label: "Desinformación",             icon: "newspaper-outline"            },
    { label: "Venta de productos ilegales", icon: "cube-outline"               },
    { label: "Otro",                       icon: "ellipsis-horizontal-circle-outline" },
] as const;

const USER_REASONS = [
    { label: "Cuenta falsa o suplantación", icon: "person-outline"             },
    { label: "Acoso o intimidación",        icon: "person-remove-outline"       },
    { label: "Spam",                        icon: "alert-circle-outline"        },
    { label: "Contenido inapropiado",       icon: "eye-off-outline"            },
    { label: "Discurso de odio",            icon: "warning-outline"            },
    { label: "Venta de productos ilegales", icon: "cube-outline"               },
    { label: "Otro",                        icon: "ellipsis-horizontal-circle-outline" },
] as const;

type Step = "select" | "detail" | "done";

interface ReportModalProps {
    visible: boolean;
    context: ReportContext;
    targetId: string;
    onClose: () => void;
}

export default function ReportModal({ visible, context, targetId, onClose }: ReportModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [step, setStep] = useState<Step>("select");
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [detail, setDetail] = useState("");
    const [loading, setLoading] = useState(false);

    const reasons = context === "post" ? POST_REASONS : USER_REASONS;

    // ── Colores ──────────────────────────────────────────────────────────────
    const bg          = isDark ? "#111111" : "#ffffff";
    const surface     = isDark ? "#1c1c1e" : "#f2f2f7";
    const textColor   = isDark ? "#ffffff" : "#000000";
    const subColor    = isDark ? "#8e8e93" : "#6c6c70";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const accentRed   = "#ef4444";

    const handleClose = () => {
        setStep("select");
        setSelectedReason(null);
        setDetail("");
        onClose();
    };

    const handleSelectReason = (label: string) => {
        setSelectedReason(label);
        setStep("detail");
    };

    const handleBack = () => {
        setStep("select");
        setSelectedReason(null);
        setDetail("");
    };

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setLoading(true);
        try {
            await createReport(
                context === "post"
                    ? { context: "post", post_id: targetId, reason: selectedReason, description: detail.trim() }
                    : { context: "user", user_id: targetId, reason: selectedReason, description: detail.trim() }
            );
            setStep("done");
        } catch (err: any) {
            Alert.alert("No se pudo enviar", err.message || "Inténtalo de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    };

    // ── Cabecera con botón atrás/cerrar ──────────────────────────────────────
    const SheetHeader = ({ title, showBack = false }: { title: string; showBack?: boolean }) => (
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerSide}>
                {showBack && (
                    <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="chevron-back" size={24} color={textColor} />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
            <View style={styles.headerSide}>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={22} color={subColor} />
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Paso 1: Selección de motivo ──────────────────────────────────────────
    const StepSelect = () => (
        <>
            <SheetHeader title={context === "post" ? "Reportar publicación" : "Reportar usuario"} />
            <Text style={[styles.stepHint, { color: subColor }]}>
                ¿Por qué quieres enviar este reporte?
            </Text>
            {reasons.map((reason, i) => (
                <TouchableOpacity
                    key={reason.label}
                    activeOpacity={0.6}
                    style={[
                        styles.reasonRow,
                        { borderBottomColor: borderColor },
                        i === 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: borderColor },
                    ]}
                    onPress={() => handleSelectReason(reason.label)}
                >
                    <Ionicons name={reason.icon as any} size={22} color={subColor} style={styles.reasonIcon} />
                    <Text style={[styles.reasonLabel, { color: textColor }]}>{reason.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={subColor} />
                </TouchableOpacity>
            ))}
        </>
    );

    // ── Paso 2: Detalle adicional ────────────────────────────────────────────
    const StepDetail = () => (
        <>
            <SheetHeader title={selectedReason ?? ""} showBack />
            <Text style={[styles.stepHint, { color: subColor }]}>
                Añade información adicional para ayudarnos a entender mejor el problema (opcional).
            </Text>

            <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor }]}>
                <TextInput
                    style={[styles.input, { color: textColor }]}
                    placeholder="Describe el problema..."
                    placeholderTextColor={subColor}
                    multiline
                    maxLength={500}
                    value={detail}
                    onChangeText={setDetail}
                    autoFocus
                />
                <Text style={[styles.charCount, { color: subColor }]}>{detail.length}/500</Text>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: accentRed, opacity: loading ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.submitText}>Enviar reporte</Text>
                }
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: subColor }]}>
                Los reportes son anónimos. Nuestro equipo revisará tu reporte y tomará las medidas necesarias.
            </Text>
        </>
    );

    // ── Paso 3: Confirmación ─────────────────────────────────────────────────
    const StepDone = () => (
        <View style={styles.doneContainer}>
            <View style={[styles.doneIconBg, { backgroundColor: isDark ? "#1a2e1a" : "#dcfce7" }]}>
                <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
            </View>
            <Text style={[styles.doneTitle, { color: textColor }]}>Reporte enviado</Text>
            <Text style={[styles.doneSub, { color: subColor }]}>
                Gracias por ayudarnos a mantener Agora seguro. Revisaremos tu reporte lo antes posible.
            </Text>
            <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: surface }]}
                onPress={handleClose}
            >
                <Text style={[styles.doneBtnText, { color: textColor }]}>Cerrar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
                <View style={[styles.sheet, { backgroundColor: bg }]}>
                    <View style={[styles.handle, { backgroundColor: isDark ? "#444" : "#ddd" }]} />
                    {step === "select" && <StepSelect />}
                    {step === "detail" && <StepDetail />}
                    {step === "done"   && <StepDone />}
                </View>
            </View>
        </Modal>
    );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "flex-end",
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === "ios" ? 34 : 24,
        maxHeight: "90%",
        overflow: "hidden",
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 8,
        marginBottom: 2,
    },

    // ── Cabecera ──
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: {
        width: 36,
        alignItems: "center",
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "600",
    },

    // ── Hint ──
    stepHint: {
        fontSize: 13,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 8,
        lineHeight: 18,
    },

    // ── Motivos ──
    reasonRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    reasonIcon: {
        marginRight: 14,
    },
    reasonLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: "400",
    },

    // ── Input ──
    inputWrapper: {
        marginHorizontal: 20,
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        minHeight: 100,
    },
    input: {
        fontSize: 15,
        lineHeight: 22,
        textAlignVertical: "top",
        minHeight: 70,
    },
    charCount: {
        fontSize: 11,
        textAlign: "right",
        marginTop: 6,
    },

    // ── Submit ──
    submitBtn: {
        marginHorizontal: 20,
        marginTop: 18,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: "center",
    },
    submitText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    disclaimer: {
        fontSize: 12,
        textAlign: "center",
        paddingHorizontal: 30,
        marginTop: 14,
        lineHeight: 17,
    },

    // ── Done ──
    doneContainer: {
        alignItems: "center",
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 16,
        gap: 14,
    },
    doneIconBg: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: "center",
        justifyContent: "center",
    },
    doneTitle: {
        fontSize: 20,
        fontWeight: "700",
    },
    doneSub: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 21,
    },
    doneBtn: {
        paddingVertical: 13,
        paddingHorizontal: 52,
        borderRadius: 14,
        marginTop: 6,
    },
    doneBtnText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
