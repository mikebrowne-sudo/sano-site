# Blog — Design Spec
**Date:** 2026-04-14

## Overview

Add a `/blog` index page and five individual post pages (`/blog/[slug]`) to the Sano site. Layout follows the Enhanced Cleaning reference style: hero banner matching the home page, 3-column card grid, individual post pages with a clean article layout.

---

## Data

**File:** `src/lib/blog.ts`

Exports a `POSTS` array of type `BlogPost[]`. No CMS — content is static TypeScript data.

```typescript
interface BlogPost {
  slug: string
  title: string
  date: string           // e.g. "1 APRIL 2026" (stored in display format)
  excerpt: string
  image: string          // e.g. "/blog/right-cleaner-for-office.jpg"
  intro: string
  sections: { heading: string; body: string }[]
  conclusion: { heading: string; body: string }
}
```

**The 5 posts (ordered by date, oldest first):**

### 1. How Choosing the Right Cleaner for Your Office Can Save You Money
- slug: `right-cleaner-for-office`
- date: `1 APRIL 2026`
- image: `/blog/right-cleaner-for-office.jpg`
- excerpt: Most business owners see cleaning as just another expense. In reality, the right cleaner makes a noticeable difference to how your workplace runs day to day.
- intro: Most business owners see cleaning as just another expense. Something that needs to be done, but not something that really impacts the business. In reality, the right cleaner can make a noticeable difference to how your workplace runs day to day and the wrong one can quietly cost you more than you think.
- sections:
  1. **Fewer Sick Days** — A properly cleaned office helps reduce the spread of germs across your team. High touch surfaces like door handles, keyboards, light switches, and shared kitchen areas are where bacteria builds up fastest. When these are cleaned thoroughly and consistently, people tend to get sick less often. It's one of the first things that stands out when a clean is being done properly.
  2. **Your Furniture and Fixtures Last Longer** — Dust and grime slowly wear down carpets, desks, and fittings over time. Without regular attention, things start to look tired much sooner than they should. Ongoing, consistent cleaning helps protect those surfaces and keeps your workspace looking sharp for longer. It's a small detail that can save you from replacing things earlier than expected.
  3. **First Impressions Matter** — When someone walks into your office, they notice more than you think. A clean, well presented space gives off a sense of organisation and professionalism straight away. On the other hand, dusty surfaces or an untidy kitchen can leave the wrong impression. It's often the smaller details that people pick up on.
  4. **The Hidden Cost of Cheap Cleaning** — Going with the lowest price can seem like an easy win, but it often leads to frustration. Missed areas, inconsistent results, and poor communication tend to come with it. Over time, you end up spending more time managing the cleaner than you would if the job was just done properly in the first place.
  5. **Consistency Saves Time** — When the cleaning is done right every time, it becomes something you don't have to think about. No checking if things have been missed, no complaints from staff, no last minute stress before someone visits the office. That level of consistency is where the real value sits.
  6. **What to Look For** — A good office cleaner should be clear about what's included, easy to deal with, and reliable week to week. They should be insured, have a solid track record, and be quick to respond if something needs attention. Just as important, they should take pride in getting the small details right, not just the obvious ones.
- conclusion heading: It's not just about cleaning, it's about reliability
- conclusion body: A lot of businesses have had a poor experience with cleaning at some point, which is why expectations can be low. But when it's done properly, it takes one more thing off your plate and keeps your workplace running the way it should. If you'd rather not spend time chasing cleaning issues or checking if things have been done, that's where having the right team in place makes all the difference.

