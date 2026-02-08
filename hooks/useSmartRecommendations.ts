
import { useMemo } from 'react';
import { Session, SyllabusData } from '../types';

const MIN_ATTEMPTS_FOR_RECOMMENDATION = 20;
const ACCURACY_THRESHOLD = 0.6; // 60%

export interface Recommendation {
  subject: string;
  topic: string;
  accuracy: number; // -1 indicates an unpracticed topic
}

export const useSmartRecommendations = (
  sessions: Session[], 
  syllabus: SyllabusData
): Recommendation | null => {
  return useMemo(() => {
    if (!sessions || !syllabus || Object.keys(syllabus).length === 0) {
      return null;
    }

    const topicStats: Record<string, { attempted: number; correct: number }> = {};

    // 1. Aggregate stats for every topic from sessions
    for (const session of sessions) {
      if(session.topic === 'Focus Session') continue; // Ignore generic focus sessions

      const key = `${session.subject}|${session.topic}`;
      if (!topicStats[key]) {
        topicStats[key] = { attempted: 0, correct: 0 };
      }
      topicStats[key].attempted += session.attempted || 0;
      topicStats[key].correct += session.correct || 0;
    }

    // 2. Find weak topics based on accuracy and attempt count
    const weakTopics: Recommendation[] = [];
    for (const key in topicStats) {
      const stats = topicStats[key];
      if (stats.attempted >= MIN_ATTEMPTS_FOR_RECOMMENDATION) {
        const accuracy = stats.attempted > 0 ? stats.correct / stats.attempted : 0;
        if (accuracy < ACCURACY_THRESHOLD) {
          const [subject, topic] = key.split('|');
          if (syllabus[subject]?.includes(topic)) {
             weakTopics.push({ subject, topic, accuracy });
          }
        }
      }
    }

    // 3. If weak topics exist, find and return the one with the lowest accuracy
    if (weakTopics.length > 0) {
      weakTopics.sort((a, b) => a.accuracy - b.accuracy);
      return weakTopics[0];
    }

    // 4. Fallback: Find a completely unpracticed topic from the syllabus
    const allSyllabusTopics = Object.entries(syllabus).flatMap(([subject, topics]) =>
      topics.map(topic => ({ subject, topic }))
    );

    const unpracticedTopics = allSyllabusTopics.filter(({ subject, topic }) => {
      const key = `${subject}|${topic}`;
      return !topicStats[key] || topicStats[key].attempted === 0;
    });

    if (unpracticedTopics.length > 0) {
      // Return a random unpracticed topic to provide variety
      const randomIndex = Math.floor(Math.random() * unpracticedTopics.length);
      const topicToSuggest = unpracticedTopics[randomIndex];
      return { ...topicToSuggest, accuracy: -1 }; // -1 indicates it's an unpracticed recommendation
    }

    return null; // No suitable recommendations found
  }, [sessions, syllabus]);
};
