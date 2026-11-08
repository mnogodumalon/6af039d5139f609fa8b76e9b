import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconCalendarEvent, IconCopy, IconExternalLink, IconMapPin, IconPencil, IconPlus, IconQrcode, IconUsers } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor } from '@/config/plan';
import type { Veranstaltungen, Anmeldungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import { lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, dateFnsLocale } from '@/i18n';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { usePublicPageLink } from '@/components/widgets/PublicPageQr';
import { qrSvgString } from '@/components/widgets/QrCode';

type Filter = 'all' | 'offen' | 'warteliste';

interface Counts { angemeldet: number; warteliste: number }

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* i18n-exempt: raw HTML of the QR tab, no UI text */
function buildQrHtml(title: string, heading: string, link: string) {
  const svg = qrSvgString(link).replace('<svg', '<svg style="width:100%;height:auto"'); /* i18n-exempt */
  return [ /* i18n-exempt */
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(title) + '</title></head>', // i18n-exempt
    '<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box">', // i18n-exempt
    '<h1 style="font-size:20px;margin:0;text-align:center">' + escapeHtml(heading) + '</h1>', // i18n-exempt
    '<div style="width:min(80vmin,420px)">' + svg + '</div>', // i18n-exempt
    '<p style="font-size:13px;color:#555;word-break:break-all;text-align:center;margin:0">' + escapeHtml(link) + '</p></body></html>', // i18n-exempt
  ].join('');
}

function EventCard({ v, counts, canWrite, onOpen, onEdit }: {
  v: Veranstaltungen; counts: Counts; canWrite: boolean; onOpen: () => void; onEdit: () => void;
}) {
  const { link } = usePublicPageLink('veranstaltungen', v.record_id);
  const f = v.fields;
  const max = f.max_teilnehmer ?? 0;
  const pct = max > 0 ? Math.min(100, Math.round((counts.angemeldet / max) * 100)) : 0;
  const full = max > 0 && counts.angemeldet >= max;
  const isOpen = lookupKey(f.anmeldung_status) === 'offen';
  const when = f.datum ? format(new Date(f.datum), 'EEE, dd.MM.yyyy · HH:mm', { locale: dateFnsLocale() }) : '';

  const openQr = () => {
    if (!link) return;
    const title = tx('QR-Code zur Anmeldung');
    const html = buildQrHtml(title, f.titel ?? '', link);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      undoToast(tx('Link kopiert'));
    } catch {
      window.prompt(tx('Link kopieren:'), link);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card p-4 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <div className="font-semibold truncate">{f.titel}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><IconCalendarEvent size={14} className="shrink-0" />{when}</span>
            <span className="inline-flex items-center gap-1 min-w-0"><IconMapPin size={14} className="shrink-0" /><span className="truncate">{f.ort}</span></span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`text-xs font-medium ${isOpen ? 'text-emerald-600' : 'text-muted-foreground'}`}>{f.anmeldung_status?.label}</span>
          {canWrite && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={tx('Bearbeiten')}>
              <IconPencil size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1"><IconUsers size={14} className="shrink-0" />{counts.angemeldet} / {max} {tx('Plätze belegt')}</span>
          {counts.warteliste > 0 && <span className="font-medium text-amber-600">{counts.warteliste} {tx('auf Warteliste')}</span>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${full ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!link} onClick={() => link && window.open(link, '_blank')}>
          <IconExternalLink size={16} className="shrink-0" />{tx('Anmeldeseite')}
        </Button>
        <Button variant="outline" size="sm" disabled={!link} onClick={openQr}>
          <IconQrcode size={16} className="shrink-0" />{tx('QR-Code')}
        </Button>
        <Button variant="outline" size="sm" disabled={!link} onClick={copy}>
          <IconCopy size={16} className="shrink-0" />{tx('Link kopieren')}
        </Button>
      </div>
    </div>
  );
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { veranstaltungen, anmeldungen, veranstaltungenMap } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'anmeldungen') return undefined;
      const r = top.record as Anmeldungen;
      if (lookupKey(r.fields.status) !== 'warteliste') return undefined;
      const go = flowActionFor('anmeldungen', 'status', r.record_id, 'angemeldet');
      return go ? { label: tx('Von Warteliste aktivieren'), onClick: go } : undefined;
    },
  });
  const enrichedAnmeldungen = crud.enriched.anmeldungen;
  const clock = useClock();
  const [filter, setFilter] = useState<Filter>('all');

  const countsById = useMemo(() => {
    const m = new Map<string, Counts>();
    for (const a of anmeldungen) {
      const id = extractRecordId(a.fields.veranstaltung);
      if (!id) continue;
      const c = m.get(id) ?? { angemeldet: 0, warteliste: 0 };
      const s = lookupKey(a.fields.status);
      if (s === 'angemeldet') c.angemeldet++;
      else if (s === 'warteliste') c.warteliste++;
      m.set(id, c);
    }
    return m;
  }, [anmeldungen]);
  const countsOf = (id: string): Counts => countsById.get(id) ?? { angemeldet: 0, warteliste: 0 };

  const todayKey = format(clock, "yyyy-MM-dd'T'HH:mm");
  const sorted = useMemo(() => {
    const up = veranstaltungen.filter(v => (v.fields.datum ?? '') >= todayKey)
      .sort((a, b) => (a.fields.datum ?? '').localeCompare(b.fields.datum ?? ''));
    const past = veranstaltungen.filter(v => (v.fields.datum ?? '') < todayKey)
      .sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? ''));
    return [...up, ...past];
  }, [veranstaltungen, todayKey]);

  const upcoming = sorted.filter(v => (v.fields.datum ?? '') >= todayKey);
  const openEvents = veranstaltungen.filter(v => lookupKey(v.fields.anmeldung_status) === 'offen');
  const withWait = veranstaltungen.filter(v => countsOf(v.record_id).warteliste > 0);
  const totalBooked = upcoming.reduce((s, v) => s + countsOf(v.record_id).angemeldet, 0);
  const totalMax = upcoming.reduce((s, v) => s + (v.fields.max_teilnehmer ?? 0), 0);

  const shown = sorted.filter(v =>
    filter === 'offen' ? lookupKey(v.fields.anmeldung_status) === 'offen'
      : filter === 'warteliste' ? countsOf(v.record_id).warteliste > 0 : true);

  const waitlist = enrichedAnmeldungen.filter(a => lookupKey(a.fields.status) === 'warteliste');
  const nearlyFull = upcoming.filter(v => {
    const max = v.fields.max_teilnehmer ?? 0;
    const c = countsOf(v.record_id).angemeldet;
    return max > 0 && c < max && c / max >= 0.8;
  });

  const waitNames = waitlist.map(a => a.fields.vorname ?? '');
  const nextEvent = upcoming[0];
  const context = waitlist.length > 0
    ? tx`${namen(waitNames)} warten auf der Warteliste auf einen Platz.`
    : nextEvent
      ? tx`Als Nächstes: ${nextEvent.fields.titel ?? ''} am ${format(new Date(nextEvent.fields.datum ?? clock), 'dd.MM.', { locale: dateFnsLocale() })}.`
      : tx`Lege deine erste kommende Veranstaltung an.`;

  const veranstaltungName = (a: { veranstaltungName?: string }) => a.veranstaltungName ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.veranstaltungen.canWrite && (
          <Button onClick={() => crud.veranstaltungen.openCreate({ anmeldung_status: 'offen' })}>
            <IconPlus size={16} className="shrink-0" />{tx('Neue Veranstaltung')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="split"
        kpis={veranstaltungen.length > 0 ? (
          <StatStrip>
            <StatStripItem
              title={tx('Belegte Plätze (anstehend)')}
              value={`${totalBooked} / ${totalMax}`}
              icon={<IconUsers size={16} className="text-muted-foreground" />}
            />
            <StatStripItem
              title={tx('Anmeldung offen')}
              value={openEvents.length}
              onClick={() => setFilter(f => f === 'offen' ? 'all' : 'offen')}
              active={filter === 'offen'}
              tone="primary"
            />
            <StatStripItem
              title={tx('Mit Warteliste')}
              value={withWait.length}
              onClick={() => setFilter(f => f === 'warteliste' ? 'all' : 'warteliste')}
              active={filter === 'warteliste'}
              tone={withWait.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        ) : undefined}
        primary={
          shown.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center space-y-3">
              <IconCalendarEvent size={48} className="mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {veranstaltungen.length === 0 ? tx('Noch keine Veranstaltung — lege die erste an und teile den Anmeldelink.') : tx('Keine Veranstaltung passt zum Filter.')}
              </p>
              {veranstaltungen.length === 0 && crud.veranstaltungen.canWrite && (
                <Button onClick={() => crud.veranstaltungen.openCreate({ anmeldung_status: 'offen' })}>{tx('Erste Veranstaltung anlegen')}</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {shown.map(v => (
                <EventCard
                  key={v.record_id}
                  v={v}
                  counts={countsOf(v.record_id)}
                  canWrite={crud.veranstaltungen.canWrite}
                  onOpen={() => crud.veranstaltungen.openDetail(v)}
                  onEdit={() => crud.veranstaltungen.openEdit(v)}
                />
              ))}
            </div>
          )
        }
        aside={
          <>
            <WorkList
              title={tx('Warteliste')}
              items={waitlist.map(a => {
                const go = flowActionFor('anmeldungen', 'status', a.record_id, 'angemeldet');
                return {
                  id: a.record_id,
                  title: `${a.fields.vorname ?? ''} ${a.fields.nachname ?? ''}`.trim(),
                  secondLine: <span className="text-muted-foreground">{veranstaltungName(a)}</span>,
                  action: go ? { label: tx('Aktivieren'), onClick: go } : undefined,
                };
              })}
              onItemClick={id => {
                const rec = anmeldungen.find(a => a.record_id === id);
                if (rec) crud.anmeldungen.openDetail(rec);
              }}
              empty={{ text: tx('Niemand wartet — alle Anmeldungen haben einen Platz.') }}
            />
            <WorkList
              title={tx('Fast ausgebucht')}
              items={nearlyFull.map(v => {
                const c = countsOf(v.record_id).angemeldet;
                return {
                  id: v.record_id,
                  title: v.fields.titel ?? '',
                  secondLine: <span className="text-muted-foreground">{c} / {v.fields.max_teilnehmer} · {(v.fields.max_teilnehmer ?? 0) - c} {tx('Plätze frei')}</span>,
                };
              })}
              onItemClick={id => {
                const rec = veranstaltungenMap.get(id);
                if (rec) crud.veranstaltungen.openDetail(rec);
              }}
              empty={{ text: tx('Keine Veranstaltung kurz vor dem Limit.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
