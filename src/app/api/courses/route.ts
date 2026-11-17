import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getConfirmedParticipantCounts, isCourseStillBookable } from '@/lib/courseCapacity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function descriptionExcerpt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

/** Admin list only needs a short plain-text snippet, not the full editor HTML. */
function toAdminListCourse(course: any) {
  const description = descriptionExcerpt(course.rich_description) || descriptionExcerpt(course.template?.rich_description);
  return {
    ...course,
    rich_description: description,
    template: course.template
      ? { ...course.template, rich_description: description }
      : course.template
  };
}

/**
 * One update for every published course that has already ended.
 * Replaces the previous per-course PATCH from the admin dashboard.
 */
async function unpublishFinishedCourses(courses: any[]) {
  const now = new Date();
  const finishedIds = courses
    .filter((course) => {
      if (!course.is_published || !course.end_date) return false;
      const endDate = new Date(course.end_date);
      return !Number.isNaN(endDate.getTime()) && endDate <= now;
    })
    .map((course) => course.id);

  if (finishedIds.length === 0) return courses;

  const { error } = await supabaseAdmin
    .from('course_instances')
    .update({ is_published: false })
    .in('id', finishedIds);

  if (error) {
    console.error('Failed to unpublish finished courses:', error);
    return courses;
  }

  const finished = new Set(finishedIds);
  return courses.map((course) => (
    finished.has(course.id) ? { ...course, is_published: false } : course
  ));
}

