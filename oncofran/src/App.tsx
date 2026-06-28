import { FormEvent, useMemo, useState } from 'react'
import { gooeyToast } from 'goey-toast'

type Lang = 'es' | 'en'

type Doctor = {
  name: string
  specialties: string[]
  email: string
}

const PORTRAIT_URL = 'https://fguadarrama.com/Portrait_nbg.png'

const doctors: Doctor[] = [
  {
    name: 'Dra. Gabriela Garza García',
    specialties: ['Endocrinología', 'Medicina interna'],
    email: 'dra.gabrielagarza@gmail.com',
  },
]

const copy = {
  es: {
    nav: {
      bio: 'Biografía',
      contact: 'Contacto',
      faq: 'Preguntas frecuentes',
      doctors: 'Médicos recomendados',
    },
    hero: {
      eyebrow: 'Oncología médica · Medicina interna',
      title: 'Tratamiento oncológico centrado en usted',
      subtitle:
        'Acompañamiento médico claro, ordenado y humano para pacientes con cáncer y sus familias, desde la valoración inicial hasta la coordinación de decisiones terapéuticas.',
      primary: 'Agendar cita',
      secondary: 'Solicitar informe médico',
      badgeOne: 'Medicina interna',
      badgeTwo: 'Oncología médica',
      availability: 'Atención presencial con coordinación documental para aseguradoras.',
    },
    bio: {
      title: 'Biografía',
      kicker: 'Francisco Guadarrama',
      paragraphs: [
        'Médico especialista en Medicina Interna y actualmente residente de último año de Oncología Médica. Su práctica integra la evaluación clínica general del paciente con cáncer, la explicación cuidadosa de opciones terapéuticas y la coordinación de atención con otros especialistas.',
        'Cuenta con experiencia de liderazgo en centros nacionales de referencia y en sistemas de salud que atienden poblaciones en situación de marginación extrema. Su trabajo se ha enfocado en acceso a tratamientos oncológicos de alto costo, toma de decisiones basadas en valor y fortalecimiento de sistemas de salud en países de ingresos bajos y medios.',
        'Para pacientes y familias, su objetivo es traducir información compleja en planes comprensibles, documentados y clínicamente razonados.',
      ],
    },
    contact: {
      title: 'Contacto',
      intro:
        'Use estos formularios para dejar una solicitud inicial. La confirmación de horarios, requisitos documentales y modalidad de atención se realiza posteriormente por correo o teléfono.',
      locationTitle: 'Consultorio',
      location:
        'Torre Médica Borogovial. Avenida de las Maravillas # 14, Colonia Literaria. Querétaro, Querétaro.',
      appointmentTitle: 'Agendar cita',
      appointmentDescription:
        'Para primera valoración, seguimiento oncológico, segunda opinión o revisión de estudios.',
      reportTitle: 'Informes médicos para aseguradoras',
      reportDescription:
        'Solicitud de resúmenes médicos, informes de tratamiento o documentación clínica para trámites con aseguradoras.',
      labels: {
        name: 'Nombre del paciente',
        contact: 'Correo o teléfono',
        reason: 'Motivo de consulta',
        time: 'Horario preferido',
        insurer: 'Aseguradora',
        policy: 'Póliza o referencia',
        notes: 'Documento requerido',
        submitAppointment: 'Enviar solicitud de cita',
        submitReport: 'Enviar solicitud de informe',
      },
      placeholders: {
        reason: 'Ej. primera valoración, segunda opinión, seguimiento',
        time: 'Ej. martes por la tarde',
        insurer: 'Ej. aseguradora y número de caso, si aplica',
        policy: 'Ej. número de póliza o siniestro',
        notes: 'Ej. informe médico, resumen clínico, carta para reembolso',
      },
      toastAppointmentTitle: 'Solicitud de cita registrada',
      toastAppointmentDescription:
        'Este mockup simula la confirmación. Después puede conectarse a correo, Forms, Calendly o un backend.',
      toastReportTitle: 'Solicitud de informe registrada',
      toastReportDescription:
        'La notificación usa goey-toast con preset bouncy.',
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          q: '¿Qué debo llevar a la primera consulta?',
          a: 'Identificación, lista de medicamentos, estudios de imagen recientes, resultados de patología, reportes de laboratorio y notas médicas relevantes. Si cuenta con expediente digital, es preferible llevarlo organizado por fecha.',
        },
        {
          q: '¿Se pueden revisar estudios antes de la cita?',
          a: 'Sí. Este sitio puede adaptarse para recibir documentos de forma segura antes de la valoración. En esta versión inicial sólo se muestra el flujo de solicitud.',
        },
        {
          q: '¿Puedo solicitar una segunda opinión?',
          a: 'Sí. La segunda opinión suele requerir diagnóstico histopatológico, etapa clínica, tratamientos previos y estudios de imagen disponibles.',
        },
        {
          q: '¿Los informes para aseguradora sustituyen una consulta?',
          a: 'No. Los informes documentan información clínica; la valoración médica requiere consulta y revisión directa de datos clínicos.',
        },
      ],
    },
    doctors: {
      title: 'Médicos recomendados',
      intro:
        'Directorio inicial de especialistas de confianza. Más adelante esta sección puede ampliarse con filtros por especialidad, nombre, ubicación y disponibilidad.',
      filter: 'Filtrar por nombre o especialidad',
      empty: 'No se encontraron médicos con ese filtro.',
      email: 'Correo',
    },
    footer: 'Sitio estático preparado para GitHub Pages. Contenido demostrativo; no sustituye una valoración médica.',
  },
  en: {
    nav: {
      bio: 'Biography',
      contact: 'Contact',
      faq: 'FAQ',
      doctors: 'Recommended physicians',
    },
    hero: {
      eyebrow: 'Medical oncology · Internal medicine',
      title: 'Cancer care centered on the patient',
      subtitle:
        'Clear, structured medical guidance for people with cancer and their families, from initial assessment to coordinated treatment decisions.',
      primary: 'Schedule appointment',
      secondary: 'Request medical report',
      badgeOne: 'Internal medicine',
      badgeTwo: 'Medical oncology',
      availability: 'In-person care with document coordination for insurance processes.',
    },
    bio: {
      title: 'Biography',
      kicker: 'Francisco Guadarrama',
      paragraphs: [
        'Physician and Internal Medicine specialist, currently in the final year of Medical Oncology training. His practice integrates broad clinical assessment of patients with cancer, careful explanation of treatment options, and coordination with other specialists.',
        'He has leadership experience in national referral centers and health systems serving populations under severe resource constraints. His work has focused on access to high-cost cancer treatments, value-based decision-making, and health-system strengthening in low- and middle-income countries.',
        'For patients and families, his goal is to translate complex information into understandable, documented and clinically reasoned plans.',
      ],
    },
    contact: {
      title: 'Contact',
      intro:
        'Use these forms to leave an initial request. Schedule confirmation, documentation requirements and visit modality are later confirmed by email or phone.',
      locationTitle: 'Office',
      location:
        'Torre Médica Borogovial. Avenida de las Maravillas # 14, Colonia Literaria. Querétaro, Querétaro.',
      appointmentTitle: 'Schedule an appointment',
      appointmentDescription:
        'For first visit, oncology follow-up, second opinion or study review.',
      reportTitle: 'Medical reports for insurance',
      reportDescription:
        'Request treatment summaries, medical reports or clinical documentation for insurance processes.',
      labels: {
        name: 'Patient name',
        contact: 'Email or phone',
        reason: 'Reason for visit',
        time: 'Preferred time',
        insurer: 'Insurance provider',
        policy: 'Policy or reference',
        notes: 'Required document',
        submitAppointment: 'Send appointment request',
        submitReport: 'Send report request',
      },
      placeholders: {
        reason: 'E.g. first visit, second opinion, follow-up',
        time: 'E.g. Tuesday afternoon',
        insurer: 'E.g. insurer and case number, if applicable',
        policy: 'E.g. policy or claim number',
        notes: 'E.g. medical report, clinical summary, reimbursement letter',
      },
      toastAppointmentTitle: 'Appointment request recorded',
      toastAppointmentDescription:
        'This mockup simulates confirmation. It can later be connected to email, Forms, Calendly or a backend.',
      toastReportTitle: 'Medical report request recorded',
      toastReportDescription:
        'The notification uses goey-toast with the bouncy preset.',
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          q: 'What should I bring to the first visit?',
          a: 'Identification, medication list, recent imaging studies, pathology results, laboratory reports and relevant clinical notes. A digital file organized by date is preferred when available.',
        },
        {
          q: 'Can my studies be reviewed before the appointment?',
          a: 'Yes. This site can later be adapted to receive documents securely before the visit. This initial version only shows the request flow.',
        },
        {
          q: 'Can I request a second opinion?',
          a: 'Yes. A second opinion usually requires pathology diagnosis, clinical stage, previous treatments and available imaging studies.',
        },
        {
          q: 'Do insurance reports replace a medical visit?',
          a: 'No. Reports document clinical information; medical assessment requires a visit and direct review of clinical data.',
        },
      ],
    },
    doctors: {
      title: 'Recommended physicians',
      intro:
        'Initial directory of trusted specialists. This section can later include filters by specialty, name, location and availability.',
      filter: 'Filter by name or specialty',
      empty: 'No physicians matched that filter.',
      email: 'Email',
    },
    footer: 'Static site prepared for GitHub Pages. Demonstration content; it does not replace medical assessment.',
  },
}

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'es'
  const stored = window.localStorage.getItem('oncology-site-lang')
  if (stored === 'es' || stored === 'en') return stored
  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

