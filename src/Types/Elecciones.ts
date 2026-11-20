export type Camara = 'congreso' | 'senado';
export type AmbitoTerritorial = 'provincias' | 'comunidades';
export type VistaEvento = 'escrutinio' | 'pactometro' | 'territorios' | 'participacion';

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

export const PARTIDOS_CONFIG: Record<string, PartidoMeta> = {
  PSOE: { color: '#E30613', ideologia: 2.0 },
  PP: { color: '#0056A7', ideologia: 6.0 },
  VOX: { color: '#63BE21', ideologia: 7.0 },
  'PODEMOS-IU-AV': { color: '#951B81', ideologia: 1.0 },
  SUMAR: { color: '#E4007C', ideologia: 1.0 },
  'JUNTOS-LEVANTA': { color: '#448844', ideologia: 4.0 },
  'EXTREMADURA UNIDA': { color: '#009A47', ideologia: 4.0 },
  CS: { color: '#EB6109', ideologia: 5.0 },
  PACMA: { color: '#9ACD32', ideologia: 3.0 },
  'UED-SYT': { color: '#008080', ideologia: 2.5 },
  NEX: { color: '#555555', ideologia: 4.0 },
  'MUNDO+JUSTO': { color: '#F5821F', ideologia: 1.5 },
  SALF: { color: '#8B4513', ideologia: 7.0 },
  CHA: { color: '#D21F1F', ideologia: 2.5 },
  EXISTE: { color: '#008000', ideologia: 4.0 },
  PAR: { color: '#FFD700', ideologia: 5.0 },
  'ESCAÑOS EN BLANCO': { color: '#000000', ideologia: 4.0 },
  'COALICIÓN ARAGONESA': { color: '#FFA500', ideologia: 5.0 },
  PCTE: { color: '#FF0000', ideologia: 0.5 },
  PCPC: { color: '#B71C1C', ideologia: 0.6 },
  ETXSBC: { color: '#888888', ideologia: 4.0 },
  IU: { color: '#D50000', ideologia: 1.0 },
  'IU- MOVIMIENTO SUMAR': { color: '#D50000', ideologia: 1.0 },
  // Generales 29N
  'PSIB-PSOE': { color: '#D90202', ideologia: 3.0 },
  PSC: { color: '#E30613', ideologia: 3.0 },
  'PSDEG-PSOE': { color: '#D90202', ideologia: 3.0 },
  'PSN-PSOE': { color: '#D90202', ideologia: 3.0 },
  'PSE-EE (PSOE)': { color: '#D90202', ideologia: 3.0 },
  FO: { color: '#990000', ideologia: 0.8 },
  'FRENTE OBRERO': { color: '#990000', ideologia: 0.8 },
  'ADELANTE ANDALUCÍA': { color: '#189D52', ideologia: 1.5 },
  PODEMOS: { color: '#602E68', ideologia: 1.0 },
  FA: { color: '#E51C55', ideologia: 1.8 },
  'COMUNS-FRONT AMPLI': { color: '#A91E5C', ideologia: 1.8 },
  'CHA-IU-MS-FRENTE AMPLIO': { color: '#D32F2F', ideologia: 1.8 },
  'FRENTE AMPLIO-FRONTE AMPLA': { color: '#E51C55', ideologia: 1.8 },
  'FRENTE AMPLIO - FRONTE AMPLA': { color: '#E51C55', ideologia: 1.8 },
  'FRENTE AMPLIO-FRONTE ZABALA': { color: '#E51C55', ideologia: 1.8 },
  'ARAMÉS-EU-MS': { color: '#E51C55', ideologia: 1.8 },
  JXCAT: { color: '#00C3B2', ideologia: 6.5 },
  JUNTS: { color: '#00C3B2', ideologia: 6.5 },
  'JXCAT - JUNTS': { color: '#00C3B2', ideologia: 6.5 },
  ERC: { color: '#FFB232', ideologia: 2.2 },
  'EH BILDU': { color: '#00AC8E', ideologia: 1.2 },
  'EH BILDU-ERC': { color: '#00AC8E', ideologia: 1.5 },
  'EAJ-PNV': { color: '#008000', ideologia: 6.0 },
  PNV: { color: '#008000', ideologia: 6.0 },
  BNG: { color: '#76B3E1', ideologia: 1.8 },
  'B.N.G.': { color: '#76B3E1', ideologia: 1.8 },
  CUP: { color: '#FFED00', ideologia: 1.0 },
  'CCA-1ºCAN': { color: '#FFD700', ideologia: 6.2 },
  '1.ºCAN-CCA': { color: '#FFD700', ideologia: 6.2 },
  CCA: { color: '#FFD700', ideologia: 6.2 },
  'UPN-PP': { color: '#00599C', ideologia: 7.8 },
  UPN: { color: '#00599C', ideologia: 7.8 },
  'U.P.N.': { color: '#00599C', ideologia: 7.8 },
  'COMPROMIS-EUPV-PODEM-ERPV': { color: '#FF6600', ideologia: 2.0 },
  COMPROMIS: { color: '#EC6927', ideologia: 2.0 },
  'TERUEL EXISTE': { color: '#009768', ideologia: 5.0 },
  'NC-BC, PODEMOS, IU, SUMAR': { color: '#6BB130', ideologia: 2.2 },
  'NC-BC': { color: '#78BE20', ideologia: 2.2 },
  // Coaliciones Senado 2026
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
  // Históricos 2023
  'EH BILDU-INDEPENDENTZIA EZKERRETIK': { color: '#00AC8E', ideologia: 1.2 },
  'IZQUIERDAS POR LA INDEPENDENCIA': { color: '#00AC8E', ideologia: 1.5 },
  'ERC-ESQUERRES PER LA INDEPENDÈNCIA': { color: '#FFB232', ideologia: 2.2 },
  'PSOE-SUMAR-EUIB-ARA EIVISSA': { color: '#D90202', ideologia: 2.5 },
  'SUMAR - ECP': { color: '#E51C55', ideologia: 1.8 },
  'SUMAR - COMPROMÍS': { color: '#E51C55', ideologia: 1.8 },
  'SUMAR ARAGÓN': { color: '#E51C55', ideologia: 1.8 },
  'MÉS PER MALLORCA-MÉS PER MENORCA-SUMAR': { color: '#E51C55', ideologia: 1.8 },
};
