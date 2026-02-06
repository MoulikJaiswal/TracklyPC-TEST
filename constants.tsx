
import React from 'react';
import { 
  Zap, 
  FlaskConical, 
  Divide, 
  Brain, 
  Timer, 
  AlertCircle, 
  Eye, 
  Wind, 
  Search,
  Moon,
  Sun,
  TreePine,
  Droplets,
  Mountain,
  Hexagon,
  ZapOff
} from 'lucide-react';
import { ThemeId } from './types';

export const JEE_SYLLABUS = {
  Physics: [
    "Physical World",
    "Units and Measurements",
    "Motion in a Straight Line",
    "Motion in a Plane",
    "Laws of Motion",
    "Work Energy and Power",
    "System of Particles and Rotational Motion",
    "Gravitation",
    "Mechanical Properties of Solids",
    "Mechanical Properties of Fluids",
    "Thermal Properties of Matter",
    "Thermodynamics",
    "Kinetic Theory",
    "Oscillations",
    "Waves",
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics"
  ],
  Chemistry: [
    "Some Basic Concepts of Chemistry",
    "Structure of Atom",
    "States of Matter",
    "Thermodynamics",
    "Equilibrium",
    "Redox Reactions",
    "Classification of Elements and Periodicity",
    "Chemical Bonding and Molecular Structure",
    "Hydrogen",
    "s-Block Elements",
    "p-Block Elements",
    "Organic Chemistry Basic Principles and Techniques",
    "Hydrocarbons",
    "Solid State",
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "Surface Chemistry",
    "General Principles and Processes of Isolation of Elements",
    "d and f Block Elements",
    "Coordination Compounds",
    "Haloalkanes and Haloarenes",
    "Alcohols Phenols and Ethers",
    "Aldehydes Ketones and Carboxylic Acids",
    "Amines",
    "Biomolecules",
    "Polymers",
    "Chemistry in Everyday Life"
  ],
  Maths: [
    "Sets",
    "Relations and Functions",
    "Trigonometric Functions",
    "Principle of Mathematical Induction",
    "Complex Numbers and Quadratic Equations",
    "Linear Inequalities",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Sequences and Series",
    "Straight Lines",
    "Conic Sections",
    "Introduction to Three Dimensional Geometry",
    "Limits and Derivatives",
    "Statistics",
    "Probability",
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
    "Continuity and Differentiability",
    "Applications of Derivatives",
    "Integrals",
    "Applications of Integrals",
    "Differential Equations",
    "Vector Algebra",
    "Three Dimensional Geometry",
    "Linear Programming"
  ]
};

export const BIOLOGY_SYLLABUS = [
  "The Living World",
  "Biological Classification",
  "Plant Kingdom",
  "Animal Kingdom",
  "Morphology of Flowering Plants",
  "Anatomy of Flowering Plants",
  "Structural Organisation in Animals",
  "Cell: The Unit of Life",
  "Biomolecules",
  "Cell Cycle and Cell Division",
  "Transport in Plants",
  "Mineral Nutrition",
  "Photosynthesis in Higher Plants",
  "Respiration in Plants",
  "Plant Growth and Development",
  "Digestion and Absorption",
  "Breathing and Exchange of Gases",
  "Body Fluids and Circulation",
  "Excretory Products and their Elimination",
  "Locomotion and Movement",
  "Neural Control and Coordination",
  "Chemical Coordination and Integration",
  "Reproduction in Organisms",
  "Sexual Reproduction in Flowering Plants",
  "Human Reproduction",
  "Reproductive Health",
  "Principles of Inheritance and Variation",
  "Molecular Basis of Inheritance",
  "Evolution",
  "Human Health and Disease",
  "Strategies for Enhancement in Food Production",
  "Microbes in Human Welfare",
  "Biotechnology: Principles and Processes",
  "Biotechnology and its Applications",
  "Organisms and Populations",
  "Ecosystem",
  "Biodiversity and Conservation",
  "Environmental Issues"
];

export const NEET_SYLLABUS = {
  Physics: JEE_SYLLABUS.Physics,
  Chemistry: JEE_SYLLABUS.Chemistry,
  Biology: BIOLOGY_SYLLABUS
};

export const ALL_SYLLABUS = {
  JEE: JEE_SYLLABUS,
  NEET: NEET_SYLLABUS
};

export const STREAM_SUBJECTS = {
  JEE: ['Physics', 'Chemistry', 'Maths'],
  NEET: ['Physics', 'Chemistry', 'Biology']
};

export const MISTAKE_TYPES = [
  { id: 'concept', label: 'Concept Gap', color: 'text-orange-400', icon: <Brain size={14} /> },
  { id: 'formula', label: 'Formula Recall', color: 'text-blue-400', icon: <Zap size={14} /> },
  { id: 'calc', label: 'Calculation/Algebra', color: 'text-rose-400', icon: <Divide size={14} /> },
  { id: 'read', label: 'Misread Question', color: 'text-emerald-400', icon: <Eye size={14} /> },
  { id: 'panic', label: 'Time Pressure', color: 'text-purple-400', icon: <Timer size={14} /> },
  { id: 'overthink', label: 'Overthinking', color: 'text-yellow-400', icon: <AlertCircle size={14} /> },
] as const;

