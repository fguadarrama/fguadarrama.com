const content = {
  es: {
    nav: ["Perfil", "Experiencia", "Formación", "Contacto"],
    sidebarNote: "Oncología · Medicina interna",
    profile: {
      eyebrow: "Médico · Oncología · Sistemas de salud",
      title: "Atención oncológica de alto valor, incluso cuando los recursos son limitados.",
      paragraphs: [
        "Soy un médico que atiende a personas con cáncer y persigue una pregunta concreta: cómo ofrecer tratamientos oncológicos de alto valor cuando los recursos son limitados.",
        "He trabajado en comunidades marginadas en las montañas de México y en centros médicos de alta especialidad. Ese recorrido orienta mi trabajo hacia la toma de decisiones clínicas bajo restricciones reales, la reducción de las brechas en el acceso a medicamentos y el fortalecimiento de los sistemas de salud."
      ]
    },
    experience: {
      eyebrow: "Trayectoria profesional",
      title: "Experiencia",
      entries: [
        ["Oncología Médica y Jefatura de Residentes", "Participo en la coordinación académica y la supervisión a residentes en un centro nacional de referencia. Participo en la atención multidisciplinaria de pacientes con cáncer, la toma de decisiones clínicas complejas y la planeación cotidiana de servicios y recursos."],
        ["Residente de Medicina Interna", "Completé mi residencia en Medicina Interna en un hospital universitario de tercer nivel y estuve en la primera línea de atención durante la pandemia de COVID-19."],
        ["Profesor clínico de Medicina Interna", "Supervisé y acompañé a estudiantes de medicina durante sus rotaciones hospitalarias. Coordiné su integración con los servicios clínicos y contribuí a mantener la calidad de su formación."],
        ["Enlace local de investigación — Compañeros en Salud / Harvard", "Colaboré como enlace local en un estudio liderado por la Escuela de Salud Pública de Harvard sobre consultas médicas grupales en una comunidad rural, facilitando la traducción, transcripción de entrevistas y la interpretación cultural de los hallazgos."],
        ["Asistente de investigación — Neuroquímica", "Trabajé directamente con modelos murinos en un proyecto de neuroquímica de posgrado, realizando evaluaciones conductuales mediante paradigmas de memoria en laberintos."],
        ["Médico rural", "Tuve la responsabilidad clínica y operativa de una clínica rural en las montañas de Chiapas. Brindé más de 3,100 consultas, dirigí campañas comunitarias y supervisé al personal local, manteniendo altos estándares de atención basada en evidencia a pesar de una profunda limitación de recursos."],
        ["Contratista independiente — Figure 1", "Traduje y adapté contenido clínico e interfaces digitales para usuarios hispanohablantes en una startup internacional de salud digital."],
        ["Instructor de Biología Tisular", "Diseñé prácticas de laboratorio y evaluaciones novedosas para estudiantes de medicina, además de facilitar la transición hacia la enseñanza híbrida y virtual."]
      ]
    },
    education: {
      eyebrow: "Formación académica",
      title: "Formación académica",
      entries: [
        ["Especialidad en Medicina Interna", "Especialista certificado por el Consejo Mexicano de Medicina Interna. Mi tesis examinó el impacto de la pandemia de COVID-19 en la atención de pacientes con tumores de células germinales en un hospital de tercer nivel."],
        ["Médico Cirujano", "Estudié la carrera con una beca por mérito académico, desarrollé mi práctica clínica en hospitales de alto volumen en las principales ciudades del país y completé una estancia médica internacional. Participé cotidianamente en brigadas de salud comunitaria."]
      ]
    },
    contact: {
      eyebrow: "Contacto",
      title: "Conversaciones sobre oncología, valor y acceso.",
      note: "Para colaboraciones académicas, investigación o conversaciones profesionales, puedes escribirme o contactarme en LinkedIn.",
      email: "Correo electrónico",
      linkedin: "LinkedIn"
    }
  },
  en: {
    nav: ["Profile", "Experience", "Education", "Contact"],
    sidebarNote: "Oncology · Internal medicine",
    profile: {
      eyebrow: "Physician · Oncology · Health systems",
      title: "High-value cancer care, even when resources are limited.",
      paragraphs: [
        "I am a physician who cares for people with cancer and is driven by a specific question: how can we deliver high-value cancer care when resources are limited?",
        "My work has taken me from marginalized communities in the mountains of Mexico to national referral centers. That path shapes my focus on clinical decision-making under real constraints, reducing gaps in access to costly medicines, and strengthening health systems."
      ]
    },
    experience: {
      eyebrow: "Professional trajectory",
      title: "Experience",
      entries: [
        ["Medical Oncology & Chief Residency", "I help coordinate academic training and supervision for junior residents at a national referral center. My work spans multidisciplinary cancer care, complex clinical decisions, and the day-to-day planning of services and resources."],
        ["Internal Medicine Resident", "I trained in Internal Medicine at a tertiary academic hospital and provided frontline care during the COVID-19 pandemic."],
        ["Clinical Instructor in Internal Medicine", "I supervised and mentored medical students throughout their hospital rotations. I coordinated their integration into clinical teams and helped ensure the quality of their training."],
        ["Local Research Liaison — Compañeros en Salud / Harvard", "I served as a local liaison on a Harvard T.H. Chan School of Public Health study evaluating shared medical appointments in a rural setting, providing field translation, interview transcription, and contextual interpretation of the data."],
        ["Research Assistant — Neurochemistry", "I worked directly with mouse models, assisting neurochemistry graduate students by evaluating memory and behavior through maze paradigms."],
        ["Rural Physician", "I led the clinical and operational work of a rural clinic in the mountains of Chiapas. I delivered more than 3,100 consultations, ran community health campaigns, and supervised local staff while maintaining high-quality, evidence-based care under severe resource constraints."],
        ["Independent Contractor — Figure 1", "I translated and localized clinical content and digital interfaces for Spanish-speaking users at an international digital health startup."],
        ["Tissue Biology Instructor", "I designed innovative lab sessions and assessments for medical students, while facilitating the transition to hybrid and virtual learning."]
      ]
    },
    education: {
      eyebrow: "Academic training",
      title: "Education",
      entries: [
        ["Internal Medicine Specialty", "Board-certified Internal Medicine specialist. My graduate thesis investigated the impact of the COVID-19 pandemic on germ cell tumor care at a tertiary referral center."],
        ["Medical Degree", "I earned my medical degree on a merit-based scholarship, trained in high-volume hospitals across the country's major cities, and completed an international medical rotation. I regularly volunteered in community health outreach."]
      ]
    },
    contact: {
      eyebrow: "Contact",
      title: "Conversations on oncology, value, and access.",
      note: "For academic collaborations, research, or professional conversations, reach me by email or through LinkedIn.",
      email: "Email",
      linkedin: "LinkedIn"
    }
  }
};

