import { ITemplateTaskItem } from "@/lib/models/EventTemplate";

export interface PredefinedTemplateDefinition {
  slug: "wedding" | "conference" | "graduation" | "concert" | "gala" | string;
  name: string;
  category: string;
  description: string;
  badge: string;
  defaultBudget: number;
  defaultCapacity: number;
  tasks: ITemplateTaskItem[];
}

export const PREDEFINED_TEMPLATES: PredefinedTemplateDefinition[] = [
  {
    slug: "wedding",
    name: "Luxury Wedding & Reception",
    category: "Wedding",
    description: "End-to-end luxury wedding blueprint including tasting, florals, seating, and rehearsal.",
    badge: "Most Popular",
    defaultBudget: 75000,
    defaultCapacity: 200,
    tasks: [
      {
        title: "Finalize guest list and send formal invitations",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 45,
      },
      {
        title: "Catering menu tasting and dietary restrictions sign-off",
        category: "Vendors",
        priority: "high",
        daysBeforeEvent: 30,
      },
      {
        title: "Floral arrangements & centerpieces mock-up review",
        category: "Design",
        priority: "medium",
        daysBeforeEvent: 21,
      },
      {
        title: "Photographer & videographer shot list confirmation",
        category: "Vendors",
        priority: "medium",
        daysBeforeEvent: 14,
      },
      {
        title: "Soundcheck, microphone setup & DJ ceremony playlist check",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 7,
      },
      {
        title: "Assemble seating chart and personalized table place cards",
        category: "Logistics",
        priority: "medium",
        daysBeforeEvent: 5,
      },
      {
        title: "Wedding party processional rehearsal & dinner",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 1,
      },
      {
        title: "Day-of vendor load-in supervision & bridal suite hospitality",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 0,
      },
    ],
  },
  {
    slug: "conference",
    name: "Tech & Corporate Summit",
    category: "Conference",
    description: "High-impact enterprise conference checklist for multi-track speakers, sponsors, and AV.",
    badge: "Enterprise",
    defaultBudget: 125000,
    defaultCapacity: 500,
    tasks: [
      {
        title: "Confirm keynote speakers and collect final slide decks",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 30,
      },
      {
        title: "Venue AV testing, multi-mic podium check & stage lighting",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 14,
      },
      {
        title: "Sponsor exhibition booth mapping and collateral delivery",
        category: "Marketing",
        priority: "medium",
        daysBeforeEvent: 10,
      },
      {
        title: "Attendee badge printing & RFID lanyard check-in setup",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 5,
      },
      {
        title: "High-bandwidth wifi stress test & backup 5G router setup",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 3,
      },
      {
        title: "Catering buffet, coffee breaks & dietary station coordination",
        category: "Vendors",
        priority: "medium",
        daysBeforeEvent: 2,
      },
      {
        title: "Staff emergency exits and crowd-flow directional briefing",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 1,
      },
      {
        title: "Post-summit attendee feedback survey & speaker honorariums",
        category: "Marketing",
        priority: "low",
        daysBeforeEvent: -1,
      },
    ],
  },
  {
    slug: "graduation",
    name: "University Commencement Gala",
    category: "Graduation",
    description: "Formal academic graduation ceremony with regalia, procession, and honorary awards.",
    badge: "Academic",
    defaultBudget: 55000,
    defaultCapacity: 850,
    tasks: [
      {
        title: "Faculty academic regalia and graduate cap & gown inventory",
        category: "Logistics",
        priority: "medium",
        daysBeforeEvent: 30,
      },
      {
        title: "Graduate name phonetic pronunciation list for stage announcer",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 14,
      },
      {
        title: "Stage wheelchair ramp compliance and VIP family seating",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 10,
      },
      {
        title: "Diploma certificate printing and embossed leather folders",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 7,
      },
      {
        title: "Campus security briefing, metal detectors and EMT station",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 4,
      },
      {
        title: "Auditorium soundcheck, organist rehearsal & live broadcast test",
        category: "Program",
        priority: "medium",
        daysBeforeEvent: 2,
      },
      {
        title: "Processional assembly line marshals and queue rehearsal",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 1,
      },
      {
        title: "Post-ceremony courtyard reception & cap toss photo zone",
        category: "Vendors",
        priority: "medium",
        daysBeforeEvent: 0,
      },
    ],
  },
  {
    slug: "concert",
    name: "Live Music Concert & Festival",
    category: "Concert",
    description: "Full production live music performance blueprint including artist riders, stage rigging, and sound engineering.",
    badge: "Entertainment",
    defaultBudget: 180000,
    defaultCapacity: 2500,
    tasks: [
      {
        title: "Artist hospitality & technical rider equipment confirmation",
        category: "Vendors",
        priority: "high",
        daysBeforeEvent: 30,
      },
      {
        title: "Municipal sound permit and pyrotechnic compliance approval",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 21,
      },
      {
        title: "Stage truss rigging, line array audio & lighting truss load-in",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 3,
      },
      {
        title: "Green room hospitality stocking and artist security detail brief",
        category: "Logistics",
        priority: "medium",
        daysBeforeEvent: 1,
      },
      {
        title: "Soundcheck, wireless IEM frequency scan and decibel limit check",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 0,
      },
    ],
  },
  {
    slug: "gala",
    name: "Philanthropic Charity Gala & Auction",
    category: "Gala",
    description: "Black-tie evening fundraiser blueprint with silent auction lot curation, sponsor tables, and catering.",
    badge: "Charity",
    defaultBudget: 95000,
    defaultCapacity: 350,
    tasks: [
      {
        title: "Sponsor table host assignments and honorary patron invitations",
        category: "Logistics",
        priority: "high",
        daysBeforeEvent: 40,
      },
      {
        title: "Live auction consignment catalog printing & pledge mobile setup",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 20,
      },
      {
        title: "Sommelier wine pairing selection and tasting menu sign-off",
        category: "Vendors",
        priority: "medium",
        daysBeforeEvent: 14,
      },
      {
        title: "Red carpet step-and-repeat media wall installation",
        category: "Design",
        priority: "medium",
        daysBeforeEvent: 1,
      },
      {
        title: "Live auctioneer audio check and reserve price ledger confirmation",
        category: "Program",
        priority: "high",
        daysBeforeEvent: 0,
      },
    ],
  },
];
