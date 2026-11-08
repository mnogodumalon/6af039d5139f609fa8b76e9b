// Auto-generated. Per-entity form-enhancements config for "Veranstaltungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", {"row": ["datum", "ort"], "cols": "1fr 1fr"}, {"row": ["max_teilnehmer", "anmeldung_status"], "cols": "1fr 1fr"}, "beschreibung"],
  defaults: {
    'datum': { kind: 'today', withTime: true },
    'anmeldung_status': { kind: 'lookup', key: 'offen', label: 'Anmeldung offen' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
