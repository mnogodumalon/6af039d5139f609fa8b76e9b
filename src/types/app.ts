import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Veranstaltungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    max_teilnehmer?: number;
    headerbild?: string;
    hintergrundbild?: string;
    anmeldung_status?: LookupValue;
  };
}

export interface Anmeldungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
    nachname?: string;
    vorname?: string;
    email?: string;
    anmerkung?: string;
    status?: LookupValue;
  };
}

export const APP_IDS = {
  VERANSTALTUNGEN: '6af039c667282cedda47bb9f',
  ANMELDUNGEN: '6af039c9b57bbcd76ab4e25b',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'veranstaltungen': {
    anmeldung_status: [{ key: "offen", get label() { return lookupLabel('veranstaltungen', 'anmeldung_status', "offen") ?? "Anmeldung offen"; } }, { key: "geschlossen", get label() { return lookupLabel('veranstaltungen', 'anmeldung_status', "geschlossen") ?? "Anmeldung geschlossen"; } }],
  },
  'anmeldungen': {
    status: [{ key: "angemeldet", get label() { return lookupLabel('anmeldungen', 'status', "angemeldet") ?? "Angemeldet"; } }, { key: "warteliste", get label() { return lookupLabel('anmeldungen', 'status', "warteliste") ?? "Warteliste"; } }, { key: "abgesagt", get label() { return lookupLabel('anmeldungen', 'status', "abgesagt") ?? "Abgesagt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'veranstaltungen': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'datum': 'date/datetimeminute',
    'ort': 'string/text',
    'max_teilnehmer': 'number',
    'headerbild': 'file',
    'hintergrundbild': 'file',
    'anmeldung_status': 'lookup/radio',
  },
  'anmeldungen': {
    'veranstaltung': 'applookup/select',
    'nachname': 'string/text',
    'vorname': 'string/text',
    'email': 'string/email',
    'anmerkung': 'string/textarea',
    'status': 'lookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;