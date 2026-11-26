export type Camara = 'congreso' | 'senado';
export type AmbitoTerritorial = 'provincias' | 'comunidades';
export type VistaEvento = 'escrutinio' | 'pactometro' | 'territorios' | 'participacion';

export interface PartidoPoliticoRow {
  id?: number;
  siglas: string;
  color: string;
  ideologia: number;
  created_at?: string;
}

export interface PartidoMeta {
  color: string;
  ideologia: number;
}

export interface PartidoData {
  siglas: string;
  escanos: number;
  votos: number;
  porcentaje: number;
  porc: string;
  color: string;
  ideologia: number;
}

export interface RegionData {
  nombre: string;
  escrutado: string;
  porcentajeEscrutado: number;
  porcentajeVotantes: number;
  mayoria: number;
  total_dip: number;
  partidos: PartidoData[];
}

export interface TerritorialEntry {
  key: string;
  codigo: string;
  region: RegionData;
}

export interface ParsedGeneralesDataset {
  espana: RegionData | null;
  comunidades: TerritorialEntry[];
  provincias: TerritorialEntry[];
}

export interface DatosAvance {
  hora: string;
  porcentaje: string;
  mesasComunicadas: number;
  censoComunicado: number;
  ambito: string;
}

export const EMPTY_DATASET: ParsedGeneralesDataset = {
  espana: null,
  comunidades: [],
  provincias: [],
};

/**
 * Fallback local sincronizado con la tabla `public.partidos_politicos` de Supabase
 * (se utiliza únicamente si la consulta a Supabase falla por falta de conexión).
 */
