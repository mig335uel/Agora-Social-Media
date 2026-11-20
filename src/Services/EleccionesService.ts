import { supabase } from '@/lib/supbase/supabase';
import {
  Camara,
  DatosAvance,
  EMPTY_DATASET,
  PARTIDOS_CONFIG,
  ParsedGeneralesDataset,
  PartidoData,
  PartidoMeta,
  RegionData,
  TerritorialEntry,
} from '@/Types/Elecciones';

const ELECTIONS_BASE_URL = 'https://prensa.eleccionesparlamentoandalucia2026.es';
// Basic Auth("usr072anda26:jyFsNJNjYMY")
const BASIC_AUTH_HEADER = 'Basic dXNyMDcyYW5kYTI2Omp5RnNOSk5qWU1Z';

let cachedPartidosMap: Map<string, PartidoMeta> | null = null;

function decodeCsvArrayBuffer(buffer: ArrayBuffer): string {
  try {
    if (typeof TextDecoder !== 'undefined') {
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch {
        return new TextDecoder('iso-8859-1').decode(buffer);
      }
    }
  } catch {
    // Fallback manual Latin-1
  }
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

export async function getPartidosConfigMap(): Promise<Map<string, PartidoMeta>> {
  if (cachedPartidosMap) return cachedPartidosMap;

  const map = new Map<string, PartidoMeta>();
  for (const [key, val] of Object.entries(PARTIDOS_CONFIG)) {
    map.set(key.toUpperCase().trim(), {
      color: val.color,
      ideologia: Number(val.ideologia) || 5.0,
    });
  }

  try {
    const { data, error } = await supabase
      .from('partidos_politicos')
      .select('siglas, color, ideologia');

    if (!error && data) {
      for (const row of data) {
        if (row.siglas) {
          map.set(String(row.siglas).toUpperCase().trim(), {
            color: row.color || '#94A3B8',
            ideologia: Number(row.ideologia) || 5.0,
          });
        }
      }
    }
  } catch {
    // Si falla la red, usamos PARTIDOS_CONFIG local
  }

  cachedPartidosMap = map;
  return map;
}

export function resolvePartidoMeta(
  siglas: string,
  configMap: Map<string, PartidoMeta>
): PartidoMeta {
  const key = siglas.toUpperCase().trim();
  const exact = configMap.get(key);
  if (exact) return exact;

  if (
    key.startsWith('SDP (') ||
    key.startsWith('SENADO DE PROGRESO') ||
    key.startsWith('PSOE-') ||
    key.startsWith('PSIB-PSOE') ||
    key.startsWith('PSDEG-PSOE') ||
    key.startsWith('PSN-PSOE') ||
    key.startsWith('PSE-EE')
  ) {
    return { color: '#D90202', ideologia: 2.5 };
  }
  if (key.startsWith('FRENTE AMPLIO') || key.startsWith('SUMAR')) {
    return { color: '#E51C55', ideologia: 1.8 };
  }
  if (key.startsWith('EH BILDU') || key.includes('IZQUIERDAS POR LA INDEPENDENCIA')) {
    return { color: '#00AC8E', ideologia: 1.2 };
  }
  if (key.startsWith('ERC')) {
    return { color: '#FFB232', ideologia: 2.2 };
  }
  if (key.startsWith('JXCAT') || key.startsWith('JUNTS')) {
    return { color: '#00C3B2', ideologia: 6.5 };
  }
  if (key.startsWith('UPN') || key === 'U.P.N.') {
    return { color: '#00599C', ideologia: 7.8 };
  }
  if (key.startsWith('PP-') || key.endsWith('-PP')) {
    return { color: '#0056A7', ideologia: 8.0 };
  }

  return { color: '#94A3B8', ideologia: 5.0 };
}

export function getColorGanador(
  region: RegionData | null,
  global: RegionData | null
): string {
  if (!region || !region.partidos || region.partidos.length === 0) return '#64748B';

  const ganadores = [...region.partidos].sort((a, b) => {
    if (b.escanos !== a.escanos) return b.escanos - a.escanos;

    if (global?.partidos) {
      const aGlobal = global.partidos.find((p) => p.siglas === a.siglas);
      const bGlobal = global.partidos.find((p) => p.siglas === b.siglas);
      const aEscGlobal = aGlobal ? aGlobal.escanos : 0;
      const bEscGlobal = bGlobal ? bGlobal.escanos : 0;
      if (bEscGlobal !== aEscGlobal) return bEscGlobal - aEscGlobal;

      const aVotGlobal = aGlobal ? aGlobal.votos : 0;
      const bVotGlobal = bGlobal ? bGlobal.votos : 0;
      if (bVotGlobal !== aVotGlobal) return bVotGlobal - aVotGlobal;
    }

    return b.votos - a.votos;
  });

  if (ganadores[0].escanos > 0 || ganadores[0].votos > 0) {
    return ganadores[0].color;
  }
  return '#64748B';
}

export function formatNumeroEs(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function cleanField(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/[\x00-\x1F\x7F-\xA0]/g, '').trim();
}

export function parseGeneralesCsvText(
  csvText: string,
  configMap: Map<string, PartidoMeta>,
  camara: Camara,
  isHistorico: boolean = false
): ParsedGeneralesDataset {
  if (!csvText || !csvText.trim()) return EMPTY_DATASET;

  let espana: RegionData | null = null;
  const comunidades: TerritorialEntry[] = [];
  const provincias: TerritorialEntry[] = [];

  const isSenado = camara === 'senado';
  const inicio = isSenado ? 19 : 22;
  const stride = isSenado ? (isHistorico ? 3 : 7) : 5;

  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    if (!line) continue;
    const col = line.split(';');
    if (col.length < inicio + 2) continue;

    const tipo = cleanField(col[1]);
    if (tipo !== 'TO' && tipo !== 'CM' && tipo !== 'PR' && tipo !== 'CI') continue;

    const codComunidad = cleanField(col[2]);
    const codProvincia = cleanField(col[3]);
    const codIsla = cleanField(col[4]) || '9';
    const nombre = cleanField(col[5]) || cleanField(col[4]) || 'España';
    const totalDip =
      parseInt(cleanField(col[18]), 10) || (isSenado && tipo === 'TO' ? 208 : 0);
    const totalVotantes = parseInt(cleanField(col[10]), 10) || 0;

    const pctEscrutado =
      (parseFloat(cleanField(col[9]).replace(',', '.')) || 0) / 100;
    const pctVotantes =
      (parseFloat(cleanField(col[11]).replace(',', '.')) || 0) / 100;
    const escrutado = pctEscrutado.toFixed(2).replace('.', ',') + '%';

    const partidosMap = new Map<
      string,
      PartidoData & { rawPorc: number }
    >();

    for (let i = 0; i < 80; i++) {
      const idx = inicio + i * stride;
      if (idx + 1 >= col.length) break;

      const codCand = cleanField(col[idx]) || '0000';
      const siglas = cleanField(col[idx + 1]);
      if (!siglas || codCand === '0000' || /^0+$/.test(siglas)) continue;

      let votos = 0;
      let rawPorc = 0;
      let escanos = 0;

      if (isSenado) {
        if (isHistorico) {
          escanos = parseInt(cleanField(col[idx + 2]), 10) || 0;
        } else {
          votos = parseInt(cleanField(col[idx + 4]), 10) || 0;
          rawPorc = parseFloat(cleanField(col[idx + 5]).replace(',', '.')) || 0;
          escanos = parseInt(cleanField(col[idx + 6]), 10) || 0;
        }
      } else {
        votos = parseInt(cleanField(col[idx + 2]), 10) || 0;
        rawPorc = parseFloat(cleanField(col[idx + 3]).replace(',', '.')) || 0;
        escanos = parseInt(cleanField(col[idx + 4]), 10) || 0;
      }

      if (votos > 0 || escanos > 0 || (!isHistorico && totalVotantes === 0)) {
        const existing = partidosMap.get(siglas);
        if (existing) {
          existing.votos += votos;
          existing.escanos += escanos;
          if (rawPorc > existing.rawPorc) {
            existing.rawPorc = rawPorc;
            existing.porcentaje = rawPorc / 100;
            existing.porc = (rawPorc / 100).toFixed(2).replace('.', ',') + '%';
          }
        } else {
          const meta = resolvePartidoMeta(siglas, configMap);
          partidosMap.set(siglas, {
            siglas,
            escanos,
            votos,
            rawPorc,
            porcentaje: rawPorc / 100,
            porc: (rawPorc / 100).toFixed(2).replace('.', ',') + '%',
            color: meta.color,
            ideologia: meta.ideologia,
          });
        }
      }
    }

    const partidos: PartidoData[] = Array.from(partidosMap.values()).map(
      ({ rawPorc: _raw, ...rest }) => rest
    );

    partidos.sort((a, b) => {
      if (b.escanos !== a.escanos) return b.escanos - a.escanos;
      return b.votos - a.votos;
    });

    const regionData: RegionData = {
      nombre,
      escrutado,
      porcentajeEscrutado: pctEscrutado,
      porcentajeVotantes: pctVotantes,
      mayoria: Math.floor(totalDip / 2) + 1,
      total_dip: totalDip,
      partidos,
    };

    if (tipo === 'TO') {
      espana = regionData;
    } else if (tipo === 'CM') {
      comunidades.push({
        key: `CM-${codComunidad}`,
        codigo: codComunidad,
        region: regionData,
      });
    } else if (tipo === 'PR' || tipo === 'CI') {
      provincias.push({
        key: tipo === 'CI' ? `CI-${codProvincia}-${codIsla}` : `PR-${codProvincia}`,
        codigo: codProvincia,
        region: regionData,
      });
    }
  }

  comunidades.sort((a, b) => a.region.nombre.localeCompare(b.region.nombre, 'es'));
  provincias.sort((a, b) => a.region.nombre.localeCompare(b.region.nombre, 'es'));

  return { espana, comunidades, provincias };
}

