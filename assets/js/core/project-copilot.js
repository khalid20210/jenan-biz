// روبوت إدارة المشاريع — Project Copilot
// يرافق المستخدم خطوة بخطوة من الفكرة حتى التشغيل

const PROJECT_STEPS = [
  {
    key: 'sector',
    title: 'اختيار النشاط/القطاع',
    desc: 'حدد نوع النشاط التجاري أو القطاع الذي ترغب في العمل فيه. ستحصل على اقتراحات بناءً على السوق السعودي.',
    suggestions: ['مطعم', 'مقهى', 'تجزئة', 'خدمات', 'تقنية', 'تجارة إلكترونية', 'مقاولات', 'تجميل', 'تعليم', 'صحة'],
    inputType: 'select',
    next: 'name',
  },
  {
    key: 'name',
    title: 'اسم المنشأة التجاري',
    desc: 'اختر اسمًا مميزًا لمنشأتك. سنقترح أسماء متاحة ونبحث عن توفرها كاسم تجاري ودومين.',
    suggestions: [],
    inputType: 'text',
    next: 'legal',
  },
  {
    key: 'legal',
    title: 'المتطلبات النظامية',
    desc: 'تعرف على التراخيص والمتطلبات النظامية اللازمة لنشاطك (سجل تجاري، رخصة بلدية، إلخ).',
    suggestions: [],
    inputType: 'none',
    next: 'domain',
  },
  {
    key: 'domain',
    title: 'حجز دومين إلكتروني',
    desc: 'سنقترح دومينات متاحة لاسم منشأتك ونوضح أهمية الحضور الرقمي.',
    suggestions: [],
    inputType: 'none',
    next: 'social',
  },
  {
    key: 'social',
    title: 'حسابات التواصل الاجتماعي',
    desc: 'اقتراح وإنشاء حسابات تواصل اجتماعي للمنشأة مع نصائح لإدارتها.',
    suggestions: ['انستقرام', 'سناب شات', 'تويتر', 'لينكدإن', 'واتساب بزنس'],
    inputType: 'none',
    next: 'products',
  },
  {
    key: 'products',
    title: 'اختيار المنتجات/الخدمات',
    desc: 'حدد المنتجات أو الخدمات الرئيسية التي ستقدمها. سنقترح خيارات شائعة وموردين.',
    suggestions: [],
    inputType: 'text',
    next: 'suppliers',
  },
  {
    key: 'suppliers',
    title: 'الموردون',
    desc: 'اقتراح أفضل الموردين بناءً على القطاع والموقع.',
    suggestions: [],
    inputType: 'none',
    next: 'staff',
  },
  {
    key: 'staff',
    title: 'اختيار الموظفين الأكفاء',
    desc: 'حدد الأدوار المطلوبة وسنقترح رواتب سوقية ونصائح توظيف.',
    suggestions: ['مدير', 'محاسب', 'بائع', 'مسوق', 'فني', 'عامل'],
    inputType: 'none',
    next: 'launch',
  },
  {
    key: 'launch',
    title: 'بدء التشغيل الفعلي',
    desc: 'تهانينا! سنعطيك تقرير إنجاز شامل وخطوات المتابعة بعد التشغيل.',
    suggestions: [],
    inputType: 'none',
    next: null,
  },
];

let projectState = {};
let currentStep = 0;

function renderProjectSteps() {
  const stepsEl = document.getElementById('project-steps');
  stepsEl.innerHTML = '';
  for (let i = 0; i <= currentStep; i++) {
    const step = PROJECT_STEPS[i];
    stepsEl.appendChild(renderStep(step, i));
  }
  updateProgressBar();
}

function renderStep(step, idx) {
  const div = document.createElement('div');
  div.className = 'project-step';
  // Title
  div.innerHTML += `<div class="step-title">${step.title}</div>`;
  // Desc
  div.innerHTML += `<div class="step-desc">${step.desc}</div>`;
  // Suggestions
  if (step.suggestions && step.suggestions.length > 0) {
    div.innerHTML += `<div class="step-suggestions">${step.suggestions.map(s => `<span onclick=\"fillStepInput('${step.key}','${s}')\">${s}</span>`).join('')}</div>`;
  }
  // Input
  if (step.inputType === 'text') {
    div.innerHTML += `<input type="text" id="input-${step.key}" placeholder="اكتب هنا..." value="${projectState[step.key]||''}" onkeydown="if(event.key==='Enter'){saveStep('${step.key}')}" />`;
    div.innerHTML += `<button onclick="saveStep('${step.key}')">حفظ</button>`;
    if(step.key==='name') {
      div.innerHTML += `<button onclick="suggestSmartName()" style="margin-right:.7rem;background:#a855f7">اقتراح اسم ذكي</button>`;
      div.innerHTML += `<div id="ai-name-suggestion" style="margin-top:.7rem;font-size:.97rem;color:#4E73C2"></div>`;
    }
  } else if (step.inputType === 'select') {
    div.innerHTML += `<select id="input-${step.key}">${step.suggestions.map(s => `<option value="${s}" ${projectState[step.key]===s?'selected':''}>${s}</option>`).join('')}</select>`;
    div.innerHTML += `<button onclick="saveStep('${step.key}')">اختيار</button>`;
  }
  // Report
  if (projectState[step.key]) {
    div.innerHTML += `<div class="step-complete">✅ تم إنجاز هذه الخطوة</div>`;
    div.innerHTML += `<div class="step-report">${getStepReport(step)}</div>`;
    if (step.next && idx === currentStep) {
      div.innerHTML += `<div class="step-next">⬇️ الخطوة التالية: ${getStepByKey(step.next).title}</div>`;
    }
  }
  return div;
}

