'use client';

import Link from 'next/link';
import { ArrowRight, Buildings, UsersThree } from '@phosphor-icons/react';
import styles from '@/styles/Services.module.css';

const Services = () => {
  const services = [
    {
      id: 1,
      title: 'Skräddarsydda keramikkurser för företag',
      description: `Letar ert företag efter en unik och minnesvärd aktivitet?
Oavsett om ni planerar en kick-off, en teambuilding eller bara vill göra något kreativt tillsammans, erbjuder vi inspirerande keramikkurser som stärker gemenskapen och väcker skaparlusten.`,
      icon: <Buildings size={32} weight="duotone" />,
      link: '/contact',
      audience: ['Företag']
    },
    {
      id: 2,
      title: 'Keramik för grupper',
      description: `Boka studion för en grupp som vill skapa tillsammans. Vi skräddarsyr upplägget efter er — föreningar, kompisgäng, klasser eller andra grupper som vill dreja, umgås och ta med sig något hem.`,
      icon: <UsersThree size={32} weight="duotone" />,
      link: '/contact',
      audience: ['Grupper']
    }
  ];

  return (
    <section id="services" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection} data-reveal>
          <h2 className={styles.title}>Specialkurser</h2>
          <p className={styles.description}>
            Vi skräddarsyr keramikupplevelser för företag och grupper.
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
              <Link href={service.link} className={styles.serviceLink}>
                Kontakta mig
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
