'use client';

import Link from 'next/link';
import styles from '@/styles/Services.module.css';

const Services = () => {
  const services = [
    {
      id: 1,
      title: 'Skräddarsydda keramikkurser för företagsevent',
      description: `Letar ditt företag efter en unik och minnesvärd aktivitet?
Oavsett om ni planerar en kick-off, en teambuilding eller bara vill göra något kreativt tillsammans, erbjuder vi inspirerande keramikkurser som stärker gemenskapen och väcker skaparlusten.`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      link: '/contact',
      audience: ['Företag']
    },
    {
      id: 2,
      title: 'Privata event – skapa minnen tillsammans',
      description: `Letar du efter en minnesvärd aktivitet att göra tillsammans med vänner eller familj? Oavsett om ni firar en födelsedag, möhippa, svensexa eller bara vill hitta på något roligt tillsammans, är ett drejevent hos Studio Clay ett perfekt sätt att umgås och skapa tillsammans.
`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      link: '/contact',
      audience: ['Individuell', 'Företag']
    },
    {
      id: 3,
      title: 'Privatlektion i drejning för två – en kreativ stund att dela',
      description: `Vill du överraska din partner, vän eller dejt med något utöver det vanliga? Boka en exklusiv privatlektion i drejning – en lyxig, kreativ upplevelse bara för er två.
Under tre timmar får ni tillgång till vår studio och en erfaren keramiker som vägleder er genom varje steg vid drejskivan.`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      link: '/contact',
      audience: ['Individuell', 'Företag']
    }
  ];

  return (
    <section id="services" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Specialkurser</h2>
          <p className={styles.description}>
            Vi erbjuder kreativa keramikupplevelser för både privatpersoner och företag.
          </p>
        </div>

        <div className={styles.servicesGrid}>
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services; 