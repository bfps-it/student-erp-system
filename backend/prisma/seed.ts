import { PrismaClient, TemplateType } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * BFPS ERP - Database Seed (TypeScript)
 * Creates the hardcoded Master Admin user (superadmin@bfpsedu.in)
 * and initializes essential system data.
 */

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BFPS ERP database seed...\n');

  // ============================================
  // 1. MASTER ADMIN USER (hardcoded)
  // ============================================
  const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL || 'superadmin@bfpsedu.in';
  const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD || 'BFPS@SuperAdmin2026!';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
  const passwordHash = await bcrypt.hash(masterAdminPassword, saltRounds);

  const masterAdmin = await prisma.user.upsert({
    where: { email: masterAdminEmail },
    update: {},
    create: {
      email: masterAdminEmail,
      passwordHash,
      role: 'MASTER_ADMIN',
      isActive: true,
      is2FAEnabled: false,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Master Admin created: ${masterAdmin.email} (ID: ${masterAdmin.id})`);

  // ============================================
  // 2. SYSTEM HEALTH ENTRIES
  // ============================================
  const services = [
    'database',
    'redis',
    'cloudinary',
    'razorpay',
    'smtp',
    'imap-leave',
    'imap-career',
    'imap-contact',
    'firebase',
    'twilio',
    'sentry',
  ];

  for (const service of services) {
    await prisma.systemHealth.upsert({
      where: { service },
      update: {},
      create: {
        service,
        status: 'unknown',
        lastCheckedAt: new Date(),
      },
    });
  }

  console.log(`✅ System health entries created for ${services.length} services`);

  // ============================================
  // 3. DEFAULT SMS TEMPLATES
  // ============================================
  const templates = [
    {
      name: 'attendance_absent',
      templateType: 'ATTENDANCE' as TemplateType,
      bodyEn: 'Dear Parent, your child {{studentName}} of {{className}} was marked absent on {{date}}. Contact school for details. - BFPS',
      bodyHi: 'प्रिय अभिभावक, आपका बच्चा {{studentName}} कक्षा {{className}} में {{date}} को अनुपस्थित चिह्नित किया गया। विवरण के लिए स्कूल से संपर्क करें। - BFPS',
      variables: ['studentName', 'className', 'date'],
    },
    {
      name: 'fee_reminder',
      templateType: 'FEE' as TemplateType,
      bodyEn: 'Dear Parent, fee payment of Rs. {{amount}} for {{studentName}} ({{className}}) is pending. Please pay by {{dueDate}}. - BFPS',
      bodyHi: 'प्रिय अभिभावक, {{studentName}} ({{className}}) की Rs. {{amount}} फीस बकाया है। कृपया {{dueDate}} तक भुगतान करें। - BFPS',
      variables: ['studentName', 'className', 'amount', 'dueDate'],
    },
    {
      name: 'fee_received',
      templateType: 'FEE' as TemplateType,
      bodyEn: 'Dear Parent, Rs. {{amount}} received for {{studentName}} ({{className}}). Receipt: {{receiptNo}}. Thank you! - BFPS',
      bodyHi: 'प्रिय अभिभावक, {{studentName}} ({{className}}) के लिए Rs. {{amount}} प्राप्त हुआ। रसीद: {{receiptNo}}। धन्यवाद! - BFPS',
      variables: ['studentName', 'className', 'amount', 'receiptNo'],
    },
    {
      name: 'leave_status_update',
      templateType: 'LEAVE' as TemplateType,
      bodyEn: 'Dear {{teacherName}}, your leave request ({{ticketId}}) from {{fromDate}} to {{toDate}} has been {{status}}. - BFPS',
      bodyHi: 'प्रिय {{teacherName}}, आपका अवकाश अनुरोध ({{ticketId}}) {{fromDate}} से {{toDate}} तक {{status}} कर दिया गया है। - BFPS',
      variables: ['teacherName', 'ticketId', 'fromDate', 'toDate', 'status'],
    },
    {
      name: 'general_notification',
      templateType: 'GENERAL' as TemplateType,
      bodyEn: '{{message}} - Baba Farid Public School',
      bodyHi: '{{message}} - बाबा फरीद पब्लिक स्कूल',
      variables: ['message'],
    },
  ];

  for (const template of templates) {
    await prisma.sMSTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: {
        name: template.name,
        templateType: template.templateType,
        bodyEn: template.bodyEn,
        bodyHi: template.bodyHi,
        variables: template.variables,
        isActive: true,
      },
    });
  }

  console.log(`✅ SMS templates created: ${templates.length} templates`);

  // ============================================
  // 4. DEFAULT SCHOOL CONTENT (CMS)
  // ============================================
  const cmsDefaults = [
    { key: 'school_name', value: 'Baba Farid Public School', dataType: 'text' },
    { key: 'school_tagline', value: 'Join & Grow With Us', dataType: 'text' },
    { key: 'school_vision', value: 'Empowering Education to Discover the Universe', dataType: 'text' },
    { key: 'school_mission', value: 'To provide quality education with holistic development, fostering innovation, discipline, and character building in every student.', dataType: 'text' },
    { key: 'school_address', value: 'Killianwali to Wring Khera Road, Punjab', dataType: 'text' },
    { key: 'school_phone_1', value: '93152-00786', dataType: 'text' },
    { key: 'school_phone_2', value: '93159-00786', dataType: 'text' },
    { key: 'school_email', value: 'info@bfpsedu.in', dataType: 'text' },
    { key: 'school_board', value: 'ICSE/ISC', dataType: 'text' },
    { key: 'school_code', value: 'PU170', dataType: 'text' },
    { key: 'admission_open', value: 'true', dataType: 'boolean' },
    { key: 'admission_session', value: '2026-27', dataType: 'text' },
    { key: 'admission_ticker', value: 'Admissions Open for 2026-27 | Call 93152-00786', dataType: 'text' },
  ];

  for (const item of cmsDefaults) {
    await prisma.schoolContent.upsert({
      where: { key: item.key },
      update: {},
      create: item,
    });
  }

  console.log(`✅ CMS defaults created: ${cmsDefaults.length} entries`);

  // ============================================
  // 5. DEFAULT WEBSITE STATISTICS
  // ============================================
  const statistics = [
    { label: 'Students', value: '500+', icon: 'users', displayOrder: 1 },
    { label: 'Teachers', value: '40+', icon: 'graduation-cap', displayOrder: 2 },
    { label: 'Years', value: '10+', icon: 'calendar', displayOrder: 3 },
    { label: 'Achievements', value: '100+', icon: 'trophy', displayOrder: 4 },
  ];

  for (const stat of statistics) {
    const existing = await prisma.websiteStatistic.findFirst({
      where: { label: stat.label },
    });
    if (!existing) {
      await prisma.websiteStatistic.create({ data: stat });
    }
  }

  console.log(`✅ Website statistics created: ${statistics.length} entries`);

  // ============================================
  // 6. CHATBOT FAQ DEFAULTS
  // ============================================
  const faqs = [
    { question: 'What board is BFPS affiliated with?', answer: 'Baba Farid Public School is affiliated with the ICSE/ISC Board (Council for the Indian School Certificate Examinations). Our school code is PU170.', category: 'General', displayOrder: 1 },
    { question: 'How can I apply for admission?', answer: 'You can apply online through our website at www.bfpsedu.in or visit the school campus. Call 93152-00786 for more details.', category: 'Admissions', displayOrder: 2 },
    { question: 'What are the school timings?', answer: 'School timings are 8:00 AM to 2:30 PM (Monday to Saturday). Winter timings may vary.', category: 'General', displayOrder: 3 },
    { question: 'How can I pay fees online?', answer: 'You can pay fees through the BFPS ERP system at erp.bfpsedu.in or through the BFPS mobile app. We accept all major payment methods via Razorpay.', category: 'Fees', displayOrder: 4 },
    { question: 'How to contact the school?', answer: 'Call us at 93152-00786 or 93159-00786, email info@bfpsedu.in, or visit us at Killianwali to Wring Khera Road, Punjab.', category: 'Contact', displayOrder: 5 },
  ];

  for (const faq of faqs) {
    const existing = await prisma.chatbotFAQ.findFirst({
      where: { question: faq.question },
    });
    if (!existing) {
      await prisma.chatbotFAQ.create({ data: { ...faq, isActive: true } });
    }
  }

  console.log(`✅ Chatbot FAQs created: ${faqs.length} entries`);

  console.log('\n🎉 Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
