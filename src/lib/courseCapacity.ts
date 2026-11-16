import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Confirmed bookings are the source of truth for how many seats are taken.
 * course_instances.current_participants is a cached counter and can drift.
 */
export async function getConfirmedParticipantCounts(
  courseIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ids = [...new Set(courseIds.filter(Boolean))];
  if (ids.length === 0) return counts;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('course_id, number_of_participants')
    .in('course_id', ids)
    .eq('status', 'confirmed');

  if (error) throw error;

  for (const booking of data || []) {
    const courseId = booking.course_id as string;
    const participants = Number(booking.number_of_participants) || 0;
    counts.set(courseId, (counts.get(courseId) || 0) + participants);
  }

  return counts;
}

export async function getConfirmedParticipantCount(courseId: string): Promise<number> {
  const counts = await getConfirmedParticipantCounts([courseId]);
  return counts.get(courseId) || 0;
}

export function isCourseStillBookable(course: {
  start_date?: string | null;
  end_date?: string | null;
}, now = new Date()): boolean {
  const endDate = course.end_date ? new Date(course.end_date) : null;
  if (endDate && !Number.isNaN(endDate.getTime())) {
    return endDate > now;
  }

  const startDate = course.start_date ? new Date(course.start_date) : null;
  return Boolean(startDate && !Number.isNaN(startDate.getTime()) && startDate >= now);
}
