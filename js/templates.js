// SA Invoice Pro – Business Template Library
// From small startups to enterprise

window.BUSINESS_TEMPLATES = [
  {
    id: 'startup',
    name: 'Startup / Solo',
    icon: 'rocket',
    desc: 'Freelancers, side-hustles & new businesses',
    colour: 'teal',
    template: 'modern',
    vatEnabled: false,
    sampleProducts: [
      { name: 'Consulting Hour', unitPrice: 650, description: 'Professional consulting' },
      { name: 'Project Setup', unitPrice: 2500, description: 'Initial project setup fee' }
    ],
    sampleServices: [
      { name: 'Monthly Retainer', unitPrice: 4500, description: 'Ongoing support', slaHours: 10 }
    ],
    terms: 'Payment due within 7 days. Thank you for your business.'
  },
  {
    id: 'retail',
    name: 'Retail / Shop',
    icon: 'shopping-bag',
    desc: 'Stores, online shops & product sellers',
    colour: 'orange',
    template: 'classic',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Product Item', unitPrice: 299, description: 'Standard product', sku: 'SKU-001', stock: 50 },
      { name: 'Delivery Fee', unitPrice: 80, description: 'Local delivery' }
    ],
    sampleServices: [],
    terms: 'Goods remain the property of the seller until paid in full. Returns within 7 days.'
  },
  {
    id: 'it-services',
    name: 'IT & Tech Services',
    icon: 'monitor',
    desc: 'Support, development, hosting & MSPs',
    colour: 'blue',
    template: 'modern',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Hardware Item', unitPrice: 1500, description: 'IT hardware', sku: 'HW-001', stock: 10 }
    ],
    sampleServices: [
      { name: 'Remote Support (Hour)', unitPrice: 550, description: 'Remote IT support', slaHours: 4, category: 'IT Support' },
      { name: 'On-site Visit', unitPrice: 950, description: 'On-site technician', slaHours: 8, category: 'IT Support' },
      { name: 'Managed Service (Monthly)', unitPrice: 2500, description: 'Managed IT package', slaHours: 20, category: 'Maintenance' }
    ],
    terms: 'Support tickets logged via the portal. SLA response times apply as per agreement.'
  },
  {
    id: 'professional',
    name: 'Professional Services',
    icon: 'briefcase',
    desc: 'Accountants, lawyers, consultants, agencies',
    colour: 'navy',
    template: 'minimal',
    vatEnabled: true,
    sampleProducts: [],
    sampleServices: [
      { name: 'Consultation', unitPrice: 1200, description: 'Initial consultation', slaHours: 2 },
      { name: 'Retainer (Monthly)', unitPrice: 8500, description: 'Monthly professional retainer', slaHours: 15 }
    ],
    terms: 'Fees are due on presentation of invoice. Interest may be charged on overdue amounts.'
  },
  {
    id: 'construction',
    name: 'Construction & Trades',
    icon: 'hammer',
    desc: 'Builders, electricians, plumbers, contractors',
    colour: 'gold',
    template: 'bold',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Materials', unitPrice: 0, description: 'Materials as quoted', sku: 'MAT' }
    ],
    sampleServices: [
      { name: 'Labour (Day)', unitPrice: 1800, description: 'Skilled labour per day' },
      { name: 'Call-out Fee', unitPrice: 450, description: 'Standard call-out' }
    ],
    terms: 'Deposit required before work commences. Balance due on completion. COD available on request.'
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Events',
    icon: 'utensils',
    desc: 'Catering, venues, events & tourism',
    colour: 'purple',
    template: 'classic',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Package A', unitPrice: 350, description: 'Per person package' }
    ],
    sampleServices: [
      { name: 'Event Coordination', unitPrice: 5000, description: 'Full event coordination' },
      { name: 'Venue Hire (Day)', unitPrice: 8500, description: 'Venue hire per day' }
    ],
    terms: '50% deposit to secure booking. Final numbers 7 days prior. Cancellation policy applies.'
  },
  {
    id: 'enterprise',
    name: 'Enterprise / Corporate',
    icon: 'building-2',
    desc: 'Larger companies, multi-department, B-BBEE focused',
    colour: 'navy',
    template: 'modern',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Enterprise Licence', unitPrice: 25000, description: 'Annual software licence', sku: 'ENT-LIC' }
    ],
    sampleServices: [
      { name: 'Implementation', unitPrice: 45000, description: 'Project implementation', slaHours: 80 },
      { name: 'Support SLA (Gold)', unitPrice: 12000, description: 'Priority support package', slaHours: 40, category: 'IT Support' }
    ],
    terms: 'Payment terms: 30 days from invoice date. Purchase order required. B-BBEE level available on request.'
  },

  {
    id: 'health',
    name: 'Health & Wellness',
    icon: 'heart',
    desc: 'Clinics, therapists, gyms, beauty & spas',
    colour: 'teal',
    template: 'minimal',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Product / Retail Item', unitPrice: 250, description: 'Retail product', sku: 'HW-01', stock: 20 }
    ],
    sampleServices: [
      { name: 'Consultation', unitPrice: 650, description: 'Initial consultation', slaHours: 1 },
      { name: 'Session / Treatment', unitPrice: 450, description: 'Standard session' },
      { name: 'Monthly Membership', unitPrice: 799, description: 'Monthly membership', slaHours: 0 }
    ],
    terms: 'Appointments cancelled with less than 24h notice may be charged. Payment on the day of service unless otherwise arranged.'
  },
  {
    id: 'education',
    name: 'Education & Training',
    icon: 'graduation-cap',
    desc: 'Schools, tutors, training providers, e-learning',
    colour: 'blue',
    template: 'modern',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Course Material Pack', unitPrice: 350, description: 'Printed / digital materials', sku: 'EDU-MAT' }
    ],
    sampleServices: [
      { name: 'Course Fee', unitPrice: 4500, description: 'Full course enrolment' },
      { name: 'Private Tutoring (Hour)', unitPrice: 350, description: 'One-on-one tutoring', slaHours: 1 },
      { name: 'Workshop (Day)', unitPrice: 1800, description: 'Full-day workshop' }
    ],
    terms: 'Fees are non-refundable once the course has commenced. Certificates issued on successful completion.'
  },
  {
    id: 'transport',
    name: 'Transport & Logistics',
    icon: 'truck',
    desc: 'Couriers, fleet, removals, delivery services',
    colour: 'orange',
    template: 'bold',
    vatEnabled: true,
    sampleProducts: [],
    sampleServices: [
      { name: 'Local Delivery', unitPrice: 180, description: 'Same-day local delivery' },
      { name: 'Long Distance (per km)', unitPrice: 8.50, description: 'Rate per kilometre' },
      { name: 'Full Load / Relocation', unitPrice: 5500, description: 'Full load or household move' }
    ],
    terms: 'Quotes valid for 7 days. COD available. Waiting time charged after 30 minutes.'
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Farming',
    icon: 'leaf',
    desc: 'Farms, agri-supplies, livestock & produce',
    colour: 'green',
    template: 'classic',
    vatEnabled: true,
    sampleProducts: [
      { name: 'Produce / Batch', unitPrice: 0, description: 'As quoted per batch', sku: 'AGRI', stock: 100 },
      { name: 'Feed / Supplies', unitPrice: 450, description: 'Standard feed bag', sku: 'FEED', stock: 50 }
    ],
    sampleServices: [
      { name: 'Delivery / Transport', unitPrice: 850, description: 'Farm delivery' },
      { name: 'Consulting (Hour)', unitPrice: 750, description: 'Agricultural consulting' }
    ],
    terms: 'Prices subject to market fluctuations. Payment terms: 14 days unless COD agreed.'
  },
  {
    id: 'creative',
    name: 'Creative & Media',
    icon: 'palette',
    desc: 'Designers, photographers, video, marketing agencies',
    colour: 'purple',
    template: 'modern',
    vatEnabled: true,
    sampleProducts: [],
    sampleServices: [
      { name: 'Design Project', unitPrice: 3500, description: 'Brand / design package' },
      { name: 'Photography (Half Day)', unitPrice: 2800, description: 'Half-day shoot' },
      { name: 'Retainer (Monthly)', unitPrice: 9500, description: 'Ongoing creative retainer', slaHours: 20 }
    ],
    terms: '50% deposit required to commence work. Final files released on full payment. Usage rights as per agreement.'
  },
  {
    id: 'custom',
    name: 'Custom / Blank',
    icon: 'settings',
    desc: 'Start completely fresh – configure everything yourself',
    colour: 'green',
    template: 'classic',
    vatEnabled: true,
    sampleProducts: [],
    sampleServices: [],
    terms: 'Payment due within 30 days. Thank you for your business.'
  }
];

