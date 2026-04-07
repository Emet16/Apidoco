const CONTACT_EMAIL = "kontakt@termotechnik.com.pl";
const EMAILJS_CONFIG = { publicKey: "public_test", serviceId: "service_9a0ndtp", templateId: "template_pdadxaa" };
const PRICES_STORAGE_KEY = "admin_pricing_data";

const defaultPricing = {
  boilers: [
    { name: "De Dietrich MCR4 EVO 24T", type: "jednofunkcyjny", price: 8400, image: "https://via.placeholder.com/420x220?text=MCR4+24T", description: "Kocioł jednofunkcyjny", maxCircuits: 2 },
    { name: "De Dietrich MCR4 EVO 24/28 MI", type: "dwufunkcyjny", price: 9100, image: "https://via.placeholder.com/420x220?text=MCR4+24/28+MI", description: "Kocioł dwufunkcyjny", maxCircuits: 3 }
  ],
  tanks: [
    { name: "Zasobnik 120L", price: 2000, image: "https://via.placeholder.com/420x220?text=Zasobnik+120L", description: "Zasobnik ciepłej wody" }
  ],
  stages: [
    { name: "Montaż rozdzielacza", price: 500, description: "Rozdzielacz do podłogówki", type: "floor", question: "Czy potrzebujesz rozdzielacza?" },
    { name: "Modernizacja pionów", price: 700, description: "Przeróbki dla grzejników", type: "radiator", question: "Czy modernizować piony?" },
    { name: "Mieszacz i sprzęgło", price: 850, description: "Dla układu mieszanego", type: "mixed", question: "Czy dodać mieszacz i sprzęgło?" }
  ],
  automation: [
    { name: "Sterownik pokojowy", price: 300, description: "Regulacja temperatury" }
  ],
  chimney: { pricePerMeter: 100, minLength: 1 },
  circuits: { extra2: 700, extra3: 700 }
};

const $ = (id) => document.getElementById(id);
const els = {
  startStep: $("startStep"), hasBoilerYes: $("hasBoilerYes"), hasBoilerNo: $("hasBoilerNo"),
  quoteForm: $("quoteForm"),
  stepBoiler: $("stepBoiler"), boilerType: $("boilerType"), boilerModel: $("boilerModel"), boilerPreview: $("boilerPreview"), includeTank: $("includeTank"), tankOption: $("tankOption"),
  nextFromBoilerBtn: $("nextFromBoilerBtn"),
  stepSuggestion: $("stepSuggestion"), suggestedBoiler: $("suggestedBoiler"), acceptSuggestionBtn: $("acceptSuggestionBtn"),
  stepCircuits: $("stepCircuits"), heatingCircuits: $("heatingCircuits"), nextFromCircuitsBtn: $("nextFromCircuitsBtn"),
  stepInstallType: $("stepInstallType"), installationType: $("installationType"), nextFromInstallBtn: $("nextFromInstallBtn"),
  stepDynamicQuestion: $("stepDynamicQuestion"), dynamicQuestionTitle: $("dynamicQuestionTitle"), dynamicQuestionDescription: $("dynamicQuestionDescription"), answerYes: $("answerYes"), answerNo: $("answerNo"),
  stepAutomation: $("stepAutomation"), automationOptions: $("automationOptions"),
  stepTank: $("stepTank"), tankSelect: $("tankSelect"), tankPreview: $("tankPreview"),
  stepChimney: $("stepChimney"), chimneyLength: $("chimneyLength"), chimneyHint: $("chimneyHint"),
  stepContact: $("stepContact"), customerType: $("customerType"), email: $("email"), clientMessage: $("clientMessage"), formError: $("formError"),
  result: $("result"), resultContent: $("resultContent"), resultImages: $("resultImages"),
  sendSection: $("sendSection"), sendInquiryBtn: $("sendInquiryBtn"), sendStatus: $("sendStatus"),
  adminToggleBtn: $("adminToggleBtn"), adminDialog: $("adminDialog"), adminAuthSection: $("adminAuthSection"), adminContentSection: $("adminContentSection"), adminLogin: $("adminLogin"), adminPassword: $("adminPassword"), adminLoginBtn: $("adminLoginBtn"), adminAuthStatus: $("adminAuthStatus"),
  adminBoilers: $("adminBoilers"), addBoilerBtn: $("addBoilerBtn"), adminTanks: $("adminTanks"), addTankBtn: $("addTankBtn"), adminStages: $("adminStages"), addStageBtn: $("addStageBtn"), adminAutomation: $("adminAutomation"), addAutomationBtn: $("addAutomationBtn"), adminChimneyPrice: $("adminChimneyPrice"), adminChimneyMin: $("adminChimneyMin"), adminCircuit2: $("adminCircuit2"), adminCircuit3: $("adminCircuit3"), savePricesBtn: $("savePricesBtn"), closeAdminBtn: $("closeAdminBtn")
};

