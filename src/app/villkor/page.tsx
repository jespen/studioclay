'use client';

import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/styles/Legal.module.css';

export const metadata: Metadata = {
  title: 'Bokningsvillkor | Studio Clay',
  description: 'Våra allmänna bokningsvillkor beskriver de regler och riktlinjer som gäller för bokning av kurser och tjänster hos Studio Clay.',
};

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Bokningsvillkor</h1>
      <div className="prose prose-lg max-w-none">
        <p className="mb-4">
          <strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Allmänt</h2>
        <p>
          Dessa bokningsvillkor gäller för alla bokningar av kurser och tjänster hos Studio Clay. 
          Genom att boka en kurs eller tjänst hos oss accepterar du dessa villkor.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Bokning</h2>
        <p>
          Bokning av våra kurser sker via vår webbplats. Din bokning är bindande när du har bekräftat den och slutfört betalningen 
          eller valt fakturabetalning. Efter genomförd bokning skickas en bekräftelse till den e-postadress du angivit.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Betalning</h2>
        <p>Vi erbjuder följande betalningsalternativ:</p>
        <ul className="list-disc pl-8 my-4">
          <li><strong>Swish:</strong> Betalning sker direkt efter att bokningen har bekräftats.</li>
          <li><strong>Faktura:</strong> Faktura skickas till din e-postadress med 10 dagars betalningsvillkor.</li>
        </ul>
        <p>
          Alla priser är angivna i svenska kronor (SEK) och inkluderar moms. 
          Din plats är inte garanterad förrän full betalning har mottagits.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Avbokning och ombokning</h2>
        <p>Följande regler gäller för avbokning:</p>
        <ul className="list-disc pl-8 my-4">
          <li>Vid avbokning mer än 14 dagar före kursstart återbetalas hela kursavgiften.</li>
          <li>Vid avbokning 7-14 dagar före kursstart återbetalas 50% av kursavgiften.</li>
          <li>Vid avbokning mindre än 7 dagar före kursstart sker ingen återbetalning.</li>
          <li>Vid sjukdom kan du boka om till ett annat kurstillfälle i mån av plats om du uppvisar läkarintyg.</li>
        </ul>
        <p>
          Avbokning ska ske skriftligt via e-post till eva@studioclay.se. 
          Ombokning till annat kurstillfälle kan ske i mån av plats och måste göras senast 7 dagar före kursstart.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Inställda kurser</h2>
        <p>
          Vi förbehåller oss rätten att ställa in kurser vid för få anmälda deltagare eller av andra oförutsedda anledningar. 
          Vid inställd kurs erbjuds du antingen ombokning till annat kurstillfälle eller full återbetalning av kursavgiften.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Kursmaterial och utrustning</h2>
        <p>
          Allt nödvändigt material och lera ingår i kursavgiften om inte annat anges i kursbeskrivningen. 
          Du förväntas följa de säkerhetsföreskrifter som gäller i vår studio.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Ansvar</h2>
        <p>
          Studio Clay ansvarar inte för personliga tillhörigheter som tas med till studion. 
          Vi ansvarar inte för skador på kläder eller andra personliga tillhörigheter som kan uppstå under kursens gång. 
          Vi rekommenderar därför att du bär arbetskläder som tål att bli smutsiga.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Ändringar av villkor</h2>
        <p>
          Vi förbehåller oss rätten att ändra dessa bokningsvillkor. 
          Eventuella ändringar kommer att publiceras på vår webbplats.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Kontakt</h2>
        <p>
          Vid frågor om dessa bokningsvillkor eller din bokning, vänligen kontakta oss på eva@studioclay.se 
          eller ring 08-123 45 67.
        </p>
      </div>
      <Link href="/" className={styles.backButton}>
        Tillbaka till startsidan
      </Link>
    </main>
  );
} 