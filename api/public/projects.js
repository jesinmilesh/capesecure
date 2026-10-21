/**
 * Cape Secure Solutions — Public Portfolio Projects API
 * Vercel Serverless Function: /api/public/projects
 */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    projects: [
      {
        id: 'kanyakumari-tourism',
        title: 'Kanyakumari Tourism & Coastal Travel Guide',
        category: 'Travel & Hospitality',
        description: 'Modern bilingual web portal featuring ferry schedules, sunrise/sunset countdowns, and booking integrations.',
        image: 'assets/images/portfolio/tourism-portal.webp'
      },
      {
        id: 'apex-dental-clinic',
        title: 'Apex Healthcare Clinic & Appointment System',
        category: 'Healthcare & Medical',
        description: 'HIPAA-compliant patient booking portal with instant WhatsApp confirmations and doctor availability management.',
        image: 'assets/images/portfolio/healthcare-clinic.webp'
      },
      {
        id: 'spice-haven-restaurant',
        title: 'Spice Haven Restaurant & Table Reservation',
        category: 'Food & Dining',
        description: 'Interactive digital menu, automated table reservations, and UPI payment ordering.',
        image: 'assets/images/portfolio/restaurant-menu.webp'
      }
    ]
  });
}
