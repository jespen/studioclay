interface TemplateData {
  [key: string]: any;
}

const templates = {
  payment_confirmation: (data: TemplateData) => `
    <h1>Betalningsbekräftelse - Studio Clay</h1>
    <p>Tack för din betalning!</p>
    <p>Betalningsreferens: ${data.payment_reference}</p>
    <p>Belopp: ${data.amount}</p>
    <hr>
    <p>Med vänliga hälsningar,<br>Studio Clay</p>
  `,

  gift_card: (data: TemplateData) => `
    <h1>Ditt presentkort från Studio Clay</h1>
    <p>Grattis till ditt presentkort!</p>
    <p>Presentkortskod: ${data.code}</p>
    <p>Belopp: ${data.amount}</p>
    <p>Giltigt till: ${data.expires_at}</p>
    ${data.message ? `<p>Meddelande: ${data.message}</p>` : ''}
    <hr>
    <p>Med vänliga hälsningar,<br>Studio Clay</p>
  `,

  course_booking: (data: TemplateData) => `
    <h1>Bokningsbekräftelse - ${data.course_title}</h1>
    <p>Tack för din bokning!</p>
    <p>Kurs: ${data.course_title}</p>
    <p>Datum: ${data.start_date}</p>
    <p>Antal deltagare: ${data.number_of_participants}</p>
    <p>Bokningsreferens: ${data.booking_reference}</p>
    <hr>
    <p>Välkommen till Studio Clay!</p>
    <p>Med vänliga hälsningar,<br>Eva</p>
  `,

  art_order: (data: TemplateData) => `
    <h1>Orderbekräftelse - Studio Clay</h1>
    <p>Tack för din beställning!</p>
    <p>Produkt: ${data.product_title}</p>
    <p>Orderreferens: ${data.order_reference}</p>
    <p>Din order kan hämtas i Studio Clay, Norrtullsgatan 65.</p>
    <hr>
    <p>Med vänliga hälsningar,<br>Eva</p>
  `
};

export async function renderTemplate(templateName: keyof typeof templates, data: TemplateData): Promise<string> {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }

  const baseTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #1a1a1a;
            margin-bottom: 20px;
          }
          hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        ${template(data)}
      </body>
    </html>
  `;

  return baseTemplate;
} 