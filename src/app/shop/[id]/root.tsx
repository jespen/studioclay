/**
 * Shop Checkout Flow
 * 
 * Detta är dokumentation för checkout-flödet i shopen.
 * 
 * Flödet för produktköp (ART_PURCHASE) fungerar på följande sätt:
 * 
 * 1. Från Shop-sidan:
 *    - När användaren klickar på "KÖP" på en produkt, sparas produktdetaljer 
 *      direkt via saveItemDetails och användaren skickas till personal-info steget.
 *    - Detta innebär att vi hoppar över ITEM_SELECTION steget i flödet.
 * 
 * 2. Användarinformation (/shop/[id]/personal-info):
 *    - Användaren fyller i sina personuppgifter
 *    - Produktinformation visas som en sammanfattning överst på sidan
 * 
 * 3. Betalning (/shop/[id]/payment):
 *    - Användaren väljer betalningsmetod (Swish eller faktura)
 *    - Produktinformation visas som en sammanfattning överst på sidan
 * 
 * 4. Bekräftelse (/shop/[id]/confirmation):
 *    - Användaren får en bekräftelse på sin beställning
 *    - Alla orderdetaljer visas tillsammans med produktinformation
 * 
 * FlowStepWrapper ansvarar för att hantera data mellan stegen och stegindikatorn
 * visar användaren var i flödet de befinner sig.
 */

// Detta är bara en dokumentationsfil och behöver inte exportera något
export {}; 