export const THEME_CONFIG: Record<ThemeId, {
  label: string;
  description: string;
  mode: 'dark' | 'light';
  colors: {
    bg: string;
    card: string;
    accent: string; // The main branding color
    accentGlow: string;
    text: string;
  };
  icon: any;
}> = {
  'default-dark': {
    label: 'Standard Dark',
    description: 'The classic Trackly experience',
    mode: 'dark',
    colors: { bg: '#080a12', card: '#11131e', accent: '#6366f1', accentGlow: '#818cf8', text: '#f1f5f9' },
    icon: Moon
  },
  'default-light': {
    label: 'Paper White',
    description: 'Crisp, clean, and high contrast.',
    mode: 'light',
    colors: { bg: '#F8FAFC', card: '#FFFFFF', accent: '#4F46E5', accentGlow: '#6366F1', text: '#0F172A' }, // Slate-900 text, Slate-50 bg
    icon: Sun
  },
  'midnight': {
    label: 'Midnight Quiet',
    description: 'True black. The silence of space.',
    mode: 'dark',
    colors: { bg: '#000000', card: '#09090b', accent: '#FFFFFF', accentGlow: '#FFFFFF', text: '#e2e8f0' }, // Zinc-950 cards, Pure Black BG
    icon: Moon
  },
  'obsidian': {
    label: 'Obsidian Focus',
    description: 'Jet black & cyan. Sharp and serious.',
    mode: 'dark',
    colors: { bg: '#000000', card: '#121212', accent: '#06b6d4', accentGlow: '#22d3ee', text: '#e2e8f0' },
    icon: Hexagon
  },
  'void': {
    label: 'Silent Void',
    description: 'Pure darkness with neon lime accents.',
    mode: 'dark',
    colors: { bg: '#050505', card: '#111111', accent: '#84cc16', accentGlow: '#a3e635', text: '#d4d4d4' },
    icon: ZapOff
  },
  'forest': {
    label: 'Lush Forest',
    description: 'Deep moss greens & warm yellow.',
    mode: 'dark',
    colors: { bg: '#0f1f15', card: '#1a2e22', accent: '#eab308', accentGlow: '#facc15', text: '#e2e8f0' },
    icon: TreePine
  },
  'morning': {
    label: 'Morning Mist',
    description: 'Fresh sky blues and deep ocean text.',
    mode: 'light',
    colors: { bg: '#F0F9FF', card: '#FFFFFF', accent: '#0284C7', accentGlow: '#38BDF8', text: '#0C4A6E' }, // Sky-900 text, Sky-50 bg
    icon: Droplets
  },
  'earth': {
    label: 'Earthbound',
    description: 'Clay, stone & copper. Grounded.',
    mode: 'dark',
    colors: { bg: '#1c1917', card: '#292524', accent: '#d97706', accentGlow: '#fb923c', text: '#e7e5e4' },
    icon: Mountain
  }
};

export const QUOTES = [
  { text: "Success is the sum of small efforts, repeated day-in and day-out.", author: "Robert Collier" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", author: "Colin Powell" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Success doesn't come to you, you've got to go to it.", author: "Marva Collins" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Failure is the opportunity to begin again more intelligently.", author: "Henry Ford" },
  { text: "Genius is 1% inspiration and 99% perspiration.", author: "Thomas Edison" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
  { text: "If you can dream it, you can do it.", author: "Walt Disney" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" }
];

export const RECOMMENDED_RESOURCES = [
  {
    id: 'phys-1',
    title: 'Concepts of Physics (Vol 1 & 2)',
    author: 'H.C. Verma',
    description: 'The bible for JEE Physics. Excellent for building conceptual clarity and problem-solving skills.',
    tag: 'Must Have',
    color: 'indigo',
    link: 'https://www.amazon.in/Concepts-Physics-Part-1-2019-2020/dp/8177091875'
  },
  {
    id: 'chem-1',
    title: 'Physical Chemistry',
    author: 'N. Awasthi',
    description: 'Perfect for practicing numerical problems in Physical Chemistry with varying difficulty levels.',
    tag: 'Practice',
    color: 'rose',
    link: 'https://www.amazon.in/Problems-Physical-Chemistry-JEE-Main/dp/9389682336'
  },
  {
    id: 'math-1',
    title: 'Mathematics for JEE Advanced',
    author: 'Cengage (G. Tewani)',
    description: 'Comprehensive coverage of calculus, algebra, and coordinate geometry with tons of practice questions.',
    tag: 'Advanced',
    color: 'orange',
    link: 'https://www.amazon.in/Mathematics-JEE-Advanced-Set-Books/dp/9353503612'
  },
  {
    id: 'phys-2',
    title: 'Problems in General Physics',
    author: 'I.E. Irodov',
    description: 'For students aiming for a top rank. Contains challenging problems to test deep understanding.',
    tag: 'Elite',
    color: 'indigo',
    link: 'https://www.amazon.in/Problems-General-Physics-I-IRODOV/dp/9351762562'
  },
  {
    id: 'chem-2',
    title: 'Organic Chemistry',
    author: 'Morrison & Boyd',
    description: 'The gold standard for understanding reaction mechanisms and organic chemistry concepts.',
    tag: 'Concept',
    color: 'rose',
    link: 'https://www.amazon.in/Organic-Chemistry-7e-Morrison-Boyd/dp/8131704815'
  },
  {
    id: 'chem-3',
    title: 'Concise Inorganic Chemistry',
    author: 'J.D. Lee',
    description: 'Detailed explanations for Inorganic Chemistry. Covers block chemistry extensively.',
    tag: 'Reference',
    color: 'emerald',
    link: 'https://www.amazon.in/Concise-Inorganic-Chemistry-J-D-Lee/dp/8126515546'
  }
];