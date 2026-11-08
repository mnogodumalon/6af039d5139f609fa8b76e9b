import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, useLiveList, fieldText, fieldLookup, freshRef,
} from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'veranstaltung-anmelden';

function Registration({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [params] = useSearchParams();
  const eventId = params.get('veranstaltung') ?? '';
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const live = useLiveList(port, 'veranstaltungen', { intervalMs: 20000 });

  const f = useStepForm('anmeldungen', {
    fields: ['nachname', 'vorname', 'email', 'anmerkung'],
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{
      key: 'anmeldung',
      entity: 'anmeldungen',
      form: f,
      primary: true,
      values: { veranstaltung: eventId },
    }],
    {
      draftKey: `veranstaltung-anmelden-${eventId}`,
      check: async () => {
        // the status is a lookup, not a reference: freshRef only confirms the record still exists
        const [gone, fresh] = await Promise.all([
          freshRef(port, 'veranstaltungen', eventId, '' as never),
          port.get('veranstaltungen', eventId),
        ]);
        return gone === null && fresh && fieldLookup(fresh, 'anmeldung_status')?.key === 'offen'
          ? null
          : tx('Die Anmeldung für diese Veranstaltung ist inzwischen geschlossen.');
      },
    },
  );

  const event = live.records.find(r => r.id === eventId);
  const headerImg = event ? fieldText(event, 'headerbild') : '';
  const bgImg = event ? fieldText(event, 'hintergrundbild') : '';

  let content;
  if (!eventId) {
    content = (
      <p className="text-center text-muted-foreground py-8">
        {tx('Bitte öffne den Link oder scanne den QR-Code deiner Veranstaltung, um dich anzumelden.')}
      </p>
    );
  } else if (!live.loaded && live.error) {
    content = <LoadProblem onRetry={live.reload} />;
  } else if (!live.loaded) {
    content = <p className="text-center text-muted-foreground py-8">{tx('Wird geladen …')}</p>;
  } else if (!event) {
    content = (
      <p className="text-center text-muted-foreground py-8">
        {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
      </p>
    );
  } else {
    const isOpen = fieldLookup(event, 'anmeldung_status')?.key === 'offen';
    content = (
      <>
        {headerImg ? (
          <img src={headerImg} alt="" className="w-full max-h-64 object-cover" />
        ) : null}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl font-medium break-words">{fieldText(event, 'titel')}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar size={16} className="shrink-0" />
                {fieldText(event, 'datum')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin size={16} className="shrink-0" />
                {fieldText(event, 'ort')}
              </span>
            </div>
            <p className="whitespace-pre-line break-words">{fieldText(event, 'beschreibung')}</p>
          </div>

          <div className="border-t pt-6">
            {submit.result ? (
              <SuccessStep
                result={submit.result}
                forms={[f]}
                title={tx('Danke für deine Anmeldung')}
                whatHappensNext={tx('Ist die Veranstaltung bereits voll, setzen wir dich auf die Warteliste und melden uns bei dir, sobald ein Platz frei wird.')}
                actions={{ copy: false, print: true }}
              >
                <dl className="mt-4 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-muted-foreground">{tx('Veranstaltung')}</dt>
                  <dd className="break-words">{fieldText(event, 'titel')}</dd>
                  <dt className="text-muted-foreground">{tx('Datum')}</dt>
                  <dd>{fieldText(event, 'datum')}</dd>
                  <dt className="text-muted-foreground">{tx('Ort')}</dt>
                  <dd className="break-words">{fieldText(event, 'ort')}</dd>
                </dl>
              </SuccessStep>
            ) : !isOpen ? (
              <p className="text-center text-muted-foreground">
                {tx('Die Anmeldung für diese Veranstaltung ist geschlossen.')}
              </p>
            ) : (
              <form
                className="space-y-4"
                onFocus={() => prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(e => e.op === 'create')?.app_id}/records`)}
                onSubmit={async e => {
                  e.preventDefault();
                  if (!f.validate()) return;
                  await submit.run();
                }}
              >
                <h2 className="text-lg font-medium">{tx('Jetzt anmelden')}</h2>
                <Bound form={f} name="nachname" />
                <Bound form={f} name="vorname" />
                <Bound form={f} name="email" />
                <Bound form={f} name="anmerkung" />
                <FieldErrorSummary forms={[f]} />
                {submit.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {submit.error.message || tx('Das Senden hat nicht geklappt. Bitte versuche es noch einmal.')}
                  </p>
                ) : null}
                {submit.offline ? (
                  <p className="text-sm text-muted-foreground">
                    {tx('Keine Verbindung — deine Eingaben sind gesichert.')}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {tx('Ist die Veranstaltung voll, kommst du auf die Warteliste.')}
                </p>
                <Button type="submit" className="w-full sm:w-auto" disabled={submit.submitting}>
                  {submit.submitting ? tx('Wird gesendet …') : tx('Anmelden')}
                </Button>
              </form>
            )}
          </div>

          <footer className="-mx-5 sm:-mx-8 -mb-5 sm:-mb-8 border-t bg-muted/50 px-5 sm:px-8 py-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
            <a href="https://www.living-apps.de/impressum" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">
              {tx('Impressum')}
            </a>
            <a href="https://www.living-apps.de/datenschutz" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">
              {tx('Datenschutz')}
            </a>
          </footer>
        </div>
      </>
    );
  }

  return (
    <div
      className="min-h-screen py-6 px-3 bg-cover bg-center bg-fixed"
      style={bgImg ? { backgroundImage: `url("${bgImg}")` } : undefined}
    >
      <div className="mx-auto max-w-2xl rounded-[27px] bg-card shadow-lg overflow-hidden">
        {content}
      </div>
    </div>
  );
}

export default function VeranstaltungAnmelden() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return (
    <PublicShell fullBleed>
      <Registration cfg={cfg} page={page} />
    </PublicShell>
  );
}
