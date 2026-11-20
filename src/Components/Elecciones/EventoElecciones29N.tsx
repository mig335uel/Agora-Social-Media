import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HemicycleSvg, { HemicycleSlice } from './HemicycleSvg';
import {
  AmbitoTerritorial,
  Camara,
  DatosAvance,
  EMPTY_DATASET,
  ParsedGeneralesDataset,
  PartidoData,
  RegionData,
  VistaEvento,
} from '@/Types/Elecciones';
import {
  fetchGeneralesLiveBundle,
  formatNumeroEs,
  getColorGanador,
} from '@/Services/EleccionesService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 72, 340);

interface EventoElecciones29NProps {
  externalSearchQuery?: string;
  onSelectHashtag?: (tag: string) => void;
  refreshTrigger?: number;
}

export default function EventoElecciones29N({
  externalSearchQuery = '',
  onSelectHashtag,
  refreshTrigger = 0,
}: EventoElecciones29NProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [camara, setCamara] = useState<Camara>('congreso');
  const [vista, setVista] = useState<VistaEvento>('escrutinio');
  const [ambito, setAmbito] = useState<AmbitoTerritorial>('provincias');
  const [selectedKey, setSelectedKey] = useState<string>('TO');
  const [territoryFilter, setTerritoryFilter] = useState<string>('');
  const [pactometro, setPactometro] = useState<string[]>([]);
  const [showAllParties, setShowAllParties] = useState<boolean>(false);
  const [hubExpanded, setHubExpanded] = useState<boolean>(true);

  const [envio, setEnvio] = useState<string>('001');
  const [data, setData] = useState<ParsedGeneralesDataset>(EMPTY_DATASET);
  const [oldData, setOldData] = useState<ParsedGeneralesDataset>(EMPTY_DATASET);
  const [avances, setAvances] = useState<DatosAvance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadElectionData = useCallback(async (activeCamara: Camara) => {
    try {
      const bundle = await fetchGeneralesLiveBundle(activeCamara);
      setEnvio(bundle.envio);
      setData(bundle.data);
      setOldData(bundle.oldData);
      if (bundle.avances.length > 0) {
        setAvances(bundle.avances);
      }
    } catch (err) {
      console.error('Error cargando Evento Elecciones 29N:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedKey('TO');
    setPactometro([]);
    setShowAllParties(false);
    loadElectionData(camara);

    const interval = setInterval(() => {
      loadElectionData(camara);
    }, 60000);

    return () => clearInterval(interval);
  }, [camara, loadElectionData]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadElectionData(camara);
    }
  }, [refreshTrigger, camara, loadElectionData]);

  const activeRegion: RegionData | null = useMemo(() => {
    if (selectedKey === 'TO') return data.espana;
    return (
      data.comunidades.find((c) => c.key === selectedKey)?.region ||
      data.provincias.find((p) => p.key === selectedKey)?.region ||
      data.espana
    );
  }, [data, selectedKey]);

  const activeOldRegion: RegionData | null = useMemo(() => {
    if (selectedKey === 'TO') return oldData.espana;
    return (
      oldData.comunidades.find((c) => c.key === selectedKey)?.region ||
      oldData.provincias.find((p) => p.key === selectedKey)?.region ||
      null
    );
  }, [oldData, selectedKey]);

  const labelEscanos = camara === 'senado' ? 'Senadores' : 'Escaños';
  const labelUnidadLower = camara === 'senado' ? 'senadores' : 'escaños';

  // Datos para el Hemiciclo (anillo exterior 2026 + interior 2023 ordenados por ideología)
  const hemicycleData = useMemo(() => {
    if (!activeRegion) {
      return {
        outerSlices: [] as HemicycleSlice[],
        innerSlices: [] as HemicycleSlice[],
        escanosAsignados: 0,
        hasOldSeats: false,
      };
    }

    const unifiedMap = new Map<string, PartidoData>();
    [...(activeRegion.partidos || []), ...(activeOldRegion?.partidos || [])].forEach(
      (p) => {
        if (p.escanos > 0 && !unifiedMap.has(p.siglas)) {
          unifiedMap.set(p.siglas, p);
        }
      }
    );

    const unifiedParties = Array.from(unifiedMap.values()).sort(
      (a, b) => a.ideologia - b.ideologia
    );

    const outerSlices: HemicycleSlice[] = unifiedParties.map((u) => {
      const match = activeRegion.partidos.find((p) => p.siglas === u.siglas);
      return {
        label: u.siglas,
        value: match ? match.escanos : 0,
        color: u.color,
        showLabel: true,
      };
    });

    const hasOldSeats = Boolean(
      activeOldRegion?.partidos?.some((p) => p.escanos > 0)
    );

    const innerSlices: HemicycleSlice[] = hasOldSeats
      ? unifiedParties.map((u) => {
          const match = activeOldRegion?.partidos?.find(
            (p) => p.siglas === u.siglas
          );
          return {
            label: u.siglas,
            value: match ? match.escanos : 0,
            color: u.color,
            showLabel: false,
          };
        })
      : [];

    const escanosAsignados = activeRegion.partidos.reduce(
      (acc, p) => acc + p.escanos,
      0
    );

    return { outerSlices, innerSlices, escanosAsignados, hasOldSeats };
  }, [activeRegion, activeOldRegion]);

  // Datos para el Pactómetro
  const pactoStats = useMemo(() => {
    if (!activeRegion) return null;
    const partidosConEscano = activeRegion.partidos.filter((p) => p.escanos > 0);
    const selectedParties = partidosConEscano
      .filter((p) => pactometro.includes(p.siglas))
      .sort((a, b) => b.escanos - a.escanos);

    const totalEscanos =
      activeRegion.total_dip > 0
        ? activeRegion.total_dip
        : partidosConEscano.reduce((acc, p) => acc + p.escanos, 0);

    const escanosPacto = selectedParties.reduce((acc, p) => acc + p.escanos, 0);
    const votosPacto = selectedParties.reduce((acc, p) => acc + p.votos, 0);
    const restantes = Math.max(0, totalEscanos - escanosPacto);
    const alcanzaMayoria = escanosPacto >= activeRegion.mayoria;

    const slices: HemicycleSlice[] = [
      ...selectedParties.map((p) => ({
        label: p.siglas,
        value: p.escanos,
        color: p.color,
        showLabel: true,
      })),
      ...(restantes > 0
        ? [
            {
              label: 'Resto',
              value: restantes,
              color: isDark ? '#1e293b' : '#e2e8f0',
              showLabel: false,
            },
          ]
        : []),
    ];

    return {
      partidosConEscano,
      totalEscanos,
      escanosPacto,
      votosPacto,
      alcanzaMayoria,
      slices,
    };
  }, [activeRegion, pactometro, isDark]);

  const togglePacto = (siglas: string) => {
    setPactometro((prev) =>
      prev.includes(siglas) ? prev.filter((s) => s !== siglas) : [...prev, siglas]
    );
  };

  const handleSelectTerritory = (key: string) => {
    setSelectedKey(key);
    setPactometro([]);
    setShowAllParties(false);
    setVista('escrutinio');
  };

  const filteredTerritories = useMemo(() => {
    const list = ambito === 'comunidades' ? data.comunidades : data.provincias;
    const q = (territoryFilter || externalSearchQuery).trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.region.nombre.toLowerCase().includes(q));
  }, [ambito, data.comunidades, data.provincias, territoryFilter, externalSearchQuery]);

  const ultimoAvance = avances.length > 0 ? avances[avances.length - 1] : null;
  const ganadorActual = activeRegion?.partidos?.[0] || null;

  const eventHashtags = ['Elecciones29N', '29N', 'Congreso', 'Senado', 'Pactómetro'];

  return (
    <View className="mb-8">
      {/* ETIQUETA DE SECCIÓN ESTILO AGORA */}
      <View className="flex-row items-center justify-between mb-3 ml-1">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
          <Text className="text-xs font-black uppercase tracking-wider text-gray-500">
            Evento Extraordinario • 29N
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setHubExpanded((prev) => !prev)}
          className="flex-row items-center bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full"
        >
          <Text className="text-[11px] font-bold text-blue-500 mr-1">
            {hubExpanded ? 'Modo compacto' : 'Abrir centro 29N'}
          </Text>
          <Ionicons
            name={hubExpanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color="#3b82f6"
          />
        </TouchableOpacity>
      </View>

      {/* HERO CARD PRINCIPAL (DISEÑO AGORA ROUNDED-[32PX] + LINEAR GRADIENT) */}
      <View className="overflow-hidden rounded-[32px] shadow-xl border border-gray-200 dark:border-white/10">
        <LinearGradient
          colors={isDark ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Marca de agua decorativa de Agora */}
          <View className="absolute right-[-18] top-[-18] opacity-10" pointerEvents="none">
            <Ionicons
              name="podium-outline"
              size={140}
              color={isDark ? '#fff' : '#000'}
            />
          </View>

          <View className="p-6">
            {/* Badges superiores + Selector de Cámara */}
            <View className="flex-row flex-wrap items-center justify-between gap-2 mb-3">
              <View className="flex-row items-center">
                <View className="bg-blue-500 px-3 py-1 rounded-full mr-2 flex-row items-center">
                  <Ionicons name="flash" size={11} color="#fff" />
                  <Text className="text-[10px] font-black text-white uppercase italic ml-1">
                    Especial Elecciones
                  </Text>
                </View>
                <View className="bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-full flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                  <Text className="text-[10px] font-black text-red-500 uppercase">
                    En Vivo
                  </Text>
                </View>
              </View>

              {/* Selector de Cámara (Píldoras Agora) */}
              <View className="flex-row bg-black/5 dark:bg-white/10 p-1 rounded-full">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCamara('congreso')}
                  className={`px-3 py-1 rounded-full ${
                    camara === 'congreso' ? 'bg-blue-500' : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-black uppercase ${
                      camara === 'congreso'
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Congreso
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCamara('senado')}
                  className={`px-3 py-1 rounded-full ${
                    camara === 'senado' ? 'bg-blue-500' : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-black uppercase ${
                      camara === 'senado'
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Senado
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Título y territorio activo */}
            <View className="flex-row items-end justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-2xl font-black text-black dark:text-white leading-7">
                  Elecciones Generales 29N
                </Text>
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">
                  {activeRegion ? activeRegion.nombre : 'España'} •{' '}
                  {camara === 'congreso' ? '350 Diputados' : '208 Senadores'} • Envío #
                  {envio}
                </Text>
              </View>

              {selectedKey !== 'TO' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectTerritory('TO')}
                  className="bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 rounded-full flex-row items-center"
                >
                  <Ionicons name="globe-outline" size={13} color="#3b82f6" />
                  <Text className="text-[11px] font-black text-blue-500 ml-1">
                    Total España
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* KPIs rápidos estilo "Impacto" de Agora */}
            <View className="flex-row justify-between mt-5 pt-4 border-t border-black/5 dark:border-white/10">
              <View>
                <Text className="text-lg font-black text-blue-500 leading-5">
                  {activeRegion?.escrutado || '0,00%'}
                </Text>
                <Text className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                  Escrutado
                </Text>
              </View>

              <View className="items-center">
                <Text className="text-lg font-black text-black dark:text-white leading-5">
                  {activeRegion?.mayoria || (camara === 'congreso' ? 176 : 105)}
                </Text>
                <Text className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                  Mayoría Abs.
                </Text>
              </View>

              <View className="items-center">
                <Text className="text-lg font-black text-black dark:text-white leading-5">
                  {ultimoAvance ? `${ultimoAvance.porcentaje}%` : '--'}
                </Text>
                <Text className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                  {ultimoAvance ? `Avance ${ultimoAvance.hora}h` : 'Participación'}
                </Text>
              </View>

              <View className="items-end">
                <View className="flex-row items-center">
                  {ganadorActual && (
                    <View
                      style={{ backgroundColor: ganadorActual.color }}
                      className="w-2.5 h-2.5 rounded-full mr-1.5"
                    />
                  )}
                  <Text
                    className="text-lg font-black text-black dark:text-white leading-5"
                    numberOfLines={1}
                  >
                    {ganadorActual ? ganadorActual.siglas : '--'}
                  </Text>
                </View>
                <Text className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                  1ª Fuerza
                </Text>
              </View>
            </View>

            {/* Hashtags de tendencia del evento */}
            <View className="flex-row flex-wrap mt-4 -mb-1.5">
              {eventHashtags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => onSelectHashtag?.(tag)}
                  className="bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-full mr-2 mb-1.5"
                >
                  <Text className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* CONTENIDO EXPANDIBLE DEL CENTRO ELECTORAL AGORA */}
      {hubExpanded && (
        <View className="mt-3.5">
          {/* Sub-navegación por píldoras (Hemiciclo | Pactómetro | Territorios | Avances) */}
          <View className="flex-row justify-between bg-gray-100 dark:bg-white/5 p-1.5 rounded-[20px] mb-3.5 border border-gray-200 dark:border-white/10">
            {(
              [
                { id: 'escrutinio', label: 'Hemiciclo', icon: 'pie-chart-outline' },
                { id: 'pactometro', label: 'Pactómetro', icon: 'git-merge-outline' },
                { id: 'territorios', label: 'Territorios', icon: 'location-outline' },
                { id: 'participacion', label: 'Avances', icon: 'pulse-outline' },
              ] as { id: VistaEvento; label: string; icon: any }[]
            ).map((tab) => {
              const active = vista === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => setVista(tab.id)}
                  className={`flex-1 flex-row items-center justify-center py-2 px-2 rounded-[15px] ${
                    active ? 'bg-blue-500' : ''
                  }`}
                >
                  <Ionicons
                    name={tab.icon}
                    size={13}
                    color={active ? '#fff' : isDark ? '#9ca3af' : '#4b5563'}
                  />
                  <Text
                    className={`text-[11px] font-black ml-1 ${
                      active ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    }`}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading && !activeRegion ? (
            <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10 p-8 items-center">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-3">
                Sincronizando escrutinio en directo...
              </Text>
            </View>
          ) : !activeRegion ? (
            <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10 p-6 items-center">
              <Ionicons
                name="time-outline"
                size={36}
                color={isDark ? '#475569' : '#94a3b8'}
              />
              <Text className="text-base font-black text-black dark:text-white mt-2">
                Esperando apertura de urnas
              </Text>
              <Text className="text-xs font-medium text-gray-500 text-center mt-1">
                El escrutinio oficial de las Elecciones Generales 29N comenzará a las
                20:00h.
              </Text>
            </View>
          ) : (
            <>
              {/* ── VISTA 1: HEMICICLO Y PARTIDOS ── */}
              {vista === 'escrutinio' && (
                <View>
                  {/* Tarjeta del Hemiciclo */}
                  <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10 mb-3.5">
                    <BlurView
                      intensity={isDark ? 15 : 0}
                      tint={isDark ? 'dark' : 'light'}
                    >
                      <View className="p-5 items-center">
                        <View className="w-full flex-row items-center justify-between mb-2">
                          <Text className="text-xs font-black uppercase tracking-wider text-gray-400">
                            Arco Parlamentario • {activeRegion.nombre}
                          </Text>
                          {hemicycleData.hasOldSeats && (
                            <Text className="text-[10px] font-bold text-gray-400 uppercase">
                              Ext: 2026 • Int: 2023
                            </Text>
                          )}
                        </View>

                        {hemicycleData.outerSlices.length > 0 ? (
                          <View className="items-center justify-center">
                            <HemicycleSvg
                              outerSlices={hemicycleData.outerSlices}
                              innerSlices={hemicycleData.innerSlices}
                              width={CHART_WIDTH}
                              height={175}
                              isDark={isDark}
                            />
                            <View
                              style={{ position: 'absolute', bottom: 8 }}
                              className="items-center"
                            >
                              <Text className="text-2xl font-black text-black dark:text-white leading-6">
                                {hemicycleData.escanosAsignados}
                              </Text>
                              <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                de {activeRegion.total_dip} {labelUnidadLower}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View className="py-10 items-center">
                            <Text className="text-xs font-bold text-gray-400 uppercase">
                              Sin {labelUnidadLower} asignados todavía
                            </Text>
                          </View>
                        )}
                      </View>
                    </BlurView>
                  </View>

                  {/* Lista de Partidos estilo tarjetas de Tendencias Agora */}
                  {(showAllParties
                    ? activeRegion.partidos
                    : activeRegion.partidos.slice(0, 6)
                  ).map((p, index) => {
                    const oldMatch = activeOldRegion?.partidos?.find(
                      (o) => o.siglas === p.siglas
                    );
                    const oldEsc = oldMatch ? oldMatch.escanos : 0;
                    const dif = p.escanos - oldEsc;
                    const hasVotos = activeRegion.partidos.some((x) => x.votos > 0);
                    const pctWidth = hasVotos
                      ? Math.min(100, p.porcentaje)
                      : activeRegion.total_dip > 0
                      ? Math.min(100, (p.escanos / activeRegion.total_dip) * 100)
                      : 0;

                    return (
                      <TouchableOpacity
                        key={p.siglas}
                        activeOpacity={0.8}
                        onPress={() => togglePacto(p.siglas)}
                        className="mb-2.5 rounded-[22px] overflow-hidden border border-gray-200 dark:border-white/10"
                      >
                        <BlurView
                          intensity={isDark ? 15 : 0}
                          tint={isDark ? 'dark' : 'light'}
                        >
                          <View className="p-4">
                            <View className="flex-row justify-between items-center">
                              <View className="flex-row items-center flex-1 pr-3">
                                <View
                                  style={{ backgroundColor: p.color }}
                                  className="w-3.5 h-3.5 rounded-full mr-3"
                                />
                                <View className="flex-1">
                                  <View className="flex-row items-center flex-wrap">
                                    <Text className="text-base font-black text-black dark:text-white mr-2">
                                      {p.siglas}
                                    </Text>
                                    <View
                                      className={`px-2 py-0.5 rounded-full ${
                                        dif > 0
                                          ? 'bg-emerald-500/15'
                                          : dif < 0
                                          ? 'bg-red-500/15'
                                          : 'bg-gray-500/10'
                                      }`}
                                    >
                                      <Text
                                        className={`text-[10px] font-black ${
                                          dif > 0
                                            ? 'text-emerald-500'
                                            : dif < 0
                                            ? 'text-red-500'
                                            : 'text-gray-400'
                                        }`}
                                      >
                                        {dif > 0 ? `+${dif}` : dif === 0 ? '= 2023' : dif}
                                      </Text>
                                    </View>
                                  </View>

                                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                    #{index + 1} Fuerza
                                    {hasVotos
                                      ? ` • ${formatNumeroEs(p.votos)} votos • ${p.porc}`
                                      : ''}{' '}
                                    • 2023: {oldEsc}
                                  </Text>
                                </View>
                              </View>

                              {/* Contador de escaños estilo "Impacto" de Agora */}
                              <View className="items-end pl-2">
                                <Text className="text-xl font-black text-blue-500 leading-6">
                                  {p.escanos}
                                </Text>
                                <Text className="text-[9px] font-bold text-gray-500 uppercase">
                                  {labelEscanos}
                                </Text>
                              </View>
                            </View>

                            {/* Barra de progreso del partido */}
                            <View className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mt-3">
                              <View
                                style={{
                                  width: `${pctWidth}%`,
                                  backgroundColor: p.color,
                                }}
                                className="h-full rounded-full"
                              />
                            </View>
                          </View>
                        </BlurView>
                      </TouchableOpacity>
                    );
                  })}

                  {activeRegion.partidos.length > 6 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowAllParties((prev) => !prev)}
                      className="py-3 rounded-[20px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 items-center mt-1"
                    >
                      <Text className="text-xs font-black text-blue-500 uppercase tracking-wider">
                        {showAllParties
                          ? 'Mostrar solo principales fuerzas'
                          : `Ver las ${activeRegion.partidos.length} candidaturas`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ── VISTA 2: PACTÓMETRO DE MAYORÍAS ── */}
              {vista === 'pactometro' && pactoStats && (
                <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10">
                  <BlurView
                    intensity={isDark ? 15 : 0}
                    tint={isDark ? 'dark' : 'light'}
                  >
                    <View className="p-5">
                      <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1 pr-3">
                          <Text className="text-lg font-black text-black dark:text-white leading-6">
                            Laboratorio de Pactos • {activeRegion.nombre}
                          </Text>
                          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            Mayoría absoluta en {activeRegion.mayoria} {labelUnidadLower}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text
                            className={`text-2xl font-black leading-6 ${
                              pactoStats.alcanzaMayoria
                                ? 'text-emerald-500'
                                : 'text-blue-500'
                            }`}
                          >
                            {pactoStats.escanosPacto}
                            <Text className="text-sm text-gray-400">
                              /{activeRegion.mayoria}
                            </Text>
                          </Text>
                          <Text className="text-[9px] font-bold text-gray-500 uppercase">
                            Suma actual
                          </Text>
                        </View>
                      </View>

                      {/* Semicírculo con línea del 50% */}
                      <View className="items-center my-2">
                        <View
                          className={`px-3 py-1 rounded-full border mb-1 ${
                            pactoStats.alcanzaMayoria
                              ? 'bg-emerald-500/15 border-emerald-500/40'
                              : 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-black uppercase ${
                              pactoStats.alcanzaMayoria
                                ? 'text-emerald-500'
                                : 'text-gray-500 dark:text-gray-300'
                            }`}
                          >
                            Mayoría: {activeRegion.mayoria}
                          </Text>
                        </View>

                        <View className="items-center justify-center">
                          <HemicycleSvg
                            outerSlices={pactoStats.slices}
                            width={CHART_WIDTH}
                            height={170}
                            isDark={isDark}
                            showMajorityLine={true}
                            majorityReached={pactoStats.alcanzaMayoria}
                          />

                          <View
                            style={{ position: 'absolute', bottom: 6 }}
                            className="items-center"
                          >
                            <Text
                              className={`text-2xl font-black leading-6 ${
                                pactoStats.alcanzaMayoria
                                  ? 'text-emerald-500'
                                  : pactoStats.escanosPacto > 0
                                  ? 'text-blue-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {pactoStats.escanosPacto}
                              <Text className="text-xs text-gray-400">
                                /{pactoStats.totalEscanos}
                              </Text>
                            </Text>
                            <Text className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                              {pactoStats.alcanzaMayoria
                                ? `¡Mayoría absoluta! (+${
                                    pactoStats.escanosPacto - activeRegion.mayoria
                                  })`
                                : pactoStats.escanosPacto > 0
                                ? `Faltan ${
                                    activeRegion.mayoria - pactoStats.escanosPacto
                                  } ${labelUnidadLower}`
                                : 'Toca partidos para sumar'}
                            </Text>
                          </View>
                        </View>

                        {pactoStats.votosPacto > 0 && (
                          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {formatNumeroEs(pactoStats.votosPacto)} votos representados
                          </Text>
                        )}
                      </View>

                      {/* Píldoras interactivas de partidos */}
                      <View className="flex-row flex-wrap mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                        {pactoStats.partidosConEscano.map((p) => {
                          const active = pactometro.includes(p.siglas);
                          return (
                            <TouchableOpacity
                              key={p.siglas}
                              activeOpacity={0.75}
                              onPress={() => togglePacto(p.siglas)}
                              style={
                                active
                                  ? {
                                      backgroundColor: p.color,
                                      borderColor: p.color,
                                    }
                                  : undefined
                              }
                              className={`flex-row items-center px-3.5 py-2 rounded-full mr-2 mb-2 border ${
                                active
                                  ? ''
                                  : 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10'
                              }`}
                            >
                              <View
                                style={{
                                  backgroundColor: active ? '#ffffff' : p.color,
                                }}
                                className="w-2 h-2 rounded-full mr-1.5"
                              />
                              <Text
                                className={`text-xs font-black ${
                                  active
                                    ? 'text-white'
                                    : 'text-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {p.siglas} ({p.escanos})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        {pactometro.length > 0 && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => setPactometro([])}
                            className="flex-row items-center px-3.5 py-2 rounded-full mb-2 bg-red-500/15 border border-red-500/30"
                          >
                            <Ionicons name="refresh" size={12} color="#ef4444" />
                            <Text className="text-xs font-black text-red-500 ml-1">
                              Reiniciar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </BlurView>
                </View>
              )}

              {/* ── VISTA 3: DESGLOSE TERRITORIAL (BENTO GRID ESTILO AGORA) ── */}
              {vista === 'territorios' && (
                <View>
                  {/* Controles de ámbito + buscador territorial */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row bg-gray-100 dark:bg-white/10 p-1 rounded-full">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setAmbito('provincias')}
                        className={`px-3.5 py-1.5 rounded-full ${
                          ambito === 'provincias' ? 'bg-blue-500' : ''
                        }`}
                      >
                        <Text
                          className={`text-xs font-black ${
                            ambito === 'provincias'
                              ? 'text-white'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {camara === 'senado' ? 'Circunscripciones' : 'Provincias'} (
                          {data.provincias.length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setAmbito('comunidades')}
                        className={`px-3.5 py-1.5 rounded-full ${
                          ambito === 'comunidades' ? 'bg-blue-500' : ''
                        }`}
                      >
                        <Text
                          className={`text-xs font-black ${
                            ambito === 'comunidades'
                              ? 'text-white'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          CC.AA. ({data.comunidades.length})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Buscador rápido de territorio */}
                  <View className="flex-row items-center bg-gray-100 dark:bg-white/10 rounded-full px-4 py-2 mb-3.5 border border-gray-200 dark:border-white/10">
                    <Ionicons
                      name="search-outline"
                      size={16}
                      color={isDark ? '#9ca3af' : '#6b7280'}
                    />
                    <TextInput
                      value={territoryFilter}
                      onChangeText={setTerritoryFilter}
                      placeholder="Filtrar provincia o comunidad..."
                      placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                      className="flex-1 ml-2 text-xs font-bold text-black dark:text-white py-0.5"
                    />
                    {territoryFilter.length > 0 && (
                      <TouchableOpacity onPress={() => setTerritoryFilter('')}>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={isDark ? '#9ca3af' : '#6b7280'}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Bento Grid 2 columnas estilo categorías de Agora */}
                  <View className="flex-row flex-wrap justify-between">
                    {filteredTerritories.map((item) => {
                      const winColor = getColorGanador(item.region, data.espana);
                      const isSelected = selectedKey === item.key;

                      return (
                        <TouchableOpacity
                          key={item.key}
                          activeOpacity={0.8}
                          onPress={() => handleSelectTerritory(item.key)}
                          style={{ width: BENTO_CARD_WIDTH }}
                          className={`mb-3 rounded-[24px] overflow-hidden border ${
                            isSelected
                              ? 'border-blue-500'
                              : 'border-gray-200 dark:border-white/10'
                          }`}
                        >
                          <BlurView
                            intensity={isDark ? 15 : 0}
                            tint={isDark ? 'dark' : 'light'}
                          >
                            <View className="p-4">
                              <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center flex-1 pr-1">
                                  <View
                                    style={{ backgroundColor: winColor }}
                                    className="w-2.5 h-2.5 rounded-full mr-2"
                                  />
                                  <Text
                                    className="text-sm font-black text-black dark:text-white flex-1"
                                    numberOfLines={1}
                                  >
                                    {item.region.nombre}
                                  </Text>
                                </View>
                              </View>

                              <Text className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
                                {item.region.escrutado} escrutado
                              </Text>

                              {item.region.partidos.slice(0, 3).map((p) => (
                                <View
                                  key={p.siglas}
                                  className="flex-row items-center justify-between py-0.5"
                                >
                                  <View className="flex-row items-center flex-1 pr-1">
                                    <View
                                      style={{ backgroundColor: p.color }}
                                      className="w-1.5 h-1.5 rounded-full mr-1.5"
                                    />
                                    <Text
                                      className="text-[11px] font-bold text-gray-600 dark:text-gray-300 flex-1"
                                      numberOfLines={1}
                                    >
                                      {p.siglas}
                                    </Text>
                                  </View>
                                  <Text className="text-[11px] font-black text-black dark:text-white">
                                    {p.escanos}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </BlurView>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ── VISTA 4: AVANCES DE PARTICIPACIÓN (14:00H Y 18:00H) ── */}
              {vista === 'participacion' && (
                <View>
                  {avances.length === 0 ? (
                    <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10 p-6 items-center">
                      <Ionicons
                        name="stats-chart-outline"
                        size={32}
                        color={isDark ? '#475569' : '#94a3b8'}
                      />
                      <Text className="text-sm font-black text-black dark:text-white mt-2">
                        Avances de participación pendientes
                      </Text>
                      <Text className="text-xs font-medium text-gray-500 text-center mt-1">
                        Los cortes oficiales se publican a las 14:00h y a las 18:00h.
                      </Text>
                    </View>
                  ) : (
                    avances.map((dato, i) => {
                      const isLast = i === avances.length - 1;
                      const pctNumeric =
                        parseFloat(dato.porcentaje.replace(',', '.')) || 0;

                      return (
                        <View
                          key={dato.hora}
                          className={`mb-3 rounded-[24px] overflow-hidden border ${
                            isLast
                              ? 'border-blue-500'
                              : 'border-gray-200 dark:border-white/10'
                          }`}
                        >
                          <BlurView
                            intensity={isDark ? 15 : 0}
                            tint={isDark ? 'dark' : 'light'}
                          >
                            <View className="p-5">
                              <View className="flex-row justify-between items-center mb-2">
                                <View className="bg-blue-500/15 px-3 py-1 rounded-full">
                                  <Text className="text-[10px] font-black text-blue-500 uppercase">
                                    Avance Oficial {dato.hora}h • {dato.ambito}
                                  </Text>
                                </View>
                                {isLast && (
                                  <Text className="text-[10px] font-black text-emerald-500 uppercase">
                                    Último corte
                                  </Text>
                                )}
                              </View>

                              <View className="flex-row items-baseline mt-1 mb-3">
                                <Text className="text-4xl font-black text-black dark:text-white">
                                  {dato.porcentaje}
                                </Text>
                                <Text className="text-xl font-black text-blue-500 ml-1">
                                  %
                                </Text>
                              </View>

                              <View className="w-full h-2.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                                <View
                                  style={{ width: `${Math.min(100, pctNumeric)}%` }}
                                  className="h-full bg-blue-500 rounded-full"
                                />
                              </View>

                              <View className="flex-row justify-between pt-3 border-t border-gray-200 dark:border-white/10">
                                <View>
                                  <Text className="text-sm font-black text-black dark:text-white">
                                    {formatNumeroEs(dato.mesasComunicadas)}
                                  </Text>
                                  <Text className="text-[10px] font-bold text-gray-400 uppercase">
                                    Mesas comunicadas
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text className="text-sm font-black text-black dark:text-white">
                                    {formatNumeroEs(dato.censoComunicado)}
                                  </Text>
                                  <Text className="text-[10px] font-bold text-gray-400 uppercase">
                                    Censo comunicado
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </BlurView>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