export function parseCsvAvancesText(
  csvText: string,
  tipoRegistro: string = 'TO'
): DatosAvance[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/);
  let dataRow: string[] | null = null;

  for (const line of lines) {
    if (!line) continue;
    const cols = line.split(';');
    if (cols.length < 18) continue;
    if (cleanField(cols[1]) === tipoRegistro) {
      dataRow = cols;
      break;
    }
  }

  if (!dataRow && tipoRegistro === 'TO') {
    for (const line of lines) {
      if (!line) continue;
      const cols = line.split(';');
      if (cols.length >= 15 && cleanField(cols[1]) === 'CM') {
        dataRow = cols;
        break;
      }
    }
  }

  if (!dataRow) return [];

  const ambito = cleanField(dataRow[5]) || 'España';
  const horas = ['14:00', '18:00'];
  const avances: DatosAvance[] = [];

  for (let i = 0; i < horas.length; i++) {
    const baseIdx = 12 + i * 3;
    if (baseIdx + 2 >= dataRow.length) break;

    const rawMesas = cleanField(dataRow[baseIdx]);
    const rawCenso = cleanField(dataRow[baseIdx + 1]);
    const rawPorc = cleanField(dataRow[baseIdx + 2]);

    const porcInt = parseInt(rawPorc, 10) || 0;
    if (porcInt <= 0) continue;

    avances.push({
      hora: horas[i],
      porcentaje: (porcInt / 100).toFixed(2).replace('.', ','),
      mesasComunicadas: parseInt(rawMesas, 10) || 0,
      censoComunicado: parseInt(rawCenso, 10) || 0,
      ambito,
    });
  }

  return avances;
}

