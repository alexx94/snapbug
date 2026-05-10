update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'application/json']::text[]
where id = 'report-artifacts';