export const PARTIDOS_CONFIG: Record<string, PartidoMeta> = {
  PSOE: { color: '#D90202', ideologia: 3.0 },
  'PSIB-PSOE': { color: '#D90202', ideologia: 3.0 },
  PSC: { color: '#E30613', ideologia: 3.0 },
  'PSC-PSOE': { color: '#E30613', ideologia: 3.0 },
  'PSDEG-PSOE': { color: '#D90202', ideologia: 3.0 },
  'PSN-PSOE': { color: '#D90202', ideologia: 3.0 },
  'PSE-EE (PSOE)': { color: '#D90202', ideologia: 3.0 },
  FO: { color: '#990000', ideologia: 0.8 },
  'FRENTE OBRERO': { color: '#990000', ideologia: 0.8 },
  SALF: { color: '#333333', ideologia: 10.0 },
  'ADELANTE ANDALUCÍA': { color: '#189D52', ideologia: 1.5 },
  PACMA: { color: '#00E600', ideologia: 2.0 },
  VOX: { color: '#63BE21', ideologia: 9.0 },
  PP: { color: '#0056A7', ideologia: 8.0 },
  'MUNDO+JUSTO': { color: '#0095D9', ideologia: 3.5 },
  'ESCAÑOS EN BLANCO': { color: '#CCCCCC', ideologia: 5.0 },
  PCTE: { color: '#B20000', ideologia: 0.5 },
  PCTC: { color: '#B20000', ideologia: 0.5 },
  PCTG: { color: '#B20000', ideologia: 0.5 },
  'PCTE/ELAK': { color: '#B20000', ideologia: 0.5 },
  'ELAK/PCTE': { color: '#B20000', ideologia: 0.5 },
  PODEMOS: { color: '#602E68', ideologia: 1.0 },
  'PAZ,CASA Y TRABAJO': { color: '#602E68', ideologia: 1.0 },
  FA: { color: '#E51C55', ideologia: 1.8 },
  'ARAMÉS-EU-MS': { color: '#E51C55', ideologia: 1.8 },
  'COMUNS-FRONT AMPLI': { color: '#A91E5C', ideologia: 1.8 },
  'FRENTE AMPLIO-FRONTE AMPLA': { color: '#E51C55', ideologia: 1.8 },
  'FRENTE AMPLIO - FRONTE AMPLA': { color: '#E51C55', ideologia: 1.8 },
  'FRENTE AMPLIO-FRONTE ZABALA': { color: '#E51C55', ideologia: 1.8 },
  'CHA-IU-MS-FRENTE AMPLIO': { color: '#D32F2F', ideologia: 1.8 },
  SUMAR: { color: '#E51C55', ideologia: 1.8 },
  '29': { color: '#9932CC', ideologia: 5.0 },
  'TERUEL EXISTE': { color: '#009768', ideologia: 5.0 },
  EXISTE: { color: '#009768', ideologia: 5.0 },
  PUEDE: { color: '#1B4F72', ideologia: 6.0 },
  LIB: { color: '#0072CE', ideologia: 5.0 },
  'D.R.G': { color: '#00A896', ideologia: 2.0 },
  'CCA-1ºCAN': { color: '#FFD700', ideologia: 6.2 },
  '1.ºCAN-CCA': { color: '#FFD700', ideologia: 6.2 },
  CCA: { color: '#FFD700', ideologia: 6.2 },
  CC: { color: '#FFD700', ideologia: 6.2 },
  'NC-BC, PODEMOS, IU, SUMAR': { color: '#6BB130', ideologia: 2.2 },
  'NC-BC': { color: '#6BB130', ideologia: 3.0 },
  PCPC: { color: '#CC0000', ideologia: 0.5 },
  'PARTIDO AUTÓNOMOS': { color: '#FFA500', ideologia: 6.0 },
  'P.D.S.J.E.': { color: '#4682B4', ideologia: 5.0 },
  'P. ALANTRE': { color: '#A31C44', ideologia: 4.0 },
  PREPAL: { color: '#FFCC00', ideologia: 5.5 },
  SY: { color: '#E30613', ideologia: 5.5 },
  'PANCAL-URCI': { color: '#0055A4', ideologia: 8.5 },
  JXCAT: { color: '#00C3B2', ideologia: 6.5 },
  JUNTS: { color: '#00C3B2', ideologia: 6.5 },
  'JXCAT - JUNTS': { color: '#00C3B2', ideologia: 6.5 },
  ERC: { color: '#FFB232', ideologia: 2.2 },
  D21: { color: '#2E86C1', ideologia: 5.0 },
  ALHORA: { color: '#7A1C33', ideologia: 6.2 },
  CNV: { color: '#004488', ideologia: 6.8 },
  NEX: { color: '#C62828', ideologia: 2.0 },
  PH: { color: '#FF6600', ideologia: 3.5 },
  IE: { color: '#F1C40F', ideologia: 8.8 },
  'EH BILDU-ERC': { color: '#00AC8E', ideologia: 1.5 },
  EGUZKILORE: { color: '#F39C12', ideologia: 5.0 },
  GBAI: { color: '#F37021', ideologia: 4.5 },
  'UPN-PP': { color: '#00599C', ideologia: 7.8 },
  UPN: { color: '#00599C', ideologia: 7.8 },
  'EAJ-PNV': { color: '#008000', ideologia: 6.0 },
  PNV: { color: '#008000', ideologia: 6.0 },
  PFAC: { color: '#8E44AD', ideologia: 2.5 },
  '3E': { color: '#2980B9', ideologia: 5.0 },
  'COMPROMIS-EUPV-PODEM-ERPV': { color: '#FF6600', ideologia: 2.0 },
  'MÉS COMPROMÍS': { color: '#FF6600', ideologia: 2.0 },
  COMPROMÍS: { color: '#FF6600', ideologia: 2.0 },
  COMPROMIS: { color: '#FF6600', ideologia: 2.0 },
  VLC: { color: '#0055A5', ideologia: 6.5 },
  RRB: { color: '#34495E', ideologia: 7.5 },
  'AGENDA VALENCIANA': { color: '#E67E22', ideologia: 5.5 },
  'FE DE LAS JONS': { color: '#850101', ideologia: 11.0 },
  'B.N.G.': { color: '#76B3E1', ideologia: 1.8 },
  BNG: { color: '#76B3E1', ideologia: 1.8 },
  'F.I.A.': { color: '#27AE60', ideologia: 5.0 },
  FIA: { color: '#27AE60', ideologia: 5.0 },
  'EH BILDU': { color: '#00AC8E', ideologia: 1.2 },
  'CUP-PR': { color: '#FFED00', ideologia: 0.8 },
  CUP: { color: '#FFED00', ideologia: 0.8 },
  // Coaliciones Senado 29N e Histórico 2023
  'SENADO DE PROGRESO': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE, IU, MS, MM, COMPROMIS, CHA, BATZARRE)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-IU-MS)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-EZAN IU-MS)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-MS)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-CHA-IU-MS)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-IUN NEB-MS-BATZARRE)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-COMPROMIS-EUPV)': { color: '#D90202', ideologia: 2.5 },
  'SDP (PSOE-MM-IU-MS)': { color: '#D90202', ideologia: 2.5 },
  'PSOE-MS': { color: '#D90202', ideologia: 2.5 },
  'PSIB-PSOE-MÉS PER MALLORCA-SUMAR-EUIB': { color: '#D90202', ideologia: 2.5 },
  'A.H.I.': { color: '#008F4C', ideologia: 5.5 },
  ASG: { color: '#C60C30', ideologia: 3.5 },
  'SA UNIÓ': { color: '#0056A7', ideologia: 7.5 },
  'U.P.N.': { color: '#00599C', ideologia: 7.8 },
  'EH BILDU-INDEPENDENTZIA EZKERRETIK': { color: '#00AC8E', ideologia: 1.2 },
  'IZQUIERDAS POR LA INDEPENDENCIA': { color: '#00AC8E', ideologia: 1.5 },
  'ERC-ESQUERRES PER LA INDEPENDÈNCIA': { color: '#FFB232', ideologia: 2.2 },
  'PSOE-SUMAR-EUIB-ARA EIVISSA': { color: '#D90202', ideologia: 2.5 },
  'SUMAR - ECP': { color: '#E51C55', ideologia: 1.8 },
  'SUMAR - COMPROMÍS': { color: '#E51C55', ideologia: 1.8 },
  'SUMAR ARAGÓN': { color: '#E51C55', ideologia: 1.8 },
  'MÉS PER MALLORCA-MÉS PER MENORCA-SUMAR': { color: '#E51C55', ideologia: 1.8 },
};