let state = {
  hasBoiler: null,
  selectedBoiler: null,
  selectedCircuits: null,
  selectedInstallType: null,
  selectedStages: [],
  stageQuestions: [],
  stageQuestionIndex: 0,
  selectedAutomation: [],
  selectedTank: null,
  quote: null,
  adminAuth: false,
  adminCredentials: { login: "admin", password: "Termo123!" }
};
let emailInitialized = false;

function readPricing() {
  const raw = localStorage.getItem(PRICES_STORAGE_KEY);
  if (!raw) return structuredClone(defaultPricing);
  try { return { ...structuredClone(defaultPricing), ...JSON.parse(raw) }; }
  catch { return structuredClone(defaultPricing); }
}
function writePricing(p) { localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(p)); }

function hideAllSteps() {
  ["stepBoiler","stepSuggestion","stepCircuits","stepInstallType","stepDynamicQuestion","stepAutomation","stepTank","stepChimney","stepContact"].forEach((id) => els[id].classList.add("hidden"));
}

function renderBoilerPreview(boiler, target) {
  if (!boiler) { target.innerHTML = ""; return; }
  target.innerHTML = `<img src="${boiler.image}" class="boiler-image" alt="${boiler.name}" /><strong>${boiler.name}</strong><p class="muted">${boiler.description || ""}</p><p>${boiler.price.toFixed(2)} zł</p>`;
}

function resetBelow(level) {
  if (level <= 1) { state.selectedCircuits = null; state.selectedInstallType = null; state.selectedStages = []; state.selectedAutomation = []; state.selectedTank = null; }
  if (level <= 2) { state.selectedInstallType = null; state.selectedStages = []; }
  if (level <= 3) { state.selectedStages = []; }
}

function showStep(stepId) {
  if (els[stepId]) els[stepId].classList.remove("hidden");
}

function startFlowHasBoiler() {
  state.hasBoiler = true;
  els.startStep.classList.add("hidden");
  els.quoteForm.classList.remove("hidden");
  hideAllSteps();
  els.stepBoiler.classList.remove("hidden");
  loadBoilerOptions();
}

function startFlowNoBoiler() {
  state.hasBoiler = false;
  els.startStep.classList.add("hidden");
  els.quoteForm.classList.remove("hidden");
  hideAllSteps();
  // Brak wybranego kotła na starcie: pozwól wybrać 1-3 obiegi.
  setupCircuitsForBoiler({ maxCircuits: 3 });
  els.stepCircuits.classList.remove("hidden");
}

function loadBoilerOptions() {
  if (!els.boilerModel || !els.boilerType) return;
  if (!els.boilerType.value) {
    els.boilerType.value = "jednofunkcyjny";
  }
  const pricing = readPricing();
  console.log("Loaded boilers:", pricing.boilers);
  els.boilerModel.innerHTML = "";
  const list = pricing.boilers.filter((b) => b.type === els.boilerType.value);
  if (!list.length) {
    els.boilerModel.innerHTML = "<option>Brak dostępnych kotłów</option>";
    state.selectedBoiler = null;
    return;
  }
  list.forEach((b) => {
    const o = document.createElement("option");
    o.value = b.name;
    o.textContent = `${b.name} — ${b.price.toFixed(2)} zł`;
    els.boilerModel.append(o);
  });
  const selected = list[0] || null;
  state.selectedBoiler = selected;
  renderBoilerPreview(selected, els.boilerPreview);
  // Po załadowaniu kotła od razu przygotuj zakres obiegów.
  setupCircuitsForBoiler(selected);
}

