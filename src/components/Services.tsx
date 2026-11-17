'use client';

import { useEffect, useState } from 'react';
import { Buildings, PaperPlaneTilt, UsersThree } from '@phosphor-icons/react';
import emailjs from '@emailjs/browser';
import { emailConfig } from '@/config/email';
import styles from '@/styles/Services.module.css';

const Services = () => {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const services = [
    {
      id: 1,
      title: 'Skräddarsydda keramikkurser för företag',
      description: `Letar ert företag efter en unik och minnesvärd aktivitet?
Oavsett om ni planerar en kick-off, en teambuilding eller bara vill göra något kreativt tillsammans, erbjuder vi inspirerande keramikkurser som stärker gemenskapen och väcker skaparlusten.`,
      icon: <Buildings size={32} weight="duotone" />,
      audience: ['Företag']
    },
    {
      id: 2,
      title: 'Keramik för grupper',
      description: `Boka studion för en grupp som vill skapa tillsammans. Jag skräddarsyr upplägget efter er — föreningar, kompisgäng, klasser eller andra grupper som vill dreja, umgås och ta med sig något hem.`,
      icon: <UsersThree size={32} weight="duotone" />,
      audience: ['Grupper']
    }
  ];

  useEffect(() => {
    emailjs.init(emailConfig.publicKey);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const message = `Ny förfrågan om specialkurs\n\nE-post: ${email}\n\nBeskrivning av event:\n${description}`;

    emailjs
      .send(
        emailConfig.serviceId,
        emailConfig.templateId,
        {
          to_email: emailConfig.recipientEmail,
          to_name: 'Studio Clay',
          from_name: email,
          from_email: email,
          reply_to: email,
          email,
          event_type: 'Specialkurs',
          message,
          subject: 'Ny förfrågan om specialkurs'
        },
        { publicKey: emailConfig.publicKey }
      )
      .then(() => {
        setIsSubmitting(false);
        setSubmitted(true);
        setEmail('');
        setDescription('');
      })
      .catch(() => {
        setIsSubmitting(false);
        setError('Det gick inte att skicka just nu. Försök igen om en stund.');
      });
  };

  return (
    <section id="services" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection} data-reveal>
          <h2 className={styles.title}>Anpassade event</h2>
          <p className={styles.description}>
            Jag skräddarsyr keramikupplevelser för företag och grupper.
          </p>
        </div>

        <div className={styles.servicesGrid} data-reveal-stagger>
          {services.map((service) => (
            <div key={service.id} className={styles.serviceCard}>
              <div className={styles.serviceContent}>
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceDesc}>{service.description}</p>
                <div className={styles.audienceTags}>
                  {service.audience.map((type) => (
                    <span key={type} className={styles.audienceTag}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.inquiry} data-reveal>
          <h3 className={styles.inquiryTitle}>Hör av dig</h3>
          <p className={styles.inquiryText}>
            Jag skräddarsyr upplägget efter er grupp och återkommer med ett förslag.
          </p>

          {submitted ? (
            <div className={styles.success} role="status">
              <p className={styles.successTitle}>Tack för din förfrågan</p>
              <p className={styles.successText}>Vi hör av oss så snart vi kan.</p>
            </div>
          ) : (
            <form className={styles.formCard} onSubmit={handleSubmit}>
              {error && (
                <p className={styles.formError} role="alert">
                  {error}
                </p>
              )}
              <label className={styles.field}>
                <span className={styles.label}>E-post</span>
                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="du@foretag.se"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Beskriv ditt event</span>
                <textarea
                  className={styles.textarea}
                  name="description"
                  required
                  rows={5}
                  placeholder="T.ex. kick-off för 12 personer i mars, eller en kväll för kompisgänget."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSubmitting}
                />
              </label>
              <button className={styles.submit} type="submit" disabled={isSubmitting}>
                <PaperPlaneTilt size={16} weight="fill" />
                {isSubmitting ? 'Skickar...' : 'Skicka'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