function App() {
  const [lang, setLang] = useState<Lang>(getInitialLang)
  const [doctorQuery, setDoctorQuery] = useState('')
  const t = copy[lang]

  const filteredDoctors = useMemo(() => {
    const query = doctorQuery.trim().toLowerCase()
    if (!query) return doctors

    return doctors.filter((doctor) => {
      const haystack = `${doctor.name} ${doctor.specialties.join(' ')}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [doctorQuery])

  function toggleLang() {
    const nextLang: Lang = lang === 'es' ? 'en' : 'es'
    setLang(nextLang)
    window.localStorage.setItem('oncology-site-lang', nextLang)
    document.documentElement.lang = nextLang
  }

  function handleAppointmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    gooeyToast.success(t.contact.toastAppointmentTitle, {
      description: t.contact.toastAppointmentDescription,
      preset: 'bouncy',
      duration: 5200,
      showProgress: true,
    })
    event.currentTarget.reset()
  }

  function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    gooeyToast.info(t.contact.toastReportTitle, {
      description: t.contact.toastReportDescription,
      preset: 'bouncy',
      duration: 5200,
      showProgress: true,
    })
    event.currentTarget.reset()
  }

  return (
    <div className="site-shell">
      <header className="site-header" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Inicio">
          <span className="brand-mark">FG</span>
          <span className="brand-text">Oncología</span>
        </a>
        <nav className="nav-links">
          <a href="#bio">{t.nav.bio}</a>
          <a href="#contact">{t.nav.contact}</a>
          <a href="#faq">{t.nav.faq}</a>
          <a href="#doctors">{t.nav.doctors}</a>
        </nav>
        <button className="lang-toggle" type="button" onClick={toggleLang} aria-label="Cambiar idioma">
          <span className={lang === 'en' ? 'active' : ''}>EN</span>
          <span className="toggle-track" aria-hidden="true">
            <span className="toggle-thumb" data-lang={lang} />
          </span>
          <span className={lang === 'es' ? 'active' : ''}>ES</span>
        </button>
      </header>

      <main id="top">
        <section className="hero section-grid" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h1 id="hero-title">{t.hero.title}</h1>
            <p className="hero-subtitle">{t.hero.subtitle}</p>
            <div className="hero-actions">
              <a className="button primary" href="#appointment-form">
                {t.hero.primary}
              </a>
              <a className="button secondary" href="#insurance-form">
                {t.hero.secondary}
              </a>
            </div>
            <div className="hero-note" role="note">
              <span />
              {t.hero.availability}
            </div>
          </div>

          <div className="portrait-card" aria-label="Portrait section">
            <div className="portrait-orbit" />
            <img className="portrait" src={PORTRAIT_URL} alt="Francisco Guadarrama" />
            <div className="portrait-badge one">{t.hero.badgeOne}</div>
            <div className="portrait-badge two">{t.hero.badgeTwo}</div>
            <svg className="scribble" viewBox="0 0 230 80" aria-hidden="true">
              <path d="M8 48 C 52 10, 79 77, 128 37 S 193 18, 222 60" />
            </svg>
          </div>
        </section>

        <section id="bio" className="section bio-section" aria-labelledby="bio-title">
          <div className="section-heading">
            <p className="eyebrow">{t.bio.kicker}</p>
            <h2 id="bio-title">{t.bio.title}</h2>
          </div>
          <div className="bio-card">
            <div className="bio-initial" aria-hidden="true">FG</div>
            <div>
              {t.bio.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section contact-section" aria-labelledby="contact-title">
          <div className="section-heading wide">
            <p className="eyebrow">{t.contact.locationTitle}</p>
            <h2 id="contact-title">{t.contact.title}</h2>
            <p>{t.contact.intro}</p>
          </div>

          <div className="location-card">
            <span className="location-icon" aria-hidden="true">⌖</span>
            <div>
              <h3>{t.contact.locationTitle}</h3>
              <p>{t.contact.location}</p>
            </div>
          </div>

          <div className="form-grid">
            <form id="appointment-form" className="request-card" onSubmit={handleAppointmentSubmit}>
              <div className="form-header">
                <span className="form-number">01</span>
                <div>
                  <h3>{t.contact.appointmentTitle}</h3>
                  <p>{t.contact.appointmentDescription}</p>
                </div>
              </div>
              <label>
                {t.contact.labels.name}
                <input name="patient-name" type="text" autoComplete="name" required />
              </label>
              <label>
                {t.contact.labels.contact}
                <input name="patient-contact" type="text" autoComplete="email" required />
              </label>
              <label>
                {t.contact.labels.time}
                <input name="preferred-time" type="text" placeholder={t.contact.placeholders.time} />
              </label>
              <label>
                {t.contact.labels.reason}
                <textarea name="reason" rows={4} placeholder={t.contact.placeholders.reason} required />
              </label>
              <button className="button primary full" type="submit">
                {t.contact.labels.submitAppointment}
              </button>
            </form>

            <form id="insurance-form" className="request-card" onSubmit={handleReportSubmit}>
              <div className="form-header">
                <span className="form-number">02</span>
                <div>
                  <h3>{t.contact.reportTitle}</h3>
                  <p>{t.contact.reportDescription}</p>
                </div>
              </div>
              <label>
                {t.contact.labels.name}
                <input name="report-patient-name" type="text" autoComplete="name" required />
              </label>
              <label>
                {t.contact.labels.contact}
                <input name="report-contact" type="text" autoComplete="email" required />
              </label>
              <label>
                {t.contact.labels.insurer}
                <input name="insurer" type="text" placeholder={t.contact.placeholders.insurer} required />
              </label>
              <label>
                {t.contact.labels.policy}
                <input name="policy" type="text" placeholder={t.contact.placeholders.policy} />
              </label>
              <label>
                {t.contact.labels.notes}
                <textarea name="report-notes" rows={4} placeholder={t.contact.placeholders.notes} required />
              </label>
              <button className="button primary full" type="submit">
                {t.contact.labels.submitReport}
              </button>
            </form>
          </div>
        </section>

        <section id="faq" className="section faq-section" aria-labelledby="faq-title">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title">{t.faq.title}</h2>
          </div>
          <div className="faq-list">
            {t.faq.items.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="doctors" className="section doctors-section" aria-labelledby="doctors-title">
          <div className="section-heading wide">
            <p className="eyebrow">Directorio</p>
            <h2 id="doctors-title">{t.doctors.title}</h2>
            <p>{t.doctors.intro}</p>
          </div>
          <div className="filter-bar">
            <input
              value={doctorQuery}
              onChange={(event) => setDoctorQuery(event.target.value)}
              type="search"
              placeholder={t.doctors.filter}
              aria-label={t.doctors.filter}
            />
          </div>
          <div className="doctor-grid">
            {filteredDoctors.map((doctor) => (
              <article className="doctor-card" key={doctor.email}>
                <span className="doctor-avatar" aria-hidden="true">
                  {doctor.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(1, 3)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <div>
                  <h3>{doctor.name}</h3>
                  <div className="specialty-list">
                    {doctor.specialties.map((specialty) => (
                      <span key={specialty}>{specialty}</span>
                    ))}
                  </div>
                  <p>
                    {t.doctors.email}:{' '}
                    <a href={`mailto:${doctor.email}`}>{doctor.email}</a>
                  </p>
                </div>
              </article>
            ))}
            {filteredDoctors.length === 0 && <p className="empty-state">{t.doctors.empty}</p>}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

export default App