async function fetchRemoteText(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${ELECTIONS_BASE_URL}${path}`, {
      headers: {
        Authorization: BASIC_AUTH_HEADER,
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return decodeCsvArrayBuffer(buffer);
  } catch {
    return null;
  }
}

export async function fetchGeneralesLiveBundle(camara: Camara): Promise<{
  envio: string;
  data: ParsedGeneralesDataset;
  oldData: ParsedGeneralesDataset;
  avances: DatosAvance[];
}> {
  const electionId = camara === 'senado' ? '3' : '2';
  const ts = Date.now();

  const [configMap, rawEnvio] = await Promise.all([
    getPartidosConfigMap(),
    fetchRemoteText(`/descargas/csv/data/getEnvio/${electionId}?t=${ts}`),
  ]);

  let numEnvio = (rawEnvio || '').replace(/['"]+/g, '').trim() || '001';
  if (numEnvio === '0') numEnvio = '001';

  const [csvActual, csvOld, csvAvances] = await Promise.all([
    fetchRemoteText(
      `/descargas/csv/data/getEscrutinioTotales/${electionId}/${numEnvio}?t=${ts}`
    ),
    fetchRemoteText(
      `/descargas/csv/fijos/getEscrutinioTotales/ANT/${electionId}/07-23?t=${ts}`
    ),
    fetchRemoteText(`/descargas/csv/data/getAvancesTotales/2/${numEnvio}?t=${ts}`),
  ]);

  const data = csvActual
    ? parseGeneralesCsvText(csvActual, configMap, camara, false)
    : EMPTY_DATASET;

  const oldData = csvOld
    ? parseGeneralesCsvText(csvOld, configMap, camara, true)
    : EMPTY_DATASET;

  const avances = csvAvances ? parseCsvAvancesText(csvAvances, 'TO') : [];

  return {
    envio: numEnvio,
    data,
    oldData,
    avances,
  };
}
