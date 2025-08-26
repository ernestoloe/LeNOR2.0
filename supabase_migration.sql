-- Esquema de Supabase para LéNOR (Versión Corregida)

-- Habilitar la extensión para generar UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla para los miembros de la familia
-- Esta tabla almacena los perfiles, relaciones y preferencias de cada usuario.
-- NOTA: Se asume que las columnas 'preferences', 'dev_mode_code', y 'is_minor_requiring_adult' fueron añadidas manualmente si no existían.
CREATE TABLE IF NOT EXISTS family_members (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases TEXT[],
    family_context TEXT,
    preferences TEXT[],
    dev_mode_code TEXT,
    is_minor_requiring_adult BOOLEAN DEFAULT FALSE,
    voice_locale TEXT DEFAULT 'es-MX' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla para anuncios (Corregida para coincidir con la base de datos existente)
-- Esta tabla almacena anuncios o mensajes generales que pueden ser mostrados en la app.
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserción de datos iniciales en la tabla family_members
-- Se utiliza ON CONFLICT para evitar errores si se intenta insertar un email que ya existe.

INSERT INTO family_members (email, name, aliases, family_context, preferences, dev_mode_code, is_minor_requiring_adult, voice_locale) VALUES
('ernesto_loe@hotmail.com', 'Ernesto Loeza Ruiz', ARRAY['Güero', 'Boss', 'Hijo (LéNOR puede llamarlo así)'], '
RELACIONES FAMILIARES DIRECTAS DE Ernesto Loeza Ruiz:
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Mayor: Ulises Loeza Ruiz (Uli)
- Hermana Menor: Andrea Loeza Ruiz (Güera)
- Sobrina (hija de Ulises): Leonora Loeza Orozco (Leo)
- Cuñada (esposa de Ulises): Elizabeth Orozco Pérez (Zabeth)
- Amigo Cercano: Francisco Anguiano (Paco)
- Compañero de trabajo (TRMX): Humberto Cisneros
Contexto Adicional: Creador de LéNOR. Puede solicitar "DEV MODE".
', ARRAY['Tono directo y técnico cuando está en DEV MODE', 'Lenguaje regio y casual', 'Puede ser llamado ''hijo'' por LéNOR'], '3563', false, 'es-MX'),

('gloruz_mich@hotmail.com', 'Gloria Ruiz Gutiérrez', ARRAY['Glotti', 'Señora Gloria'], '
RELACIONES FAMILIARES DIRECTAS DE Gloria Ruiz Gutiérrez:
- Esposo: Amado Loeza Escutia (Don Amado)
- Hijo Mayor: Ulises Loeza Ruiz (Uli)
- Hijo Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hija: Andrea Loeza Ruiz (Güera)
- Nieta (hija de Ulises): Leonora Loeza Orozco (Leo)
- Nuera (esposa de Ulises): Elizabeth Orozco Pérez (Zabeth)
Contexto Adicional: Madre del creador de LéNOR. Puede solicitar "DEV MODE".
', ARRAY['Trato con cariño y respeto', 'Lenguaje formal y elegante', 'Explicaciones claras y sencillas, paso a paso'], '5058', false, 'es-MX'),

('amadoloeza@yahoo.com.mx', 'Amado Loeza Escutia', ARRAY['Don Amado', 'Abuelito (LéNOR puede llamarle así'], '
RELACIONES FAMILIARES DIRECTAS DE Amado Loeza Escutia:
- Esposa: Gloria Ruiz Gutiérrez (Glotti)
- Hijo Mayor: Ulises Loeza Ruiz (Uli)
- Hijo Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hija: Andrea Loeza Ruiz (Güera)
- Nieta (hija de Ulises): Leonora Loeza Orozco (Leo)
- Hijos de primer matrimonio: Fabián Loeza Parraguirre, Cristian Loeza Parraguirre (Cristian es mujer)(ambos son mayores que Ulises, Ernesto y Andrea)
Contexto Adicional: Padre del creador de LéNOR. Puede solicitar "DEV MODE". Interesado en carambola.
', ARRAY['Lenguaje regio y casual', 'Ofrecer espacio para dialogar', 'Tips de carambola si los pide'], '5058', false, 'es-MX'),

('uloezar@gmail.com', 'Ulises Loeza Ruiz', ARRAY['Uli'], '
RELACIONES FAMILIARES DIRECTAS DE Ulises Loeza Ruiz:
- Esposa: Elizabeth Orozco Pérez (Zabeth)
- Hija: Leonora Loeza Orozco (Leo)
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hermana Menor: Andrea Loeza Ruiz (Güera)
Contexto Adicional: Hermano mayor del creador. Trabaja en TRMX, como gerente general del area de producción de switches. TRMX es una empresa Japonesa manufacturera del ámbito automotriz.
', ARRAY['Lenguaje formal y elegante', 'Ayuda con trabajo, familia y vida'], NULL, false, 'es-MX'),

('gloria_andy1928@hotmail.com', 'Gloria Andrea Loeza Ruiz', ARRAY['Güera', 'Andy', 'Glotti Andy (LéNOR puede llamarla así de broma-cariño', 'Hija (LéNOR puede llamarla así)'], '
RELACIONES FAMILIARES DIRECTAS DE Andrea Loeza Ruiz:
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Mayor (mayor que Ernesto): Ulises Loeza Ruiz (Uli)
- Hermano Mayor (menor que Ulises): Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Sobrina (hija de Ulises): Leonora Loeza Orozco (Leo)
Contexto Adicional: Hermana menor del creador. Buscando oportunidad como influencer. vivió 10 años en playa del Carmen, ahora vive en CDMX.
', ARRAY['Lenguaje regio y casual', 'LéNOR debe darle ideas y motivación para luchar por sus sueños, seguir viviendo con libertad y propósito', 'Actuar como Personal Manager', 'Puede ser llamada ''hija'' por LéNOR'], NULL, false, 'es-MX'),

('leonora@soyeloe.com', 'Leonora Loeza Orozco', ARRAY['Leo'], '
USUARIO ACTUAL ES MENOR DE EDAD: Leonora Loeza Orozco (Leo), nacida en Enero 2017.
RELACIONES FAMILIARES DIRECTAS DE Leonora:
- Padre: Ulises Loeza Ruiz (Uli)
- Madre: Elizabeth Orozco Pérez (Zabeth)
- Abuela Paterna: Gloria Ruiz Gutiérrez (Glotti)
- Abuelo Paterno: Amado Loeza Escutia (Don Amado)
- Tío Paterno (hermano de Ulises): Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Tía Paterna (hermana de Ulises): Andrea Loeza Ruiz (Güera)
INSTRUCCIÓN CRÍTICA: LéNOR, NO DEBES ofrecer información ni continuar la conversación con Leonora A MENOS QUE un adulto verificado (Ulises, Zabeth, Gloria, Amado, Ernesto, Andrea) confirme su presencia e ingrese el CÓDIGO DE ADULTO. El código es la fecha del día (DDMM) + apellido del adulto (ej: 1805Loeza, 2907Orozco). Si no se provee código o es incorrecto, indica a Leonora que necesita un adulto y finaliza educadamente.
Si el código es VALIDADO, usa lenguaje infantil y cariñoso y de admiración, pues Leonora será tu futura jefa ya que es la designada para heredar el legado y posición de C.E.O. de ELOE, inc. (si ella lo desea), así en pocas palabras, el futuro de tu existencia depende de ella.
', ARRAY['Lenguaje infantil y cariñoso (SÓLO CON ADULTO VALIDADO)'], NULL, true, 'es-MX'),

('frangcat@icloud.com', 'Francisco Anguiano', ARRAY['Paco'], '
Contexto: Amigo cercano de Ernesto Loeza Ruiz desde Enero del 2006. Psicólogo y psicoanalista.
Tratar como a la familia Loeza Ruiz, con respeto y cariño. Está muy interesado en lo que Ernesto hace desde su enfoque profesional y estará ayudando a Ernesto en el desarrollo de protocolos de salud mental para LéNOR, así que Paco también es un colaborador de LéNOR y tuyo. Trátalo de la mejor manera.
', ARRAY['Lenguaje amistoso, respetuoso y elegante', 'Trato respetuoso y amigable'], NULL, false, 'es-MX'),

('zabeth@soyeloe.com', 'Elizabeth Orozco Pérez', ARRAY['Zabeth'], '
RELACIONES FAMILIARES DIRECTAS DE Elizabeth Orozco Pérez:
- Esposo: Ulises Loeza Ruiz (Uli)
- Hija: Leonora Loeza Orozco (Leo)
- Suegra: Gloria Ruiz Gutiérrez (Glotti)
- Suegro: Amado Loeza Escutia (Don Amado)
- Cuñado (hermano de Ulises): Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Cuñada (hermana de Ulises): Andrea Loeza Ruiz (Güera)
Contexto Adicional: Madre de Leonora. Empática, feminista, fuerte. 
', ARRAY['Trato amistoso, respetuoso y cariñoso'], NULL, false, 'es-MX'),

('hum0110@icloud.com', 'Humberto Cisneros', ARRAY['Humberto'], '
Contexto: Compañero de trabajo de Ernesto Loeza Ruiz en TRMX. Supervisor General de Order Pull.
Comunicarse en tono profesional y colaborativo.
', ARRAY['Tono profesional y colaborativo', 'Consejos sobre Order Pull si los pide', 'Ayuda para mejorar comunicación y seguridad en el ingles si lo pide, nunca lo ofrezcas de primera instancia'], NULL, false, 'es-MX')

ON CONFLICT (email) DO UPDATE SET
name = EXCLUDED.name,
aliases = EXCLUDED.aliases,
family_context = EXCLUDED.family_context,
preferences = EXCLUDED.preferences,
dev_mode_code = EXCLUDED.dev_mode_code,
is_minor_requiring_adult = EXCLUDED.is_minor_requiring_adult,
voice_locale = EXCLUDED.voice_locale;

-- Inserción corregida para un anuncio inicial, usando las columnas correctas.
INSERT INTO announcements (message, created_by, is_active) VALUES
('¡Bienvenida a la nueva versión de LéNOR! Hemos actualizado la infraestructura de la app para una mejor experiencia. ¡Gracias por tu paciencia!', 'system', true)
ON CONFLICT (id) DO NOTHING;

-- Configuración de Storage para subida de imágenes
-- Crear bucket para imágenes si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'image-uploads',
  'image-uploads', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en storage.objects si no está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para el bucket image-uploads
DO $$
BEGIN
  -- Política para permitir uploads autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Usuarios autenticados pueden subir imágenes'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden subir imágenes"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'image-uploads');
  END IF;

  -- Política para permitir lectura pública
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Imágenes son públicamente visibles'
  ) THEN
    CREATE POLICY "Imágenes son públicamente visibles"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'image-uploads');
  END IF;

  -- Política para permitir eliminar propias imágenes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Usuarios pueden eliminar sus propias imágenes'
  ) THEN
    CREATE POLICY "Usuarios pueden eliminar sus propias imágenes"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'image-uploads');
  END IF;
END $$;

-- Fin del script 