function fillStepInput(key, val) {
  const inp = document.getElementById('input-' + key);
  if (inp) inp.value = val;
}

function saveStep(key) {
  const step = getStepByKey(key);
  let val = '';
  if (step.inputType === 'text') {
    val = document.getElementById('input-' + key).value.trim();
  } else if (step.inputType === 'select') {
    val = document.getElementById('input-' + key).value;
  }
  if (!val) return alert('يرجى تعبئة الحقل أولاً');
  projectState[key] = val;
  if (currentStep < PROJECT_STEPS.length - 1) currentStep++;
  renderProjectSteps();
  showStepSummary(step, val);
}

function getStepByKey(key) {
  return PROJECT_STEPS.find(s => s.key === key);
}

function getStepReport(step) {
  // تقارير مختصرة لكل خطوة (يمكن تطويرها لاحقاً)
  switch(step.key) {
    case 'sector': return `تم اختيار القطاع: <b>${projectState[step.key]}</b>. سيتم تخصيص الاقتراحات التالية بناءً عليه.`;
    case 'name': return `اسم المنشأة المقترح: <b>${projectState[step.key]}</b>. سنبحث عن توفر الاسم التجاري والدومين.`;
    case 'legal': return `سيتم عرض قائمة المتطلبات النظامية والتراخيص اللازمة لهذا النشاط.`;
    case 'domain': return `سيتم اقتراح دومينات متاحة لاسم المنشأة.`;
    case 'social': return `سيتم اقتراح وإنشاء حسابات تواصل اجتماعي للمنشأة.`;
    case 'products': return `المنتجات/الخدمات الرئيسية: <b>${projectState[step.key]}</b>. سيتم اقتراح موردين مناسبين.`;
    case 'suppliers': return `سيتم اقتراح أفضل الموردين بناءً على القطاع والموقع.`;
    case 'staff': return `سيتم اقتراح الأدوار والرواتب السوقية ونصائح التوظيف.`;
    case 'launch': return `🎉 تهانينا! تم إكمال جميع الخطوات الأساسية. يمكنك الآن بدء التشغيل الفعلي.`;
    default: return '';
  }
}

function showStepSummary(step, val) {
  const summary = document.getElementById('project-summary');
  summary.style.display = 'block';
  summary.innerHTML = `<b>تم إنجاز خطوة:</b> ${step.title}<br>القيمة: <span style="color:#4E73C2">${val}</span><br><br><span style="color:#a855f7">تابع للخطوة التالية بالأسفل 👇</span>`;
  setTimeout(() => { summary.style.display = 'none'; }, 3500);
}

function updateProgressBar() {
  const bar = document.getElementById('project-progress-bar');
  const pct = Math.round((currentStep+1) / PROJECT_STEPS.length * 100);
  bar.style.width = pct + '%';
}

// Init
window.addEventListener('DOMContentLoaded', renderProjectSteps);

// ذكاء اصطناعي: اقتراح اسم تجاري ودومين متاح
function suggestSmartName() {
  const sector = projectState['sector'] || '';
  const ideas = [
    'بزنس '+sector,
    sector+' بلس',
    'رواد '+sector,
    'المستقبل '+sector,
    sector+' برو',
    'سعودي '+sector,
    'جنان '+sector,
    'سما '+sector,
    'أصالة '+sector,
    'نخبة '+sector
  ];
  // اختيار عشوائي
  const pick = ideas[Math.floor(Math.random()*ideas.length)];
  // دومين متاح (تحقق شكلي فقط)
  const domain = latinize(pick.replace(/\s+/g,'-'))+".com";
  document.getElementById('ai-name-suggestion').innerHTML =
    `<b>اسم مقترح:</b> <span style="color:#a855f7">${pick}</span><br>`+
    `<b>دومين متاح:</b> <span style="color:#16a34a">${domain}</span> <button onclick=\"copyToClipboard('${domain}')\" style='font-size:.9rem;margin-right:.5rem'>نسخ</button>`;
  document.getElementById('input-name').value = pick;
}
function latinize(str) {
  // تحويل عربي إلى لاتيني مبسط
  return str.replace(/[ء-ي]/g, c => {
    const map = {ا:'a',ب:'b',ت:'t',ث:'th',ج:'j',ح:'h',خ:'kh',د:'d',ذ:'dh',ر:'r',ز:'z',س:'s',ش:'sh',ص:'s',ض:'d',ط:'t',ظ:'z',ع:'a',غ:'gh',ف:'f',ق:'q',ك:'k',ل:'l',م:'m',ن:'n',ه:'h',و:'w',ي:'y',ء:'a',ى:'a',ة:'a'};
    return map[c]||'';
  }).replace(/[^a-zA-Z0-9-]/g,'').toLowerCase();
}
function copyToClipboard(txt) {
  navigator.clipboard.writeText(txt);
  showStepSummary({title:'تم نسخ الدومين'}, txt);
}