### 2. 12 Common Areas People Forget to Clean Around the House
- slug: `12-common-areas`
- date: `3 APRIL 2026`
- image: `/blog/12-common-areas.jpg`
- excerpt: Even if you stay on top of your cleaning, there are always a few spots that slip through the cracks — quietly collecting dust, grime, and bacteria.
- intro: Even if you stay on top of your cleaning, there are always a few spots that slip through the cracks. Over time, these areas quietly collect dust, grime, and bacteria without you really noticing. These are the kinds of details that often separate a quick tidy from a proper, thorough clean. Here are twelve of the most commonly missed places and how to stay on top of them.
- sections (12 numbered):
  1. **Skirting Boards** — Skirting boards tend to fly under the radar. Because they sit low and out of direct sight, they don't always get the attention they need. A quick wipe every couple of weeks helps, but they're one of those areas that make a noticeable difference when cleaned properly.
  2. **Light Switches and Door Handles** — These are touched constantly throughout the day, yet rarely cleaned. They can build up a surprising amount of grime. It only takes a quick wipe, but it's also one of the first things picked up during a detailed clean because of how quickly they collect bacteria.
  3. **The Top of the Fridge** — Most people never look up there. Over time, it collects a layer of dust and grease, especially in busy kitchens. It's easy to forget, but it's one of those spots that stands out straight away once it's been properly cleaned.
  4. **Behind the Toilet** — While the main surfaces get cleaned regularly, the base and the area behind the toilet are often overlooked. It's a tight space and not the easiest to get to, which is why it's commonly missed during a quick clean.
  5. **Ceiling Fan Blades** — Fans are great for airflow, but they also gather dust fast. Once switched on, that dust spreads around the room. Wiping them down regularly helps, but it's another one of those jobs that tends to get pushed down the list.
  6. **Under Couch Cushions** — Lift up your cushions and you'll usually find a mix of crumbs, dust, and the odd missing item. It's an easy area to forget about, but a quick vacuum and wipe underneath can make a big difference to how clean the space feels.
  7. **Exhaust Fans** — Bathroom and kitchen exhaust fans pull in moisture and grease, which means they clog up over time. If they're not cleaned, they won't work properly and that can lead to issues like mould.
  8. **Window Tracks** — Windows might be cleaned, but the tracks are often forgotten. Dirt, debris, and even insects can build up in there. It's a small detail, but one that really finishes off a space when it's done properly.
  9. **Dishwasher Interior and Seals** — Even though it cleans your dishes, the dishwasher itself needs attention. Residue builds up around seals and filters. Running an empty cycle with vinegar helps, but it's another one of those things that's easy to overlook.
  10. **Bin Lids and Surrounds** — Taking the rubbish out doesn't clean the bin itself. The lid and inside can hold onto bacteria and smells. It only takes a few minutes to clean, but it's rarely top of mind.
  11. **Lamp Shades and Light Fixtures** — Dust settles on anything above eye level, including lights and shades. It's easy to miss, but once they're cleaned, it lifts the whole room.
  12. **Washing Machine Rubber Seal** — Front loaders have a rubber seal that traps moisture and debris. If it's not cleaned, it can develop mould. It's a small job, but one that makes a big difference over time.
- conclusion heading: It's the small things that add up
- conclusion body: Most people keep on top of the basics, but it's these smaller, easy-to-miss areas that really change how clean a home feels. They're also the first things to get skipped when you're short on time. If you'd rather not spend your weekends chasing all the little details, that's exactly where a proper clean makes the difference.

### 3. 6 Things to Know Before Hiring a House Cleaner in Auckland
- slug: `6-things-to-know`
- date: `7 APRIL 2026`
- image: `/blog/6-things-to-know.jpg`
- excerpt: Not all cleaning services are the same. Whether it's your first time or you've had a mixed experience before, here's what to look for.
- intro: Hiring a house cleaner can be one of the best decisions you make for your home and your time. But not all cleaning services are the same. Whether it's your first time or you've had a mixed experience before, it's worth knowing what to look for so you end up with the right fit.
- sections (6 numbered):
  1. **Check If They're Insured** — This is a must. If something gets damaged or there's an accident on site, you want to know you're covered. Any reputable cleaning company should have public liability insurance and be happy to show you. It's one of the first signs you're dealing with a professional setup.
  2. **Ask About Background Checks** — You're trusting someone to come into your home, sometimes when you're not there. It's completely fair to ask how cleaners are vetted. Good operators take this seriously and have processes in place to make sure the people they send are reliable.
  3. **Understand What's Included** — "General clean" can mean different things depending on the company. Some include ovens, windows, or internal cupboards, others don't. Getting a clear breakdown upfront avoids any confusion later. It also gives you a better idea of how thorough the clean will actually be.
  4. **Ask About Their Guarantee** — No cleaner gets everything perfect every time. What matters is how they handle it if something's missed. A solid satisfaction guarantee shows they stand behind their work and are willing to come back and sort things out if needed.
  5. **Be Careful With Prices That Seem Too Low** — If a quote comes in well under the rest, there's usually a reason. It can mean corners are being cut, insurance isn't in place, or the job isn't being done properly. A good clean takes time, effort, and the right setup. Paying a fair rate generally leads to a much better result.
  6. **Communication Makes a Big Difference** — The experience you have before booking often reflects what it'll be like long term. Quick responses, clear answers, and easy communication go a long way. It's especially important when something needs adjusting or following up later on.