window.applyBusinessTemplate = async function(templateId) {
  const t = BUSINESS_TEMPLATES.find(x => x.id === templateId);
  if (!t) return;
  await DB.setSetting('businessTemplate', templateId);
  await DB.setSetting('accent', t.colour);
  await DB.setSetting('template', t.template);
  await DB.setSetting('vatEnabled', t.vatEnabled);
  const modules = (window.BUSINESS_MODULES && window.BUSINESS_MODULES[templateId])
    || window.DEFAULT_MODULES;
  await DB.setSetting('modules', modules);
  if (t.terms) {
    const company = await DB.getCompany() || {};
    company.terms = t.terms;
    await DB.saveCompany(company);
  }
  const products = await DB.getAll(DB.STORES.products);
  const services = await DB.getAll(DB.STORES.services);
  if (products.length === 0 && t.sampleProducts && t.sampleProducts.length) {
    for (const p of t.sampleProducts) await DB.add(DB.STORES.products, p);
  }
  if (services.length === 0 && t.sampleServices && t.sampleServices.length) {
    for (const s of t.sampleServices) await DB.add(DB.STORES.services, s);
  }
  return t;
};

window.BUSINESS_MODULES = {
  'agriculture': { invoices:true, quotes:true, tickets:false, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:false, sla:false, pos:false, popia:true, payroll:false },
  'construction': { invoices:true, quotes:true, tickets:true, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:true, sla:false, pos:false, popia:true, payroll:false },
  'creative': { invoices:true, quotes:true, tickets:false, clients:true, products:false, services:true, expenses:true, reports:true, stock:false, timeTracking:false, sla:false, pos:false, popia:true, payroll:false },
  'custom': { invoices:true, quotes:true, tickets:true, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:true, sla:true, pos:false, popia:true, payroll:true },
  'education': { invoices:true, quotes:true, tickets:false, clients:true, products:true, services:true, expenses:true, reports:true, stock:false, timeTracking:false, sla:false, pos:false, popia:true, payroll:true },
  'enterprise': { invoices:true, quotes:true, tickets:true, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:true, sla:true, pos:false, popia:true, payroll:true },
  'health': { invoices:true, quotes:false, tickets:false, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:false, sla:false, pos:false, popia:true, payroll:true },
  'hospitality': { invoices:true, quotes:true, tickets:false, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:false, sla:false, pos:false, popia:true, payroll:true },
  'it-services': { invoices:true, quotes:true, tickets:true, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:true, sla:true, pos:false, popia:true, payroll:true },
  'professional': { invoices:true, quotes:true, tickets:false, clients:true, products:false, services:true, expenses:true, reports:true, stock:false, timeTracking:false, sla:false, pos:false, popia:true, payroll:true },
  'retail': { invoices:true, quotes:false, tickets:false, clients:true, products:true, services:false, expenses:true, reports:true, stock:true, timeTracking:false, sla:false, pos:true, popia:true, payroll:false },
  'startup': { invoices:true, quotes:true, tickets:false, clients:true, products:true, services:true, expenses:true, reports:true, stock:true, timeTracking:false, sla:false, pos:false, popia:true, payroll:true },
  'transport': { invoices:true, quotes:true, tickets:false, clients:true, products:false, services:true, expenses:true, reports:true, stock:false, timeTracking:false, sla:false, pos:false, popia:true, payroll:false },
};

window.DEFAULT_MODULES = {
  invoices:true, quotes:true, tickets:true, clients:true,
  products:true, services:true, expenses:true, reports:true,
  stock:true, timeTracking:true, sla:true, pos:false, popia:true, payroll:false
};