// Function to get courses (either all or only published)
const getCourses = async (published: string | null) => {
  console.log(`supabaseAdmin: Starting getCourses with published: ${published}`);
  
  try {
    // 1. Get course instances
    const instancesQuery = supabaseAdmin
      .from('course_instances')
      .select('*');
    
    // Filter by published status if specified
    if (published === 'true') {
      instancesQuery.eq('is_published', true);
    } else if (published === 'false') {
      instancesQuery.eq('is_published', false);
    }
    
    const { data: instances, error: instancesError } = await instancesQuery;

    if (instancesError) throw instancesError;
    
    if (!instances || instances.length === 0) {
      console.log('supabaseAdmin: No instances found, returning empty array');
      return [];
    }
    
    console.log(`supabaseAdmin: Found instances: ${instances.length}`);
    
    // 2. Get related templates
    const templateIds = [...new Set(instances.map(instance => instance.template_id).filter(Boolean))];
    console.log(`supabaseAdmin: Unique template IDs: ${JSON.stringify(templateIds)}`);
    
    if (templateIds.length === 0) {
      console.log('supabaseAdmin: No template IDs found, returning instances without template info');
      return instances;
    }
    
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('course_templates')
      .select(`
        *,
        category:categories (name)
      `)
      .in('id', templateIds);
    
    if (templatesError) {
      console.error('supabaseAdmin: Error fetching templates:', templatesError);
      throw templatesError;
    }
    
    console.log(`supabaseAdmin: Found templates: ${templates?.length}`);
    
    // Create a map of templates for easy lookup
    const templatesMap = templates.reduce((acc, template) => {
      // Add client-expected fields
      const processedTemplate = {
        ...template,
        title: template.categorie || '',
        is_published: template.published || false,
        category: template.category?.name || ''
      };
      acc[template.id] = processedTemplate;
      return acc;
    }, {} as Record<string, any>);
    
    // 3. Combine instances with template data
    const processedCourses = instances.map(instance => {
      const template = instance.template_id ? templatesMap[instance.template_id] : null;
      
      // Use instance-specific customizations if available, fallback to template values
      const processedCourse = {
        ...instance,
        // If we have instance-specific values, use them - otherwise, use template values
        rich_description: instance.rich_description || (template ? template.rich_description : null),
        price: instance.price || (template ? template.price : null),
        location: 'Studio Clay Norrtullsgatan 65', // Always use this fixed location
        image_url: instance.image_url || (template ? template.image_url : null), // Include image_url
        template: template ? {
          id: template.id,
          title: template.title || template.categorie || '',
          category: template.category || '',
          rich_description: template.rich_description,
          image_url: template.image_url
        } : null
      };
      
      return processedCourse;
    });
    
    const participantCounts = await getConfirmedParticipantCounts(
      processedCourses.map((course) => course.id)
    );
    const coursesWithAvailability = processedCourses.map((course) => {
      const currentParticipants = participantCounts.get(course.id) || 0;
      const maxParticipants = course.max_participants;
      return {
        ...course,
        current_participants: currentParticipants,
        availableSpots: maxParticipants !== null && maxParticipants !== undefined
          ? maxParticipants - currentParticipants
          : null
      };
    });

    // Publik lista: visa publicerade kurser tills de är slut, samma regel som admin.
    if (published === 'true') {
      const now = new Date();
      return coursesWithAvailability.filter((course) => isCourseStillBookable(course, now));
    }

    return coursesWithAvailability;
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedParam = searchParams.get('published');
    
    let courses = await getCourses(publishedParam);

    if (publishedParam === 'all') {
      courses = await unpublishFinishedCourses(courses);
      courses = courses.map(toAdminListCourse);
    }

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating new course with body:', body);

    // 1. First get the existing template if template_id is provided
    let templateId = body.template_id;
    let template;
    
    if (!templateId) {
      // 2. Create a new template if no template_id was provided
      console.log('No template_id provided, creating new template');
      const { data: newTemplate, error: templateError } = await supabaseAdmin
        .from('course_templates')
        .insert([{
          categorie: body.title || '',
          category_id: body.category_id || null,
          published: body.is_published !== undefined ? body.is_published : false,
          location: body.location || 'Studio Clay',
          image_url: body.image_url || null
        }])
        .select('*')
        .single();

      if (templateError) {
        console.error('Error creating course template:', templateError);
        return NextResponse.json({ error: templateError.message }, { status: 500 });
      }

      console.log('Created template:', newTemplate);
      template = newTemplate;
      templateId = newTemplate.id;
    } else {
      // Use existing template
      console.log('Using existing template_id:', templateId);
      const { data: existingTemplate, error: templateError } = await supabaseAdmin
        .from('course_templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) {
        console.error('Error fetching template:', templateError);
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      
      template = existingTemplate;
    }

    // 3. Create the course instance with instance-specific data
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('course_instances')
      .insert([{
        template_id: templateId,
        title: body.title || template?.categorie || '',
        current_participants: 0,
        max_participants: body.max_participants || null,
        start_date: body.start_date,
        end_date: body.end_date,
        status: 'scheduled',
        is_published: body.is_published !== undefined ? body.is_published : false,
        // Store instance-specific customizations
        rich_description: body.rich_description || null,
        price: body.price || null, // Använd price direkt
        image_url: body.image_url || null // Säkerställ att image_url sparas
      }])
      .select()
      .single();

    if (instanceError) {
      console.error('Error creating course instance:', instanceError);
      return NextResponse.json({ error: instanceError.message }, { status: 500 });
    }

    console.log('Created instance:', instance);

    // Map the database fields to client format
    const processedCourse = {
      ...instance,
      price: instance.price || template.price, // Fix: Use price directly, not amount
      image_url: instance.image_url || template.image_url, // Fix: Inkludera image_url
      template: {
        id: template.id,
        title: template.categorie || '',
        rich_description: template.rich_description || '',
        is_published: template.published || false,
        category: null, // For backward compatibility
        image_url: template.image_url || null // Inkludera template image_url
      },
      availableSpots: instance.max_participants - instance.current_participants
    };

    console.log('Final processed course:', processedCourse);
    console.log('Course image URL:', processedCourse.image_url);

    return NextResponse.json({ course: processedCourse });
  } catch (error) {
    console.error('Error in courses API:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
} 