function setupCircuitsForBoiler(boiler) {
  if (!els.heatingCircuits) return;
  els.heatingCircuits.innerHTML = "";
  const max = boiler?.maxCircuits || 3;
  for (let i = 1; i <= max; i += 1) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = String(i);
    els.heatingCircuits.append(o);
  }
  state.selectedCircuits = 1;
}

function suggestBoilerForNoChoice() {
  const pricing = readPricing();
  const install = state.selectedInstallType;
  const circuits = Number(state.selectedCircuits || 1);
  const suggested = pricing.boilers.find((b) => b.maxCircuits >= circuits && (install === "mixed" ? true : b.type)) || pricing.boilers[0];
  state.selectedBoiler = suggested;
  setupCircuitsForBoiler(suggested);
  renderBoilerPreview(suggested, els.suggestedBoiler);
  els.stepSuggestion.classList.remove("hidden");
}

function startStageQuestions() {
  const pricing = readPricing();
  state.stageQuestions = pricing.stages.filter((s) => s.type === state.selectedInstallType || (state.selectedInstallType === "mixed" && ["floor","radiator","mixed"].includes(s.type)));
  state.stageQuestionIndex = 0;
  state.selectedStages = [];
  askNextStageQuestion();
}

function askNextStageQuestion() {
  const current = state.stageQuestions[state.stageQuestionIndex];
  if (!current) {
    els.stepDynamicQuestion.classList.add("hidden");
    renderAutomationStep();
    return;
  }
  els.stepDynamicQuestion.classList.remove("hidden");
  els.dynamicQuestionTitle.textContent = current.question || `Czy dodać etap: ${current.name}?`;
  els.dynamicQuestionDescription.textContent = `${current.name} (+${current.price.toFixed(2)} zł) — ${current.description || ""}`;
}

function nextAfterStageAnswer(isYes) {
  const current = state.stageQuestions[state.stageQuestionIndex];
  if (current && isYes) state.selectedStages.push(current);
  state.stageQuestionIndex += 1;
  askNextStageQuestion();
}

function renderAutomationStep() {
  const pricing = readPricing();
  els.automationOptions.innerHTML = "";
  pricing.automation.forEach((a) => {
    const row = document.createElement("label");
    row.innerHTML = `<input type="checkbox" data-auto="${a.name}" /> ${a.name} (+${Number(a.price).toFixed(2)} zł)<small class="muted">${a.description || ""}</small>`;
    els.automationOptions.append(row);
  });
  els.stepAutomation.classList.remove("hidden");

  // Zasobnik jako osobna kategoria
  if (state.selectedBoiler?.type === "jednofunkcyjny") {
    const tanks = readPricing().tanks || [];
    els.tankSelect.innerHTML = `<option value="">Brak zasobnika</option>`;
    tanks.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.name;
      o.textContent = `${t.name} — ${t.price.toFixed(2)} zł`;
      els.tankSelect.append(o);
    });
    els.stepTank.classList.remove("hidden");
  } else {
    els.stepTank.classList.add("hidden");
    state.selectedTank = null;
  }

  els.stepChimney.classList.remove("hidden");
  const p = readPricing();
  els.chimneyHint.textContent = `Komin: ${p.chimney.pricePerMeter} zł/m (min ${p.chimney.minLength}m)`;
  els.chimneyLength.min = String(p.chimney.minLength);
  els.stepContact.classList.remove("hidden");
}