const sectionKeys = ["profile", "experience", "education", "contact"];
let language = localStorage.getItem("site-language") || (navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");
let activeIndex = Math.max(0, sectionKeys.indexOf(location.hash.replace("#", "")));
let previousDotY = null;

const sidebar = document.getElementById("bounceSidebar");
const mainContent = document.getElementById("mainContent");
const dot = sidebar.querySelector(".bounce-dot");
const languageButton = document.querySelector(".language-toggle");
const languageLabel = document.querySelector("[data-lang-label]");
const sidebarNote = document.querySelector("[data-i18n='sidebarNote']");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
}

function renderEntries(section) {
  return `<section class="view" aria-labelledby="section-title">
    <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
    <h1 class="section-heading" id="section-title">${escapeHtml(section.title)}</h1>
    <div class="entry-list">
      ${section.entries.map(([title, copy]) => `<article class="entry">
        <h2 class="entry-title">${escapeHtml(title)}</h2>
        <p class="entry-copy">${escapeHtml(copy)}</p>
      </article>`).join("")}
    </div>
  </section>`;
}

function renderContent() {
  const key = sectionKeys[activeIndex];
  const section = content[language][key];
  if (key === "profile") {
    mainContent.innerHTML = `<section class="view" aria-labelledby="section-title">
      <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
      <h1 class="hero-title" id="section-title">${escapeHtml(section.title)}</h1>
      <div class="hero-copy">${section.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("")}</div>
    </section>`;
  } else if (key === "contact") {
    mainContent.innerHTML = `<section class="view" aria-labelledby="section-title">
      <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
      <h1 class="section-heading" id="section-title">${escapeHtml(section.title)}</h1>
      <p class="contact-note">${escapeHtml(section.note)}</p>
      <div class="contact-grid">
        <a class="contact-link" href="mailto:francisco.guadarrama@proton.me">${escapeHtml(section.email)}</a>
        <a class="contact-link" href="https://www.linkedin.com/" target="_blank" rel="noreferrer">${escapeHtml(section.linkedin)}</a>
      </div>
    </section>`;
  } else {
    mainContent.innerHTML = renderEntries(section);
  }
  document.title = `Francisco Guadarrama — ${content[language].nav[activeIndex]}`;
}

