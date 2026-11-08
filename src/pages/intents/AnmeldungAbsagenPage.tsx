/**
 * Anmeldung absagen — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Angemeldete Person wählen → 3) Absage bestätigen.
 * Reads: veranstaltungen, anmeldungen. Writes: anmeldungen (status = abgesagt, via useAnmeldungAbsagenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import type { SelectItem } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldLookup, fieldRef, useLiveList } from '@/lib/journey';
import { useAnmeldungAbsagenFlow } from '@/lib/journey/flows/AnmeldungAbsagen';
import { tx } from '@/i18n';

export default function AnmeldungAbsagenPage() {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventLabel, setEventLabel] = useState<string>('');

  const flow = useAnmeldungAbsagenFlow({
    steps: { anmeldungen: 2 },
    items: {
      anmeldungen: r => {
        const status = fieldLookup(r, 'status');
        return {
          id: r.id,
          title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
          subtitle: fieldText(r, 'email'),
          status: status ?? undefined,
        };
      },
    },
    where: {
      anmeldungen: r => Boolean(eventId) && fieldRef(r, 'veranstaltung') === eventId && fieldLookup(r, 'status')?.key !== 'abgesagt',
    },
  });

  const events = useLiveList(flow.port, 'veranstaltungen', { intervalMs: 0 });

  const eventItems = useMemo<SelectItem[]>(
    () =>
      events.records.map(r => {
        const datum = fieldDate(r, 'datum');
        let when = '';
        if (datum) {
          try {
            when = format(parseISO(datum), 'dd.MM.yyyy HH:mm');
          } catch {
            when = datum;
          }
        }
        return {
          id: r.id,
          title: fieldText(r, 'titel'),
          subtitle: [when, fieldText(r, 'ort')].filter(Boolean).join(' · '),
        };
      }),
    [events.records],
  );

  const restart = () => {
    flow.reset();
    setEventId(null);
    setEventLabel('');
    setStep(1);
  };

  return (
    <IntentWizardShell
      title={tx('Anmeldung absagen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Eine Person von einer Veranstaltung abmelden und den Platz freigeben.'), needs: [tx('Name der Veranstaltung'), tx('Name der angemeldeten Person')] }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung soll eine Anmeldung abgesagt werden?')}>
        <EntitySelectStep
          items={eventItems}
          loading={events.loading && !events.loaded}
          error={events.error ? events.error.message : null}
          selectedId={eventId}
          searchPlaceholder={tx('Titel oder Ort …')}
          emptyText={tx('Es gibt noch keine Veranstaltung.')}
          onSelect={id => {
            setEventId(id);
            setEventLabel(eventItems.find(i => i.id === id)?.title ?? '');
            setStep(2);
          }}
        />
      </WizardStep>
      <WizardStep label={tx('Person')} description={tx('Welche angemeldete Person sagt ab?')}>
        {eventId ? (
          <EntitySelectStep
            {...flow.picks.anmeldungen.select}
            {...flow.pick('anmeldungen')}
            avatar="initials"
            searchPlaceholder={tx('Name oder E-Mail …')}
            emptyText={tx('Für diese Veranstaltung gibt es keine Anmeldung, die noch abgesagt werden kann.')}
          />
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl der Veranstaltung aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Bestätigen')} description={tx('Prüfe die Absage, bevor du sie speicherst.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              ...(eventLabel ? [{ key: 'veranstaltung', label: tx('Veranstaltung'), value: eventLabel }] : []),
              { key: 'neuer-status', label: tx('Neuer Status'), value: tx('Abgesagt') },
            ]}
            confirmLabel={tx('Absage bestätigen')}
            whatHappensNext={tx('Der Platz wird frei und kann danach von der Warteliste vergeben werden.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          title={tx('Anmeldung abgesagt')}
          whatHappensNext={tx('Der Platz ist frei. Du kannst ihn jetzt von der Warteliste vergeben.')}
          next={[
            { label: tx('Person von der Warteliste aktivieren'), href: '#/intents/warteliste-aktivieren' },
            { label: tx('Weitere Absage'), onClick: restart },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