function calculateQuote() {
  console.log("STATE:", state);
  const p = readPricing();
  const chimney = Number(els.chimneyLength.value);
  if (!state.selectedBoiler) return "Brak kotła";
  if (!state.selectedCircuits) return "Wybierz obiegi.";
  if (!state.selectedInstallType) return "Wybierz typ instalacji.";
  if (!els.customerType.value || !els.email.checkValidity()) return "Uzupełnij poprawne dane kontaktowe.";
  if (!els.chimneyLength.value || chimney < Number(p.chimney.minLength)) return `Komin min. ${p.chimney.minLength} m.`;

  state.selectedAutomation = [...els.automationOptions.querySelectorAll('input:checked')].map((c) => p.automation.find((a) => a.name === c.dataset.auto)).filter(Boolean);
  if (state.selectedBoiler.type === "jednofunkcyjny") {
    state.selectedTank = (p.tanks || []).find((t) => t.name === els.tankSelect.value) || null;
  } else state.selectedTank = null;

  const circuits = Number(state.selectedCircuits);
  const circuitsCost = (circuits >= 2 ? Number(p.circuits.extra2) : 0) + (circuits >= 3 ? Number(p.circuits.extra3) : 0);
  const stagesCost = state.selectedStages.reduce((s, x) => s + Number(x.price), 0);
  const autoCost = state.selectedAutomation.reduce((s, x) => s + Number(x.price), 0);
  const chimneyCost = chimney * Number(p.chimney.pricePerMeter);
  const tankCost = state.selectedTank ? Number(state.selectedTank.price) : 0;
  const net = Number(state.selectedBoiler.price) + stagesCost + autoCost + chimneyCost + circuitsCost + tankCost;
  const vat = els.customerType.value === "firma" ? 0.23 : 0.08;

  state.quote = {
    quoteId: `WYC-${Math.floor(Math.random() * 9000 + 1000)}`,
    boiler: state.selectedBoiler,
    tank: state.selectedTank,
    circuits,
    installationType: state.selectedInstallType,
    stages: state.selectedStages,
    automation: state.selectedAutomation,
    chimney,
    clientEmail: els.email.value,
    clientMessage: els.clientMessage.value.trim(),
    grossTotal: net * (1 + vat)
  };
  return null;
}

function renderSummary() {
  const q = state.quote;
  els.result.classList.remove("hidden");
  els.resultContent.innerHTML = `
    <h3>Wycena: ${q.quoteId}</h3>
    <p><strong>Kocioł:</strong> ${q.boiler.name}</p>
    <p><strong>Obiegi:</strong> ${q.circuits}</p>
    <p><strong>Typ instalacji:</strong> ${q.installationType}</p>
    <p><strong>Etapy:</strong> ${q.stages.map((s) => s.name).join(", ") || "brak"}</p>
    <p><strong>Automatyka:</strong> ${q.automation.map((a) => a.name).join(", ") || "brak"}</p>
    <p><strong>Zasobnik:</strong> ${q.tank ? q.tank.name : "brak"}</p>
    <p><strong>Cena brutto:</strong> ${q.grossTotal.toFixed(2)} zł</p>
  `;
  els.resultImages.innerHTML = `<img class="summary-image" src="${q.boiler.image}" alt="Kocioł" />${q.tank ? `<img class="summary-image" src="${q.tank.image}" alt="Zasobnik" />` : ""}`;
}

async function sendInquiryByEmailJS() {
  if (!state.quote) return;
  if (!window.emailjs) {
    console.error("EmailJS nie załadowany");
    return;
  }
  try {
    const payload = {
      to_email: CONTACT_EMAIL,
      client_email: state.quote.clientEmail,
      client_message: state.quote.clientMessage || "brak",
      message: `ID: ${state.quote.quoteId}\nKocioł: ${state.quote.boiler.name}\nObiegi: ${state.quote.circuits}\nTyp instalacji: ${state.quote.installationType}\nEtapy: ${state.quote.stages.map((s) => s.name).join(", ")}\nCena: ${state.quote.grossTotal.toFixed(2)} zł`
    };
    if (!emailInitialized) {
      emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
      emailInitialized = true;
    }
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, payload, { publicKey: EMAILJS_CONFIG.publicKey });
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, { ...payload, to_email: state.quote.clientEmail }, { publicKey: EMAILJS_CONFIG.publicKey });
    els.sendStatus.textContent = "2 maile";
    els.sendStatus.className = "send-status success";
  } catch {
    els.sendStatus.textContent = "Błąd wysyłki";
    els.sendStatus.className = "send-status error";
  }
}

