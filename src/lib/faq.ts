import type { FaqCategory } from '@/types'

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    category: 'General',
    items: [
      {
        question: 'What areas do you service?',
        answer: "We service all of Auckland, including the North Shore, West Auckland, South Auckland, and the CBD. Not sure if we cover your area? Get in touch and we'll confirm.",
      },
      {
        question: 'Are your cleaners insured?',
        answer: 'Yes. All Sano cleaners are fully insured and have passed background checks. We carry public liability insurance for every job.',
      },
      {
        question: 'Do I need to be home during the clean?',
        answer: "Not at all. Many of our clients provide a key or door code. We're fully trusted and insured, so you can head out and come home to a clean space.",
      },
    ],
  },
  {
    category: 'Booking',
    items: [
      {
        question: 'How do I book a clean?',
        answer: "Fill in our quote form and we'll get back to you within a few hours to confirm your booking. You can also call or email us directly.",
      },
      {
        question: 'How much notice do I need to give?',
        answer: 'We can often accommodate bookings with 24–48 hours notice. For end of tenancy or post-construction cleans, 3–5 days is preferred.',
      },
      {
        question: 'Can I reschedule or cancel?',
        answer: 'Yes. We ask for at least 24 hours notice for rescheduling or cancellations. Late cancellations (under 24 hours) may incur a small fee.',
      },
    ],
  },
  {
    category: 'Pricing',
    items: [
      {
        question: 'How is pricing calculated?',
        answer: 'Pricing depends on the size of your property, the service type, and any add-ons. We provide a fixed quote before every job — no surprises.',
      },
      {
        question: 'Do you charge by the hour or by the job?',
        answer: 'We charge by the job, not by the hour. This means you get a consistent result every time, regardless of how long it takes.',
      },
      {
        question: 'Is there a discount for regular bookings?',
        answer: 'Yes — clients on a recurring weekly or fortnightly schedule receive a discounted rate. Ask about our regular clean pricing when you get a quote.',
      },
    ],
  },
  {
    category: 'Our Cleaners',
    items: [
      {
        question: 'How do you vet your cleaners?',
        answer: 'Every cleaner goes through an in-person interview, reference checks, and a police background check before joining Sano. We then provide full training.',
      },
      {
        question: 'Will I get the same cleaner each time?',
        answer: "We do our best to send the same cleaner for recurring bookings. If your regular cleaner is unavailable, we'll let you know and introduce a replacement.",
      },
    ],
  },
  {
    category: 'Products',
    items: [
      {
        question: 'What cleaning products do you use?',
        answer: 'We use eco-friendly, biodegradable products that are safe for children, pets, and the environment. If you have allergies or preferences, just let us know.',
      },
      {
        question: 'Do I need to supply any equipment or products?',
        answer: "No. We bring everything we need — equipment, products, and supplies. If you'd prefer we use your own products, that's fine too.",
      },
    ],
  },
]
