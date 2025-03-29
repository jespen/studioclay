import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integritetspolicy | Studio Clay',
  description: 'Vår integritetspolicy beskriver hur vi samlar in, använder och skyddar din information när du besöker vår webbplats och använder våra tjänster.',
};

export default function PrivacyPolicy() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Integritetspolicy</h1>
      <div className="prose prose-lg max-w-none">
        <p className="mb-4">
          <strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduktion</h2>
        <p>
          Välkommen till Studio Clay. Din integritet är viktig för oss. Denna integritetspolicy förklarar vilka personuppgifter vi samlar in och hur vi använder dem när du besöker vår webbplats (studioclay.se) eller använder våra tjänster.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information vi samlar in</h2>
        <p>Vi kan samla in följande typer av information:</p>
        <ul className="list-disc pl-8 my-4">
          <li>
            <strong>Personuppgifter:</strong> När du bokar en kurs eller kontaktar oss kan vi samla in ditt namn, e-postadress, telefonnummer och annan kontaktinformation.
          </li>
          <li>
            <strong>Betalningsinformation:</strong> Om du köper en presentkort eller betalar för en kurs, samlar vi in nödvändig betalningsinformation. Vi lagrar dock inte fullständiga kreditkortsuppgifter på våra servrar.
          </li>
          <li>
            <strong>Automatiskt insamlad information:</strong> När du besöker vår webbplats kan vi automatiskt samla in teknisk information som IP-adress, webbläsartyp, enhetsinformation och interaktionsdata med vår webbplats.
          </li>
          <li>
            <strong>Sociala medier:</strong> Vår webbplats visar innehåll från vårt Instagram-konto. Vi använder Instagram API för att visa detta innehåll. Vi samlar inte in personuppgifter när du enbart tittar på detta innehåll.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Hur vi använder din information</h2>
        <p>Vi använder den insamlade informationen för följande ändamål:</p>
        <ul className="list-disc pl-8 my-4">
          <li>Att tillhandahålla och förbättra våra tjänster</li>
          <li>Att behandla bokningar och betalningar</li>
          <li>Att kommunicera med dig angående bokningar, kurser och andra förfrågningar</li>
          <li>Att förbättra vår webbplats och användarupplevelse</li>
          <li>Att följa lagliga och regulatoriska krav</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Delning av information</h2>
        <p>Vi delar inte dina personuppgifter med tredje parter förutom i följande fall:</p>
        <ul className="list-disc pl-8 my-4">
          <li>Med betaltjänstleverantörer för att behandla betalningar</li>
          <li>Med bokningssystemleverantörer för att hantera kursbokningar</li>
          <li>Om det krävs enligt lag eller för att skydda våra rättigheter</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Sociala medier och tredjepartstjänster</h2>
        <p>
          Vår webbplats visar innehåll från vårt Instagram-konto genom Instagram API. När du interagerar med detta innehåll kan Instagram samla in information om dig enligt deras egen integritetspolicy. Vi uppmuntrar dig att läsa Instagram och Facebooks integritetspolicyer för att förstå hur de behandlar dina personuppgifter.
        </p>
        <p>
          <strong>Instagram/Facebook integritetspolicy:</strong>{' '}
          <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            https://www.facebook.com/privacy/policy/
          </a>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Cookies och spårningstekniker</h2>
        <p>
          Vi använder cookies och liknande spårningstekniker för att förbättra din upplevelse på vår webbplats. Dessa tekniker hjälper oss att förstå hur besökare använder vår webbplats och gör att vi kan komma ihåg dina preferenser.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Dina rättigheter</h2>
        <p>Beroende på din plats kan du ha följande rättigheter:</p>
        <ul className="list-disc pl-8 my-4">
          <li>Rätt att få tillgång till dina personuppgifter</li>
          <li>Rätt att korrigera felaktiga personuppgifter</li>
          <li>Rätt att begära radering av dina personuppgifter</li>
          <li>Rätt att begränsa behandlingen av dina personuppgifter</li>
          <li>Rätt att invända mot behandling av dina personuppgifter</li>
          <li>Rätt till dataportabilitet</li>
        </ul>
        <p>
          För att utöva dessa rättigheter, vänligen kontakta oss via kontaktinformationen nedan.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Datasäkerhet</h2>
        <p>
          Vi vidtar rimliga säkerhetsåtgärder för att skydda dina personuppgifter från obehörig åtkomst, förlust och missbruk. Trots våra ansträngningar kan ingen metod för överföring av information över internet eller elektronisk lagring vara helt säker.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Barn</h2>
        <p>
          Vår webbplats är inte avsedd för barn under 16 år, och vi samlar inte medvetet in personuppgifter från barn under 16 år. Om du tror att vi har samlat in personuppgifter från ett barn under 16 år, kontakta oss omedelbart.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Ändringar i denna integritetspolicy</h2>
        <p>
          Vi kan uppdatera denna integritetspolicy från tid till annan. Om vi gör väsentliga ändringar kommer vi att meddela dig genom att publicera den nya integritetspolicyn på vår webbplats. Vi uppmuntrar dig att regelbundet granska denna integritetspolicy för att hålla dig informerad om hur vi skyddar din information.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Kontakta oss</h2>
        <p>
          Om du har frågor eller funderingar angående denna integritetspolicy eller behandlingen av dina personuppgifter, vänligen kontakta oss på:
        </p>
        <p className="my-4">
          <strong>Studio Clay</strong><br />
          E-post: eva@studioclay.se<br />
          Adress: [Din studioaddress]<br />
        </p>
      </div>
    </main>
  );
} 