function toggleAdminPanel(open = !els.adminDialog.open) {
  if (open) {
    els.adminDialog.showModal();
    els.adminAuthSection.classList.remove("hidden");
    els.adminContentSection.classList.add("hidden");
  } else {
    state.adminAuth = false;
    els.adminDialog.close();
  }
}

function renderAdminRows() {
  const p = readPricing();
  const makeRemove = (row) => row.querySelector('.remove-btn').onclick = () => row.remove();

  els.adminBoilers.innerHTML = "";
  p.boilers.forEach((b) => {
    const r = document.createElement('div'); r.className = 'admin-row admin-boiler-row';
    r.innerHTML = `<input data-f="name" value="${b.name}" /><select data-f="type"><option value="jednofunkcyjny" ${b.type==='jednofunkcyjny'?'selected':''}>jednofunkcyjny</option><option value="dwufunkcyjny" ${b.type==='dwufunkcyjny'?'selected':''}>dwufunkcyjny</option></select><input data-f="maxCircuits" type="number" min="1" max="3" value="${b.maxCircuits}" /><input data-f="price" type="number" value="${b.price}" /><input data-f="image" value="${b.image}" /><input data-f="description" value="${b.description||''}" /><button class="remove-btn" type="button">✕</button>`; makeRemove(r); els.adminBoilers.append(r);
  });

  els.adminTanks.innerHTML = "";
  (p.tanks||[]).forEach((t) => { const r=document.createElement('div'); r.className='admin-row'; r.innerHTML=`<input data-f="name" value="${t.name}" /><input data-f="price" type="number" value="${t.price}" /><input data-f="image" value="${t.image}" /><input data-f="description" value="${t.description||''}" /><button class="remove-btn" type="button">✕</button>`; makeRemove(r); els.adminTanks.append(r); });

  els.adminStages.innerHTML = "";
  p.stages.forEach((s) => { const r=document.createElement('div'); r.className='admin-row'; r.innerHTML=`<input data-f="name" value="${s.name}" /><input data-f="price" type="number" value="${s.price}" /><input data-f="type" value="${s.type}" /><input data-f="question" value="${s.question||''}" /><input data-f="description" value="${s.description||''}" /><button class="remove-btn" type="button">✕</button>`; makeRemove(r); els.adminStages.append(r); });

  els.adminAutomation.innerHTML = "";
  p.automation.forEach((a) => { const r=document.createElement('div'); r.className='admin-row'; r.innerHTML=`<input data-f="name" value="${a.name}" /><input data-f="price" type="number" value="${a.price}" /><input data-f="description" value="${a.description||''}" /><button class="remove-btn" type="button">✕</button>`; makeRemove(r); els.adminAutomation.append(r); });

  els.adminChimneyPrice.value = p.chimney.pricePerMeter;
  els.adminChimneyMin.value = p.chimney.minLength;
  els.adminCircuit2.value = p.circuits.extra2;
  els.adminCircuit3.value = p.circuits.extra3;
}

