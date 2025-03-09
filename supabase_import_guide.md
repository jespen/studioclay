# Guide för att importera data till Supabase

Följ dessa steg för att importera CSV-filerna till din Supabase-databas.

## 1. Kör SQL-skript

Först, kör SQL-skriptet som skapar alla tabeller. Gå till SQL Editor i Supabase-dashboarden och klistra in det fullständiga SQL-skriptet.

## 2. Importera kategorier

1. Gå till **Table Editor** i Supabase-dashboarden
2. Välj tabellen **categories**
3. Klicka på **Import data**
4. Välj **CSV** som format
5. Ladda upp filen `categories.csv`
6. Mappa kolumnerna:
   - `name` → `name`
   - `description` → `description`
7. Klicka på **Import**

## 3. Importera instruktörer

1. Gå till **Table Editor**
2. Välj tabellen **instructors**
3. Klicka på **Import data**
4. Välj **CSV** som format
5. Ladda upp filen `instructors.csv`
6. Mappa kolumnerna:
   - `name` → `name`
   - `email` → `email`
   - `bio` → `bio`
   - `photo_url` → `photo_url`
7. Klicka på **Import**

## 4. Hitta instruktörens ID

Innan du importerar kurser behöver du hitta ID för Eva Björk:

1. Gå till **Table Editor**
2. Välj tabellen **instructors**
3. Hitta raden för "Eva Björk"
4. Kopiera UUID-värdet från `id`-kolumnen
5. Ersätt "REPLACE_WITH_EVA_INSTRUCTOR_ID" i courses.csv med detta UUID

## 5. Importera kurser

Nu när vi använder direkta ID:n i CSV-filen blir importen enklare:

1. Gå till **Table Editor**
2. Välj tabellen **courses**
3. Klicka på **Import data**
4. Välj **CSV** som format
5. Ladda upp filen `courses.csv`
6. Mappa kolumnerna till motsvarande fält:

| CSV-kolumn           | Supabase-kolumn        |
|----------------------|------------------------|
| title                | title                  |
| description          | description            |
| start_date           | start_date             |
| end_date             | end_date               |
| duration_minutes     | duration_minutes       |
| price                | price                  |
| currency             | currency               |
| max_participants     | max_participants       |
| current_participants | current_participants   |
| location             | location               |
| image_url            | image_url              |
| category_id          | category_id            |
| instructor_id        | instructor_id          |
| is_published         | is_published           |

7. Klicka på **Import**

## 6. Verifiera importen

Efter import, kontrollera att all data finns i tabellerna genom att köra dessa SQL-frågor:

```sql
SELECT * FROM categories;
SELECT * FROM instructors;
SELECT c.*, cat.name as category_name, i.name as instructor_name 
FROM courses c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN instructors i ON c.instructor_id = i.id;
```

## Om du får problem vid import

Om du stöter på problem vid import av kurser, försök med dessa lösningar:

1. **Kontrollera att kategorier och instruktörer är importerade först** - Kursimporten är beroende av att dessa tabeller redan innehåller data.

2. **Kontrollera att ID:n är korrekta** - Verifiera att UUID:n för kategori och instruktör är korrekta och finns i respektive tabell.

3. **Inaktivera RLS tillfälligt** - Om du fortsätter få problem, inaktivera tillfälligt Row Level Security:

```sql
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
-- Importera data
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
```

## Alternativ metod: Använd SQL för att skapa kurser

Om CSV-importen fortsätter att orsaka problem, kan du använda SQL för att skapa kurserna direkt:

```sql
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
  -- Ersätt med Eva Björks ID:
  'REPLACE_WITH_EVA_INSTRUCTOR_ID',
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
  -- Ersätt med Eva Björks ID:
  'REPLACE_WITH_EVA_INSTRUCTOR_ID',
  true
);
```

## Viktigt om Row Level Security (RLS)

Tänk på att du kan behöva inaktivera RLS tillfälligt för att importera data, eller använda Supabase API med admin-rättigheter. 