- conclusion heading: It comes down to trust and consistency
- conclusion body: A lot of people have tried a cleaner at some point and not had a great experience. Usually it comes down to missed details, poor communication, or inconsistency over time. When you find a team that gets the small things right and shows up consistently, it makes life a lot easier. At Sano, we focus on exactly that. Fully insured, carefully vetted, and backed by a satisfaction guarantee. If you're looking for a reliable house cleaner in Auckland, we're always happy to have a chat or put together a no obligation quote.

### 4. 5 Simple Cleaning Hacks Using What You Already Have at Home
- slug: `5-cleaning-hacks`
- date: `9 APRIL 2026`
- image: `/blog/5-cleaning-hacks.jpg`
- excerpt: You don't always need expensive products to get good results. Some of the most effective cleaning solutions are already sitting in your kitchen.
- intro: You don't always need expensive products to get good results. Some of the most effective cleaning solutions are already sitting in your kitchen. These are a few simple tricks that actually work and are great for keeping things on top between proper cleans.
- sections (5 numbered):
  1. **Steam Clean Your Microwave With Lemon** — Cut a lemon in half and squeeze the juice into a microwave safe bowl with about a cup of water. Drop the lemon halves in as well. Microwave on high for five minutes, then leave the door closed for another couple of minutes so the steam can loosen everything up. Once you open it, the buildup wipes away easily.
  2. **Unclog Your Drains With Baking Soda and Vinegar** — Pour half a cup of baking soda down the drain, followed by half a cup of white vinegar. It'll fizz up as it breaks down the buildup inside the pipes. Leave it for about 30 minutes, then flush it through with boiling water. It's a simple way to keep things flowing without relying on harsh chemicals.
  3. **Remove Hard Water Stains With Vinegar** — If your shower glass or tapware has that cloudy white buildup, soak a cloth in white vinegar and leave it over the area for 15 to 20 minutes. The vinegar helps break down the mineral deposits so they wipe off more easily.
  4. **Freshen Your Mattress With Baking Soda** — Take the sheets off, sprinkle baking soda across the mattress, and leave it for at least 30 minutes. It helps absorb moisture and neutralise any smells. Vacuum it off and you'll notice the difference straight away.
  5. **Clean Stainless Steel With Olive Oil** — For fingerprints and smudges on stainless steel, use a small amount of olive oil on a microfibre cloth and wipe with the grain. It lifts marks and leaves a nice finish. It's a quick fix that works surprisingly well for keeping appliances looking tidy day to day.
- conclusion heading: Good for maintenance, but not a full reset
- conclusion body: These kinds of tricks are great for staying on top of things and keeping your home feeling clean. Where it tends to fall short is when things build up over time. That's when a proper, thorough clean makes the biggest difference, especially in areas that don't get touched as often. If you'd rather not spend time trying to stay on top of it all, that's where having a reliable team step in can take it off your plate.