function saveAdminData() {
  const rows = (container) => [...container.querySelectorAll('.admin-row')];
  const v = (r, f) => r.querySelector(`[data-f="${f}"]`)?.value ?? "";

  const boilers = rows(els.adminBoilers).map((r) => ({ name: v(r,'name').trim(), type: v(r,'type'), maxCircuits: Math.min(3,Math.max(1,Number(v(r,'maxCircuits'))||1)), price: Number(v(r,'price')), image: v(r,'image').trim(), description: v(r,'description').trim() })).filter((x) => x.name);
  const tanks = rows(els.adminTanks).map((r) => ({ name: v(r,'name').trim(), price: Number(v(r,'price')), image: v(r,'image').trim(), description: v(r,'description').trim() })).filter((x)=>x.name);
  const stages = rows(els.adminStages).map((r) => ({ name: v(r,'name').trim(), price: Number(v(r,'price')), type: v(r,'type').trim(), question: v(r,'question').trim(), description: v(r,'description').trim() })).filter((x)=>x.name);
  const automation = rows(els.adminAutomation).map((r) => ({ name: v(r,'name').trim(), price: Number(v(r,'price')), description: v(r,'description').trim() })).filter((x)=>x.name);

  writePricing({ boilers, tanks, stages, automation, chimney: { pricePerMeter: Number(els.adminChimneyPrice.value)||100, minLength: Number(els.adminChimneyMin.value)||1 }, circuits: { extra2: Number(els.adminCircuit2.value)||0, extra3: Number(els.adminCircuit3.value)||0 } });
  renderAdminRows();
}

// Event binding
if (els.hasBoilerYes) els.hasBoilerYes.onclick = startFlowHasBoiler;
if (els.hasBoilerNo) els.hasBoilerNo.onclick = startFlowNoBoiler;

if (els.boilerType) els.boilerType.onchange = () => { resetBelow(1); loadBoilerOptions(); };
if (els.boilerModel) els.boilerModel.onchange = () => { resetBelow(1); const p = readPricing(); state.selectedBoiler = p.boilers.find((b)=>b.name===els.boilerModel.value) || null; renderBoilerPreview(state.selectedBoiler, els.boilerPreview); if (state.selectedBoiler && els.stepCircuits) { setupCircuitsForBoiler(state.selectedBoiler); els.stepCircuits.classList.remove('hidden'); } };
if (els.heatingCircuits) els.heatingCircuits.onchange = () => { state.selectedCircuits = Number(els.heatingCircuits.value); };
if (els.installationType) els.installationType.onchange = () => {
  state.selectedInstallType = els.installationType.value;
  if (!state.selectedInstallType) return;
};
if (els.acceptSuggestionBtn) els.acceptSuggestionBtn.onclick = () => {
  if (!state.selectedBoiler) return;
  els.stepSuggestion.classList.add('hidden');
  renderAutomationStep();
};

if (els.answerYes) els.answerYes.onclick = () => nextAfterStageAnswer(true);
if (els.answerNo) els.answerNo.onclick = () => nextAfterStageAnswer(false);

if (els.nextFromBoilerBtn) els.nextFromBoilerBtn.onclick = () => {
  const p = readPricing();
  state.selectedBoiler = p.boilers.find((b) => b.name === els.boilerModel.value) || state.selectedBoiler;
  if (!state.selectedBoiler) {
    els.formError.textContent = "Wybierz kocioł.";
    els.formError.classList.remove("hidden");
    return;
  }
  setupCircuitsForBoiler(state.selectedBoiler);
  showStep("stepCircuits");
};

if (els.nextFromCircuitsBtn) els.nextFromCircuitsBtn.onclick = () => {
  state.selectedCircuits = Number(els.heatingCircuits.value);
  if (!state.selectedCircuits) return;
  showStep("stepInstallType");
};

if (els.nextFromInstallBtn) els.nextFromInstallBtn.onclick = () => {
  state.selectedInstallType = els.installationType.value;
  if (!state.selectedInstallType) return;
  if (!state.hasBoiler) {
    suggestBoilerForNoChoice();
    return;
  }
  startStageQuestions();
};

if (els.tankSelect) els.tankSelect.onchange = () => {
  const t = (readPricing().tanks || []).find((x) => x.name === els.tankSelect.value);
  state.selectedTank = t || null;
  els.tankPreview.innerHTML = t ? `<img class="boiler-image" src="${t.image}" alt="${t.name}" /><strong>${t.name}</strong><p class="muted">${t.description||''}</p>` : "";
};

