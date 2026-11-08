/**
 * Person von der Warteliste aktivieren — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Person auf der Warteliste wählen → 3) Prüfen & auf angemeldet setzen.
 * Reads: veranstaltungen (über flow.port), anmeldungen (Pick + Platzzähler). Writes: anmeldungen (status=angemeldet, update).
 * Composes: IntentWizardShell, EntitySelectStep, BudgetTracker, StepNav, SummaryStep, SuccessStep.
 */
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import type { SelectItem } from '@/components/blocks/EntitySelectStep';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  fieldText, fieldNumber, fieldDate, fieldLookup, fieldRef,
  useLiveList, useRecordCount, combineFilters, refFilter,
} from '@/lib/journey';
import { useWartelisteAktivierenFlow } from '@/lib/journey/flows/WartelisteAktivieren';
import { tx } from '@/i18n';

function dateText(iso: string | null): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm');
  } catch {
    return iso;
  }
}

export default function WartelisteAktivierenPage() {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);

  const flow = useWartelisteAktivierenFlow({
    steps: { anmeldungen: 2 },
    items: {
      anmeldungen: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
    where: {
      anmeldungen: r =>
        (!eventId || fieldRef(r, 'veranstaltung') === eventId) && fieldLookup(r, 'status')?.key === 'warteliste',
    },
  });

  const events = useLiveList(flow.port, 'veranstaltungen', { intervalMs: 0 });

  const eventItems: SelectItem[] = useMemo(
    () =>
      events.records.map(e => ({
        id: e.id,
        title: fieldText(e, 'titel'),
        subtitle: dateText(fieldDate(e, 'datum')),
        stats: [{ label: tx('Plätze'), value: fieldNumber(e, 'max_teilnehmer') ?? '—' }],
      })),
    [events.records],
  );

  const eventRecord = events.records.find(e => e.id === eventId);
  const maxPlaetze = eventRecord ? fieldNumber(eventRecord, 'max_teilnehmer') ?? 0 : 0;

  const belegt = useRecordCount(flow.port, 'anmeldungen', {
    filter: eventId ? combineFilters(refFilter('veranstaltung', eventId), tx('r.v_status == \'angemeldet\'')) : undefined,
    where: r => fieldRef(r, 'veranstaltung') === eventId && fieldLookup(r, 'status')?.key === 'angemeldet',
    enabled: Boolean(eventId),
  });

  return (
    <IntentWizardShell
      title={tx('Person von der Warteliste aktivieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Setze eine Person von der Warteliste auf angemeldet, sobald ein Platz frei ist.'),
        needs: [tx('Die Veranstaltung'), tx('Name der Person auf der Warteliste')],
      }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung wird ein Platz frei?')}>
        <EntitySelectStep
          items={eventItems}
          loading={events.loading && !events.loaded}
          error={events.error ? events.error.message : null}
          create={false}
          selectedId={eventId}
          searchPlaceholder={tx('Veranstaltung suchen …')}
          emptyText={tx('Es gibt noch keine Veranstaltung.')}
          onSelect={id => { setEventId(id); setStep(2); }}
        />
      </WizardStep>

      <WizardStep label={tx('Person')} description={tx('Wer von der Warteliste soll einen Platz bekommen?')}>
        {eventId ? (
          <div className="space-y-4">
            {maxPlaetze > 0 && belegt.count !== null && (
              <BudgetTracker
                format="count"
                unit={tx('Plätze')}
                budget={maxPlaetze}
                booked={belegt.count}
                label={tx('Auslastung der Veranstaltung')}
              />
            )}
            <EntitySelectStep
              {...flow.picks.anmeldungen.select}
              {...flow.pick('anmeldungen')}
              avatar="initials"
              searchPlaceholder={tx('Name oder E-Mail …')}
              emptyText={tx('Für diese Veranstaltung wartet niemand auf einen Platz.')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled hideBack={false}>
            {tx('Dieser Schritt braucht die Veranstaltung aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>

      <WizardStep label={tx('Aktivieren')} description={tx('Prüfe die Angaben und setze die Person auf angemeldet.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Neuer Status'), value: tx('Angemeldet') }]}
            whatHappensNext={tx('Die Person zählt ab sofort zu den angemeldeten Teilnehmenden und belegt einen Platz.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          next={[
            { label: tx('Weitere Person aktivieren'), onClick: () => { flow.reset(); setEventId(null); setStep(1); } },
            { label: tx('Anmeldung absagen'), href: '#/intents/anmeldung-absagen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
