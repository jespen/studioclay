-- Skapa kurser direkt med SQL
-- Eva Björks ID: d34b1b44-9e49-4b7a-a038-84580f8ab9f0

INSERT INTO courses (
  title, description, start_date, end_date, 
  duration_minutes, price, currency, 
  max_participants, current_participants, location, 
  image_url, category_id, instructor_id, is_published
) VALUES (
  'Prova på drejning', 
  'En introduktion till drejning för nybörjare',
  '2024-08-15T18:00:00+02:00',
  '2024-08-15T20:00:00+02:00',
  120, 495, 'SEK', 8, 0,
  'Studio Clay, Stockholm',
  'https://studioclay.se/images/courses/drejning.jpg',
  '1b8e0196-c6f8-4717-97b8-64794687a76f',
  'd34b1b44-9e49-4b7a-a038-84580f8ab9f0',
  true
);

INSERT INTO courses (
  title, description, start_date, end_date, 
  duration_minutes, price, currency, 
  max_participants, current_participants, location, 
  image_url, category_id, instructor_id, is_published
) VALUES (
  'Helgkurs i keramik', 
  'Intensiv helgkurs för att lära dig grunderna i keramik',
  '2024-08-24T10:00:00+02:00',
  '2024-08-25T16:00:00+02:00',
  960, 2495, 'SEK', 10, 0,
  'Studio Clay, Stockholm',
  'https://studioclay.se/images/courses/helgkurs.jpg',
  '85f1aeea-77ff-42af-92d2-31a8cb9b8d7d',
  'd34b1b44-9e49-4b7a-a038-84580f8ab9f0',
  true
);

-- Verifiera att kurserna har skapats
SELECT c.*, cat.name as category_name, i.name as instructor_name 
FROM courses c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN instructors i ON c.instructor_id = i.id; 