if (els.quoteForm) els.quoteForm.onsubmit = (e) => {
  e.preventDefault();
  const err = calculateQuote();
  if (err) { els.formError.textContent = err; els.formError.classList.remove('hidden'); return; }
  els.formError.classList.add('hidden');
  renderSummary();
  els.sendSection.classList.remove('hidden');
};

if (els.sendInquiryBtn) els.sendInquiryBtn.onclick = sendInquiryByEmailJS;

if (els.adminToggleBtn) els.adminToggleBtn.onclick = () => toggleAdminPanel(true);
if (els.closeAdminBtn) els.closeAdminBtn.onclick = () => toggleAdminPanel(false);
if (els.adminLoginBtn) els.adminLoginBtn.onclick = () => {
  if (els.adminLogin.value.trim() === state.adminCredentials.login && els.adminPassword.value === state.adminCredentials.password) {
    state.adminAuth = true; els.adminAuthSection.classList.add('hidden'); els.adminContentSection.classList.remove('hidden'); renderAdminRows();
  } else { els.adminAuthStatus.textContent = 'Nieprawidłowy login lub hasło'; els.adminAuthStatus.className = 'send-status error'; }
};

if (els.addBoilerBtn) els.addBoilerBtn.onclick = () => state.adminAuth && els.adminBoilers && els.adminBoilers.insertAdjacentHTML('beforeend', '<div class="admin-row admin-boiler-row"><input data-f="name" placeholder="Nazwa" /><select data-f="type"><option value="jednofunkcyjny">jednofunkcyjny</option><option value="dwufunkcyjny">dwufunkcyjny</option></select><input data-f="maxCircuits" type="number" min="1" max="3" value="1" /><input data-f="price" type="number" /><input data-f="image" /><input data-f="description" /><button class="remove-btn" type="button">✕</button></div>');
if (els.addTankBtn) els.addTankBtn.onclick = () => state.adminAuth && els.adminTanks && els.adminTanks.insertAdjacentHTML('beforeend', '<div class="admin-row"><input data-f="name" placeholder="Nazwa" /><input data-f="price" type="number" /><input data-f="image" /><input data-f="description" /><button class="remove-btn" type="button">✕</button></div>');
if (els.addStageBtn) els.addStageBtn.onclick = () => state.adminAuth && els.adminStages && els.adminStages.insertAdjacentHTML('beforeend', '<div class="admin-row"><input data-f="name" /><input data-f="price" type="number" /><input data-f="type" placeholder="floor/radiator/mixed" /><input data-f="question" /><input data-f="description" /><button class="remove-btn" type="button">✕</button></div>');
if (els.addAutomationBtn) els.addAutomationBtn.onclick = () => state.adminAuth && els.adminAutomation && els.adminAutomation.insertAdjacentHTML('beforeend', '<div class="admin-row"><input data-f="name" /><input data-f="price" type="number" /><input data-f="description" /><button class="remove-btn" type="button">✕</button></div>');

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-btn');
  if (btn) btn.parentElement.remove();
});

if (els.savePricesBtn) els.savePricesBtn.onclick = () => state.adminAuth && saveAdminData();

document.querySelectorAll(".back-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target === "startStep") {
      els.quoteForm.classList.add("hidden");
      els.startStep.classList.remove("hidden");
      hideAllSteps();
      return;
    }
    showStep(target);
  });
});

(async function init() {
  try {
    const r = await fetch('data/admin-config.json', { cache: 'no-store' });
    if (r.ok) {
      const cfg = await r.json();
      if (cfg?.login && cfg?.password) state.adminCredentials = cfg;
    }
  } catch (e) {
    console.warn("Brak pliku admin-config.json — używam domyślnych danych");
  }
  if (els.tankPriceValue) {
    els.tankPriceValue.textContent = "0";
  }
  loadBoilerOptions();
})();