### 5. 5 Practical Tips for Keeping Your Home Clean in Auckland
- slug: `5-practical-tips`
- date: `13 APRIL 2026`
- image: `/blog/5-practical-tips.jpg`
- excerpt: Between damp conditions and changing weather, it doesn't take long for things to build up. These simple habits make a real difference day to day.
- intro: Keeping your home clean in Auckland comes with its own challenges. Between damp conditions, changing weather, and a bit of everything being tracked inside, it doesn't take long for things to build up. These are a few simple habits that make a real difference day to day.
- sections (5 numbered):
  1. **Start High, Work Down** — Always clean from the top of the room first. Dust ceiling fans, light fittings, and shelves before moving down to benches and then floors. It saves you from redoing work and helps make sure everything gets picked up properly.
  2. **Microfibre Goes a Long Way** — A good set of microfibre cloths makes cleaning a lot easier. They pick up dust and grime more effectively than standard cloths and usually don't need much more than water. It's a simple upgrade that improves results straight away.
  3. **Don't Skip the Skirting Boards** — Skirting boards are easy to overlook, but they collect more dust than you'd expect. Giving them a quick wipe every couple of weeks helps lift the overall feel of a room. It's one of those small details that makes a noticeable difference when it's done properly.
  4. **Keep Your Cleaning Gear Clean** — It's easy to forget that your tools need cleaning too. Vacuum filters, mop heads, and cloths all hold onto dirt over time. If they're not cleaned regularly, you end up spreading grime rather than removing it.
  5. **Let the Air Flow Through** — Ventilation is important, especially with Auckland's damp conditions. Opening windows while you clean helps surfaces dry properly and reduces the chance of musty smells or moisture hanging around.
- conclusion heading: It's the consistency that makes the difference
- conclusion body: Most of these are simple habits, but staying on top of them consistently is where it can get tricky. Life gets busy, and it's usually the smaller details that get missed first. That's often where a proper clean stands out. When everything's done thoroughly and regularly, the whole space just feels different. If you'd rather not have to think about it, we're always here to help with a reliable, no fuss clean across Auckland.

---

## Blog Index Page (`/blog`)

**File:** `src/app/blog/page.tsx`

### Hero
Uses the existing `HeroSection` component with:
- `imageUrl`: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80` (same as home page)
- `headline`: `Cleaning Advice for Auckland Homes`
- `badge`: `Tips & Guides`
- `subtext`: `Practical tips, guides, and insights to help you keep your space clean and well-maintained.`
- `showSecondaryButton`: `false`
- Text centred — override HeroSection to centre-align content for this use

**Note:** HeroSection currently left-aligns content. Add an optional `centred?: boolean` prop — when true, `text-center` and `mx-auto` on content container.

### Card Grid
- 3-column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, gap-7)
- 5th card centred: `lg:col-start-2` on last item
- Cards link to `/blog/[slug]`

### Blog Card
Each card:
- Featured image (200px height, `object-cover`)
- Date: uppercase, `text-[11px] font-semibold tracking-wide text-gray-400`
- Title: `text-[15px] font-bold text-sage-800`
- Excerpt: `text-[13px] text-gray-500 leading-relaxed`
- Hover: `scale-[1.03]` + deeper shadow, `transition duration-250`
- Entire card is a `<Link>` wrapping the content

---

## Individual Post Page (`/blog/[slug]`)

**File:** `src/app/blog/[slug]/page.tsx`

### Layout
- No hero — instead a full-width featured image at top (same `h-[380px]` as HeroSection, `object-cover`)
- Dark gradient overlay on image
- Post title and date overlaid on image, left-aligned, bottom of image
- Article body: `max-w-2xl mx-auto` container, `section-padding py-16`

### Article body structure
1. Intro paragraph — `text-[16px] text-gray-600 leading-relaxed mb-8`
2. Sections — each section:
   - `<h2>` heading: `text-[18px] font-bold text-sage-800 mt-8 mb-3`
   - Body paragraph: `text-[16px] text-gray-600 leading-relaxed`
3. Conclusion — horizontal rule, conclusion heading as `<h2>`, body paragraph
4. CTA Banner — reuse existing `<CtaBanner />` component at bottom

### Metadata
Generate per-post `metadata` using `generateMetadata` with title `[Post Title] | Sano Blog` and description from excerpt.

### Static params
`generateStaticParams` exports all slugs from `POSTS`.

### 404 handling
If slug not found in POSTS, call `notFound()`.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/blog.ts` | Create — POSTS data array |
| `src/components/HeroSection.tsx` | Modify — add optional `centred` prop |
| `src/app/blog/page.tsx` | Create — blog index |
| `src/app/blog/[slug]/page.tsx` | Create — individual post |
| `public/blog/` | Already populated with 5 images |

---

## Out of Scope
- Search or filtering
- Pagination
- Comments
- Categories/tags
- RSS feed
