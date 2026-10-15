import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import PracticeQuestion from './models/PracticeQuestion.js';
import { DB_NAME } from './constant.js';

const mongoUri = process.env.MONGO_URI ? `${process.env.MONGO_URI.replace(/\/$/, '')}/${DB_NAME}` : `mongodb://localhost:27017/${DB_NAME}`;
mongoose.connect(mongoUri);

const sampleQuestions = [
  {
    subject: 'mathematics',
    topic: 'Quadratic Equations',
    difficulty: 'easy',
    classLevel: 10,
    question: 'What is the discriminant of the quadratic equation ax^2 + bx + c = 0?',
    options: ['b^2 - 4ac', 'b^2 + 4ac', '2a - 4bc', '4ac - b^2'],
    correctAnswer: 0,
    explanation: 'The discriminant determines the nature of the roots and is given by b^2 - 4ac.',
    points: 10,
    timeLimit: 30,
    source: 'teacher-curated'
  },
  {
    subject: 'mathematics',
    topic: 'Trigonometry',
    difficulty: 'medium',
    classLevel: 10,
    question: 'What is the value of sin^2(θ) + cos^2(θ)?',
    options: ['0', '1', '2', 'tan(θ)'],
    correctAnswer: 1,
    explanation: 'By the Pythagorean trigonometric identity, sin^2(θ) + cos^2(θ) = 1 for any angle θ.',
    points: 10,
    timeLimit: 30,
    source: 'teacher-curated'
  },
  {
    subject: 'science',
    topic: 'Acids, Bases and Salts',
    difficulty: 'easy',
    classLevel: 10,
    question: 'What is the pH of pure water at 25°C?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    explanation: 'Pure water is neutral and has a pH of 7 at 25°C.',
    points: 10,
    timeLimit: 30,
    source: 'teacher-curated'
  },
  {
    subject: 'science',
    topic: 'Electricity',
    difficulty: 'medium',
    classLevel: 10,
    question: 'According to Ohm’s Law, which relation between Voltage (V), Current (I), and Resistance (R) is true?',
    options: ['V = I / R', 'V = I * R', 'I = V * R', 'R = V * I'],
    correctAnswer: 1,
    explanation: 'Ohm’s Law states V = I * R.',
    points: 10,
    timeLimit: 30,
    source: 'teacher-curated'
  },
  {
    subject: 'physics',
    topic: 'Optics',
    difficulty: 'hard',
    classLevel: 10,
    question: 'A convex lens of focal length 20 cm produces a real image of the same size as the object. Where is the object placed?',
    options: ['At 20 cm', 'At 40 cm', 'At infinity', 'Between optical center and focus'],
    correctAnswer: 1,
    explanation: 'A convex lens forms an inverted, real image of the same size when the object is placed at 2F (2 * 20 cm = 40 cm).',
    points: 15,
    timeLimit: 40,
    source: 'teacher-curated'
  }
];

const seedData = async () => {
  // Check if sample user exists
  const existingUser = await User.findOne({ email: 'student@example.com' });
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const sampleUser = new User({
      name: 'Test Student',
      username: 'teststudent',
      email: 'student@example.com',
      password: hashedPassword,
      role: 'student',
      age: 16,
      class: 10,
      subjects: ['Mathematics', 'Science', 'Physics'],
      points: 100
    });
    await sampleUser.save();
    console.log('✅ Sample user seeded successfully!');
  } else {
    console.log('ℹ️ Sample user already exists.');
  }

  // Seed sample practice questions if collection empty
  const count = await PracticeQuestion.countDocuments();
  if (count === 0) {
    await PracticeQuestion.insertMany(sampleQuestions);
    console.log(`✅ Seeded ${sampleQuestions.length} practice questions into MongoDB!`);
  } else {
    console.log(`ℹ️ PracticeQuestion collection already contains ${count} questions.`);
  }

  process.exit();
};

seedData().catch((err) => {
  console.error('❌ Error seeding data:', err);
  process.exit(1);
});
