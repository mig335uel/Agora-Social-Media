import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
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
}

export default function EventoElecciones29N({
  externalSearchQuery = '',
}: EventoElecciones29NProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const scrollRef = useRef<ScrollView>(null);

  const [camara, setCamara] = useState<Camara>('congreso');
  const [ambito, setAmbito] = useState<AmbitoTerritorial>('provincias');
  const [selectedKey, setSelectedKey] = useState<string>('TO');
  const [territoryFilter, setTerritoryFilter] = useState<string>('');
  const [pactometro, setPactometro] = useState<string[]>([]);

  const [envio, setEnvio] = useState<string>('001');
  const [data, setData] = useState<ParsedGeneralesDataset>(EMPTY_DATASET);
  const [oldData, setOldData] = useState<ParsedGeneralesDataset>(EMPTY_DATASET);
  const [avances, setAvances] = useState<DatosAvance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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
      console.error('Error cargando Especial Elecciones 29N:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedKey('TO');
    setPactometro([]);
    loadElectionData(camara);

    const interval = setInterval(() => {
      loadElectionData(camara);
    }, 60000);

    return () => clearInterval(interval);
  }, [camara, loadElectionData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadElectionData(camara);
  }, [camara, loadElectionData]);

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
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const filteredTerritories = useMemo(() => {
    const list = ambito === 'comunidades' ? data.comunidades : data.provincias;
    const q = (territoryFilter || externalSearchQuery).trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.region.nombre.toLowerCase().includes(q));
  }, [ambito, data.comunidades, data.provincias, territoryFilter, externalSearchQuery]);

  const ultimoAvance = avances.length > 0 ? avances[avances.length - 1] : null;
  const ganadorActual = activeRegion?.partidos?.[0] || null;
  const hasVotosActivos = Boolean(activeRegion?.partidos?.some((x) => x.votos > 0));

  return (
    <ScrollView
      ref={scrollRef}
      className={isDark ? 'bg-black' : 'bg-white'}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
        />
      }
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          1. HERO CABECERA DEL EVENTO EXTRAORDINARIO
         ═══════════════════════════════════════════════════════════════════════ */}
      <View className="overflow-hidden rounded-[32px] shadow-xl border border-gray-200 dark:border-white/10 mb-6">
        <LinearGradient
          colors={isDark ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="absolute right-[-18] top-[-18] opacity-10" pointerEvents="none">
            <Ionicons
              name="podium-outline"
              size={140}
              color={isDark ? '#fff' : '#000'}
            />
          </View>

          <View className="p-6">
            {/* Badges + Selector Congreso / Senado */}
            <View className="flex-row flex-wrap items-center justify-between gap-2 mb-3">
              <View className="flex-row items-center">
                <View className="bg-blue-500 px-3 py-1 rounded-full mr-2 flex-row items-center">
                  <Ionicons name="flash" size={11} color="#fff" />
                  <Text className="text-[10px] font-black text-white uppercase italic ml-1">
                    Evento Extraordinario
                  </Text>
                </View>
                <View className="bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-full flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                  <Text className="text-[10px] font-black text-red-500 uppercase">
                    En Directo
                  </Text>
                </View>
              </View>

              {/* Selector de Cámara */}
              <View className="flex-row bg-black/5 dark:bg-white/10 p-1 rounded-full">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCamara('congreso')}
                  className={`px-3.5 py-1.5 rounded-full ${
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
                    Congreso (350)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCamara('senado')}
                  className={`px-3.5 py-1.5 rounded-full ${
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
                    Senado (208)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Título y botón volver a España */}
            <View className="flex-row items-end justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-2xl font-black text-black dark:text-white leading-7">
                  Elecciones Generales 29N
                </Text>
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">
                  {activeRegion ? activeRegion.nombre : 'España'} •{' '}
                  {camara === 'congreso' ? 'Congreso' : 'Senado'} • Envío #{envio} • vs
                  2023
                </Text>
              </View>

              {selectedKey !== 'TO' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectTerritory('TO')}
                  className="bg-blue-500 px-3.5 py-2 rounded-full flex-row items-center shadow-sm"
                >
                  <Ionicons name="arrow-back" size={13} color="#fff" />
                  <Text className="text-[11px] font-black text-white ml-1">
                    Total España
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* KPIs rápidos */}
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
                  {activeRegion?.total_dip || (camara === 'congreso' ? 350 : 208)}
                </Text>
                <Text className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
                  {labelEscanos}
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
          </View>
        </LinearGradient>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. AVANCES DE PARTICIPACIÓN (14:00H Y 18:00H)
         ═══════════════════════════════════════════════════════════════════════ */}
      {avances.length > 0 && (
        <View className="mb-7">
          <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 ml-1">
            Avances de Participación • 29N
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {avances.map((dato, i) => {
              const isLast = i === avances.length - 1;
              const pctNumeric = parseFloat(dato.porcentaje.replace(',', '.')) || 0;
              const cardW = avances.length > 1 ? BENTO_CARD_WIDTH : SCREEN_WIDTH - 40;

              return (
                <View
                  key={dato.hora}
                  style={{ width: cardW }}
                  className={`mb-2 rounded-[24px] overflow-hidden border ${
                    isLast
                      ? 'border-blue-500'
                      : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <BlurView
                    intensity={isDark ? 15 : 0}
                    tint={isDark ? 'dark' : 'light'}
                  >
                    <View className="p-4">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-[10px] font-black text-blue-500 uppercase tracking-wider">
                          Avance {dato.hora}h
                        </Text>
                        {isLast && (
                          <View className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </View>

                      <View className="flex-row items-baseline mb-2">
                        <Text className="text-2xl font-black text-black dark:text-white">
                          {dato.porcentaje}
                        </Text>
                        <Text className="text-sm font-black text-blue-500 ml-0.5">
                          %
                        </Text>
                      </View>

                      <View className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-2.5">
                        <View
                          style={{ width: `${Math.min(100, pctNumeric)}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </View>

                      <Text className="text-[10px] font-bold text-gray-400 uppercase">
                        {formatNumeroEs(dato.mesasComunicadas)} mesas
                      </Text>
                      <Text className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                        {formatNumeroEs(dato.censoComunicado)} censo
                      </Text>
                    </View>
                  </BlurView>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {loading && !activeRegion ? (
        <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10 p-10 items-center mb-6">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-3">
            Cargando escrutinio oficial...
          </Text>
        </View>
      ) : !activeRegion ? (
        <View className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/10 p-8 items-center mb-6">
          <Ionicons
            name="time-outline"
            size={40}
            color={isDark ? '#475569' : '#94a3b8'}
          />
          <Text className="text-lg font-black text-black dark:text-white mt-3">
            Esperando inicio del escrutinio
          </Text>
          <Text className="text-xs font-medium text-gray-500 text-center mt-1">
            Los datos oficiales de las Elecciones Generales 29N estarán disponibles a
            partir de las 20:00h.
          </Text>
        </View>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════════
              3. HEMICICLO PARLAMENTARIO Y RESULTADOS POR PARTIDO
             ═══════════════════════════════════════════════════════════════════ */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-3 ml-1">
              <Text className="text-xs font-black uppercase tracking-wider text-gray-500">
                Escrutinio • {activeRegion.nombre} ({camara === 'congreso' ? 'Congreso' : 'Senado'})
              </Text>
              {hemicycleData.hasOldSeats && (
                <Text className="text-[10px] font-bold text-gray-400 uppercase">
                  Ext: 2026 • Int: 2023
                </Text>
              )}
            </View>

            {/* Tarjeta del Hemiciclo */}
            <View className="rounded-[28px] overflow-hidden border border-gray-200 dark:border-white/10 mb-4">
              <BlurView
                intensity={isDark ? 15 : 0}
                tint={isDark ? 'dark' : 'light'}
              >
                <View className="p-5 items-center">
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
                        <Text className="text-3xl font-black text-black dark:text-white leading-7">
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

            {/* Listado completo de partidos del territorio activo */}
            {activeRegion.partidos.map((p, index) => {
              const oldMatch = activeOldRegion?.partidos?.find(
                (o) => o.siglas === p.siglas
              );
              const oldEsc = oldMatch ? oldMatch.escanos : 0;
              const dif = p.escanos - oldEsc;
              const pctWidth = hasVotosActivos
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
                              #{index + 1}
                              {hasVotosActivos
                                ? ` • ${formatNumeroEs(p.votos)} votos • ${p.porc}`
                                : ''}{' '}
                              • 2023: {oldEsc}
                            </Text>
                          </View>
                        </View>

                        <View className="items-end pl-2">
                          <Text className="text-xl font-black text-blue-500 leading-6">
                            {p.escanos}
                          </Text>
                          <Text className="text-[9px] font-bold text-gray-500 uppercase">
                            {labelEscanos}
                          </Text>
                        </View>
                      </View>

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
          </View>

          {/* ═══════════════════════════════════════════════════════════════════
              4. PACTÓMETRO DE MAYORÍAS
             ═══════════════════════════════════════════════════════════════════ */}
          {pactoStats && pactoStats.partidosConEscano.length > 0 && (
            <View className="mb-8">
              <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 ml-1">
                Pactómetro de Mayorías • {activeRegion.nombre}
              </Text>

              <View className="rounded-[28px] overflow-hidden border border-gray-200 dark:border-white/10">
                <BlurView
                  intensity={isDark ? 15 : 0}
                  tint={isDark ? 'dark' : 'light'}
                >
                  <View className="p-5">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 pr-3">
                        <Text className="text-lg font-black text-black dark:text-white leading-6">
                          Simulador de Gobierno
                        </Text>
                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          Pulsa en los partidos para alcanzar {activeRegion.mayoria}{' '}
                          {labelUnidadLower}
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
                          Mayoría absoluta: {activeRegion.mayoria}
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
                              : 'Selecciona partidos abajo'}
                          </Text>
                        </View>
                      </View>

                      {pactoStats.votosPacto > 0 && (
                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          {formatNumeroEs(pactoStats.votosPacto)} votos sumados
                        </Text>
                      )}
                    </View>

                    {/* Selector de partidos */}
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
                            Limpiar
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </BlurView>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              5. DESGLOSE TERRITORIAL (PROVINCIAS Y COMUNIDADES AUTÓNOMAS)
             ═══════════════════════════════════════════════════════════════════ */}
          <View className="mb-4">
            <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 ml-1">
              Desglose Territorial • España
            </Text>

            {/* Píldoras Provincias / Comunidades Autónomas */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row bg-gray-100 dark:bg-white/10 p-1 rounded-full">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAmbito('provincias')}
                  className={`px-4 py-1.5 rounded-full ${
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
                  className={`px-4 py-1.5 rounded-full ${
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
                    Comunidades ({data.comunidades.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Buscador de provincia o comunidad */}
            <View className="flex-row items-center bg-gray-100 dark:bg-white/10 rounded-full px-4 py-2.5 mb-4 border border-gray-200 dark:border-white/10">
              <Ionicons
                name="search-outline"
                size={16}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
              <TextInput
                value={territoryFilter}
                onChangeText={setTerritoryFilter}
                placeholder="Buscar provincia o comunidad autónoma..."
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

            {/* Grid de tarjetas territoriales */}
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
                        <View className="flex-row items-center mb-1.5">
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
                            <View className="flex-row items-center">
                              <Text className="text-[11px] font-black text-black dark:text-white">
                                {p.escanos}
                              </Text>
                              {p.votos > 0 && (
                                <Text className="text-[10px] font-bold text-gray-400 ml-1.5">
                                  {p.porc}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
