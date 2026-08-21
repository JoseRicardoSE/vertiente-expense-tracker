CREATE POLICY "boletas_files_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'boletas');
CREATE POLICY "boletas_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'boletas' AND owner = auth.uid());
CREATE POLICY "boletas_files_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'boletas' AND owner = auth.uid());