function getTargetY(index) {
  const item = sidebar.querySelectorAll("li")[index];
  if (!item) return 0;
  const size = 6;
  const dpr = window.devicePixelRatio || 1;
  return Math.round((item.offsetTop + item.offsetHeight / 2 - size / 2) * dpr) / dpr;
}

function moveDot(index, immediate = false) {
  if (window.matchMedia("(max-width: 760px)").matches) return;
  const toY = getTargetY(index);
  if (previousDotY === null || immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dot.style.transform = `translate3d(0px, ${toY}px, 0)`;
    previousDotY = toY;
    return;
  }
  const fromY = previousDotY;
  const delta = toY - fromY;
  previousDotY = toY;
  if (!delta) return;
  const distance = Math.abs(delta);
  const strength = Math.min(0.6, 20 / distance);
  const peakX = -strength * distance;
  dot.animate([
    { transform: `translate3d(0px, ${fromY}px, 0)` },
    { transform: `translate3d(${peakX}px, ${fromY + delta * 0.4}px, 0)`, offset: 0.4 },
    { transform: `translate3d(0px, ${toY}px, 0)` }
  ], {
    duration: 450,
    easing: "cubic-bezier(.22,1,.36,1)",
    fill: "forwards"
  });
}

function select(index, updateHash = true) {
  activeIndex = index;
  sidebar.querySelectorAll("button").forEach((button, i) => {
    if (i === index) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  moveDot(index);
  renderContent();
  if (updateHash) history.replaceState(null, "", `#${sectionKeys[index]}`);
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function renderNavigation() {
  sidebar.querySelectorAll("li").forEach(node => node.remove());
  content[language].nav.forEach((label, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", label);
    if (index === activeIndex) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => select(index));
    button.addEventListener("pointerdown", () => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        button.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 180 });
      }
    });
    li.appendChild(button);
    sidebar.appendChild(li);
  });
  sidebarNote.textContent = content[language].sidebarNote;
  languageLabel.textContent = language === "es" ? "EN" : "ES";
  languageButton.setAttribute("aria-label", language === "es" ? "Switch to English" : "Cambiar a español");
  document.documentElement.lang = language;
  requestAnimationFrame(() => moveDot(activeIndex, true));
}

languageButton.addEventListener("click", () => {
  language = language === "es" ? "en" : "es";
  localStorage.setItem("site-language", language);
  renderNavigation();
  renderContent();
});

window.addEventListener("resize", () => requestAnimationFrame(() => moveDot(activeIndex, true)));
window.addEventListener("hashchange", () => {
  const index = sectionKeys.indexOf(location.hash.replace("#", ""));
  if (index >= 0 && index !== activeIndex) select(index, false);
});

document.getElementById("year").textContent = new Date().getFullYear();
renderNavigation();
renderContent();
document.fonts?.ready.then(() => moveDot(activeIndex, true));
